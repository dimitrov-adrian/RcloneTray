/**
 * @file https://github.com/yue/wey/blob/master/lib/util/gc.js
 * @author: zcbenz
 */

// @ts-nocheck
import process from 'node:process';
import gui from 'gui';

let gcInterval = null;

export function runGC() {
	if (gcInterval) {
		return;
	}

	let gcTimer = null;
	process.gc = function (immediate = false, level = 1) {
		if (gcTimer) {
			clearTimeout(gcTimer);
		}

		if (!immediate) {
			// Run gc after action can cause lagging.
			gcTimer = setTimeout(process.gc.bind(null, true, level), 5 * 1000);
			return;
		}

		gui.memoryPressureNotification(level);
	};

	// Run gc every 5 minutes.
	gcInterval = setInterval(process.gc.bind(null), 5 * 60 * 1000);
}
