import gui from 'gui'
const store = new Map()

export class WinRef {
    /**
     * @param {String|Symbol|Number|undefined} staticId
     */
    constructor(staticId) {
        this.$index = staticId || Symbol()
        Object.freeze(this)
        if (process.platform === 'darwin') {
            gui.app.setActivationPolicy('regular')
            gui.app.activate(true)
        }
    }
    /**
     * @param {gui.Window}
     * @returns {gui.Window}
     * @type {gui.Window}
     */
    set value(value) {
        store.set(this.$index, value)
        return value
    }
    /**
     * @returns {gui.Window}
     * @type {gui.Window}
     */
    get value() {
        return store.get(this.$index)
    }
    unref() {
        const result = store.delete(this.$index)
        if (store.size < 1) {
            if (process.platform === 'darwin') {
                gui.app.setActivationPolicy('accessory')
                gui.app.activate(false)
            }
        }
        return result
    }
}

/**
 *
 * @param {*} initialValue
 * @param {String} initialValue
 * @returns {{ value: gui.Window, unref: CallableFunction }}
 */
export default function winRef(staticId) {
    return new WinRef(staticId)
}
