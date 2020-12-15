import { EventEmitter } from 'events'
import { inspect } from 'util'

const isDev = process.env.ENV === 'dev'

export class AppEventEmitter extends EventEmitter {
    emit(signal, ...args) {
        if (isDev) {
            console.groupCollapsed('🔔', signal)
            console.log(inspect(args, false, 3, true))
            console.groupEnd()
        }
        return super.emit(signal, ...args)
    }

    createEmitter(signal, ...data) {
        return (...localData) => this.emit(signal, ...[...data, ...localData])
    }
}

const events = new AppEventEmitter()

export function on(eventName, callback) {
    return events.on(eventName, callback)
}

export function once(eventName, callback) {
    return events.once(eventName, callback)
}

export function emit(eventName, ...args) {
    return events.emit(eventName, ...args)
}

export default events
