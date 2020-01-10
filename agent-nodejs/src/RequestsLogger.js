import { getUuid } from './UuidGenerator'
import os from 'os'
import dayjs from 'dayjs'
import process from 'process'
import EventRepository from './EventRepository'
import EventSenderTask from './EventSenderTask'
import EventTransport from './EventTransport'

const NS_PER_SEC = 1e9
const NS_TO_MS = 1e6

class RequestLogger {
  constructor(options = {}) {
    this._options = {
      debug: process.env.SLAO_DEBUG === 'true' || options.debug === true,
      appName: process.env.SLAO_APP_NAME || options.appName || process.env.npm_package_name,
      appVersion: process.env.SLAO_APP_VERSION || options.appVersion || process.env.npm_package_version,
      hostname: process.env.SLAO_HOSTNAME || options.hostname || os.hostname(),
      apiUrl: process.env.SLAO_API_URL || options.apiUrl || 'https://api.slao.io',
      apiKey: process.env.SLAO_API_KEY || options.apiKey,
      initialized: false
    }

    if (!this._options.appName) {
      console.warn(`[${dayjs().toISOString()}] SLAO app name must be specified`)
      return
    }

    if (!/^[a-z0-9-\-]{2,}$/.test(this._options.appName)) {
      console.warn(`[${dayjs().toISOString()}] SLAO app name must match "^[a-z0-9-\-]{2,}$" regex pattern`)
      return
    }

    if (!this._options.apiKey) {
      console.warn(`[${dayjs().toISOString()}] SLAO api key must be specified`)
      return
    }

    this._eventRepository = new EventRepository(this._options)
    this._transport = new EventTransport(this._options)
    this._eventSenderTask = new EventSenderTask(this._options, this._eventRepository, this._transport)
    this._eventSenderTask.start()


    if (this._options.debug) {
      console.log(`[${dayjs().toISOString()}] SLAO Service initialized [${JSON.stringify(this._options)}]`)
    }

    this._options.initialized = true
  }

  getRoute(req) {
    const route = req.route ? req.route.path : ''
    const baseUrl = req.baseUrl ? req.baseUrl : ''

    return route ? `${baseUrl === '/' ? '' : baseUrl}${route}` : 'unknown route'
  }

  logRequests() {
    const _instance = this

    if (!this._options.initialized) {
      return (req, res, next) => {
        res.slao = {
          uuid: null,
          setTags: () => { },
          setFields: () => { }
        }
        next()
      }
    }

    return (req, res, next) => {
      const uuid = getUuid()
      res.slao = {
        uuid,
        setTags: (tags) => _instance._eventRepository.logTags(uuid, tags),
        setFields: (fields) => _instance._eventRepository.logFields(uuid, fields)
      }

      _instance._eventRepository.logTimestamp(uuid, dayjs().valueOf())
      _instance._eventRepository.logTags(uuid, {
        hostname: _instance._options.hostname,
        method: `${req.method} ${this.getRoute(req)}`
      })

      const time = process.hrtime()

      res.on('close', () => {
        const diff = process.hrtime(time)
        const ms = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS

        _instance._eventRepository.logFields(uuid, { durationMs: ms })
        _instance._eventRepository.logTags(uuid, {
          method: `${req.method} ${this.getRoute(req)}`,
          finished: res.finished,
          statusCode: res.statusCode
        })
      })

      res.on('finish', () => {
        const diff = process.hrtime(time)
        const ms = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS

        _instance._eventRepository.logFields(uuid, { durationMs: ms })
        _instance._eventRepository.logTags(uuid, {
          method: `${req.method} ${this.getRoute(req)}`,
          finished: res.finished,
          statusCode: res.statusCode
        })
      })

      next()
    }
  }
}

export const init = (options) => new RequestLogger(options).logRequests()