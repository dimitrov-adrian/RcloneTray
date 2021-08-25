/**
 * @type {Map<string|Symbol, any>}
 */
const store = new Map();

/**
 * @param {(item: any) => void} callbackfn
 */
export function forEach(callbackfn) {
    return store.forEach(callbackfn);
}

/**
 *
 * @returns {Ref}
 */
export function ref() {
    return new Ref();
}

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
