class EventRepository {
    constructor(options) {
        this._eventsByUuid = new Map()
        this._options = options
    }

    _addOrUpdateEventByUuid(uuid, property, value) {
        if (!uuid) {
            throw new Error('uuid is required')
        }

        const event = this._eventsByUuid.get(uuid) || { uuid: uuid }
        const oldValue = event[property]

        if (typeof value === 'object') {
            event[property] = !oldValue ? value : { ...oldValue, ...value }
        } else {
            event[property] = value
        }

        this._eventsByUuid.set(uuid, event)

        if (this._options.debug) {
            console.log(`[${event.uuid}] ${JSON.stringify(event)}`)
        }
    }

    logTags(uuid, tags) {
        this._addOrUpdateEventByUuid(uuid, 'tags', tags)
    }

    logFields(uuid, fields) {
        this._addOrUpdateEventByUuid(uuid, 'fields', fields)
    }

    logTimestamp(uuid, timestamp) {
        this._addOrUpdateEventByUuid(uuid, 'timestamp', timestamp)
    }

    logFailedSendAttemptsCount(uuid, failedSendAttemptsCount) {
        this._addOrUpdateEventByUuid(uuid, 'failedSendAttemptsCount', failedSendAttemptsCount)
    }

    getEvents() {
        return Array.from(this._eventsByUuid.values())
    }

    removeEvent(uuid) {
        this._eventsByUuid.delete(uuid)
    }
}

export default EventRepository
