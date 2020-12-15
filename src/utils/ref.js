const store = new Map()

export class Ref {
    constructor() {
        this.$index = Symbol()
        Object.freeze(this)
    }
    set value(value) {
        store.set(this.$index, value)
        return value
    }
    get value() {
        return store.get(this.$index)
    }
    unref() {
        return store.delete(this.$index)
    }
}

/**
 *
 * @param {any} initialValue
 * @returns {
 *  value: initialValue,
 *  unref,
 * }
 */
export default function ref() {
    return new Ref()
}
