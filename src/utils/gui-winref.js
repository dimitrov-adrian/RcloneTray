import process from 'node:process';
import gui from 'gui';

/**
 * @type {Map<string|Symbol, gui.Window>}
 */
const store = new Map();

/**
 * @type {Map<string|Symbol, gui.RectF>}
 */
const appPositionsRegistry = new Map();

/**
 * @param {string|symbol=} staticId
 * @returns {WinRef}
 */
export function winRef(staticId) {
	return new WinRef(staticId);
}

export function closeAll() {
	for (const win of store.values()) {
		win.close();
	}
}

/**
 * @returns {gui.Window?}
 */
export function findActive() {
	for (const win of store.values()) {
		if (win.isActive()) {
			return win;
		}
	}
}

export function closeActive() {
	const active = findActive();
	if (active) {
		active.close();
	}
}

export class WinRef {
	/**
	 * @param {string|Symbol} staticId
	 */
	constructor(staticId) {
		this.id = staticId || Symbol('GUI Windows');
		Object.freeze(this);
		if (process.platform === 'darwin' && gui.app.getActivationPolicy() !== 'regular') {
			gui.app.setActivationPolicy('regular');
		}

		if (store.has(this.id)) {
			store.get(this.id).activate();
		}
	}

	/**
	 * @returns {gui.Window}
	 * @type {gui.Window}
	 */
	get value() {
		return store.get(this.id);
	}

	/**
	 * @param {gui.Window} value
	 * @returns {gui.Window}
	 */
	set value(value) {
		store.set(this.id, value);
		value.onClose = this.unref.bind(this);
	}

	restorePosition() {
		if (typeof this.id !== 'symbol' && 'setBounds' in this.value) {
			const pos = appPositionsRegistry.get(this.id);
			if (pos) {
				this.value.setBounds({
					...pos,
				});
			} else {
				this.value.center();
			}
		}
	}

	/**
	 * @returns {boolean}
	 */
	unref() {
		if (typeof this.id !== 'symbol' && this.value && 'getBounds' in this.value) {
			appPositionsRegistry.set(this.id, this.value.getBounds());
		}

		const result = store.delete(this.id);
		if (store.size === 0 && process.platform === 'darwin') {
			gui.app.setActivationPolicy('accessory');
		}

		return result;
	}
}
