import fs from 'fs'
import requestLib from 'request-promise-native'
import dayjs from 'dayjs'

const MAX_SOCKETS_COUNT = 100
const API_REQUEST_TIMEOUT_MS = 10000

class EventTransport {
    constructor(options) {
        this._options = options
        this._request = requestLib.defaults({ maxSockets: MAX_SOCKETS_COUNT })
    }

    prepareEvent(event) {
        return {
            timestamp: event.timestamp,
            tags: event.tags,
            fields: event.fields ? { uuid: event.uuid, ...event.fields } : { uuid: event.uuid }
        }
    }

    send(event) {
        return new Promise((resolve, reject) => {
            if (this._options.debug) {
                console.log(`[${dayjs().toISOString()}] [DEBUG TRANSPORT] Sent ${JSON.stringify(event)}`)
                fs.writeFileSync('debug-event.json', JSON.stringify(event))
                resolve()
                return
            }

            const options = {
                timeout: API_REQUEST_TIMEOUT_MS,
                uri: `${this._options.apiUrl}/api/event/${this._options.appName}`,
                method: 'POST',
                headers: {
                    'api-key': this._options.apiKey
                },
                json: this.prepareEvent(event),
                resolveWithFullResponse: true,
                simple: false
            }

            this._request(options).
                then(resp => {
                    if (resp.statusCode === 200) {
                        resolve()
                        return
                    }

                    reject(`received ${resp.statusCode} code`)
                })
                .catch(err => reject(err))
        })
    }
}

export default EventTransport