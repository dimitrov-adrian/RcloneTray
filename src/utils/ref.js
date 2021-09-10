/**
 * @type {Map<string|Symbol, any>}
 */
const store = new Map();

/**
 *
 * @returns {Ref}
 */
export function ref() {
    return new Ref();
}

class Ref {
    constructor() {
        this.id = Symbol('Generic references store');
        Object.freeze(this);
    }

    /**
     * @returns {*}
     */
    get value() {
        return store.get(this.id);
    }

    /**
     * @param {*} value
     */
    set value(value) {
        store.set(this.id, value);
    }

    /**
     * @returns {boolean}
     */
    unref() {
        return store.delete(this.id);
    }
}
