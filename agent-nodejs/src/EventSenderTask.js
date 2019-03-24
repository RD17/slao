import dayjs from 'dayjs'

const EVENT_TTL_SECONDS = 60 * 60
const EVENT_SEND_FREQUENCY_MS = 2000
const EVENT_MAX_SEND_ATTEMPTS = 100

class EventSenderTask {
    constructor(options, eventRepository, transport) {
        this._options = options
        this._eventRepository = eventRepository
        this._transport = transport
        this._sendEventsRunning = false
    }

    start() {
        const intervalId = setInterval(() => {
            if (!this._sendEventsRunning) {
                this._sendEvents()
            }
        }, EVENT_SEND_FREQUENCY_MS)

        process.on('exit', () => {
            clearInterval(intervalId)
        })
    }

    _sendEvents() {
        const _instance = this

        _instance._sendEventsRunning = true

        const events = _instance._eventRepository.getEvents()

        if (events.length === 0) {
            _instance._sendEventsRunning = false
            return
        }

        Promise.all(events.map(event =>
            new Promise(resolve => {
                if (!_instance._shouldSend(event)) {
                    resolve()
                    return
                }

                if (event.failedSendAttemptsCount && event.failedSendAttemptsCount >= EVENT_MAX_SEND_ATTEMPTS) {
                    _instance._eventRepository.removeEvent(event.uuid)
                    console.error(`[${dayjs().toISOString()}] [${event.uuid}] [transport] [drop] dropped event after ${event.failedSendAttemptsCount} failed send attempts`)
                    resolve()
                    return
                }

                _instance._transport.send(event)
                    .then(() => {
                        _instance._eventRepository.removeEvent(event.uuid)
                        resolve()
                    })
                    .catch(err => {
                        _instance._eventRepository.logFailedSendAttemptsCount(event.uuid, event.failedSendAttemptsCount ? event.failedSendAttemptsCount + 1 : 1)
                        console.error(`[${dayjs().toISOString()}] [${event.uuid}] [transport] [error] ${JSON.stringify(err)} event ${JSON.stringify(event)}`)
                        resolve()
                    })
            })))
            .then(() => {
                _instance._sendEventsRunning = false
            })
    }

    _shouldSend(event) {
        const dateTimeNow = dayjs()

        if (!event.timestamp) {
            throw new Error('Event w/o timestamp', JSON.stringify(event))
        }

        if (event.tags && event.tags.finished) {
            return true
        }

        if (event.timestamp && dateTimeNow.isAfter(dayjs(event.timestamp).add(EVENT_TTL_SECONDS, 'seconds'))) {
            return true
        }

        return false
    }
}

export default EventSenderTask
