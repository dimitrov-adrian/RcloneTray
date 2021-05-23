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

export default ref;

export class Ref {
    constructor() {
        this.id = Symbol();
        Object.freeze(this);
    }

    /**
     * @param {*} value
     */
    set value(value) {
        store.set(this.id, value);
    }

    /**
     * @returns {*}
     */
    get value() {
        return store.get(this.id);
    }

    /**
     * @returns {boolean}
     */
    unref() {
        return store.delete(this.id);
    }
}
