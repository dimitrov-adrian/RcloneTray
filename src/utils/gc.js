// Author: @zcbenz
// Copied from https://github.com/yue/wey/blob/master/lib/util/gc.js
import gui from 'gui';

// API to hint garbage collection.
let gcTimer = null;
// @ts-ignore
process.gc = (immediate = false, level = 1) => {
    if (gcTimer) clearTimeout(gcTimer);
    if (!immediate) {
        // gc after action can cause lagging.
        // @ts-ignore
        gcTimer = setTimeout(process.gc.bind(null, true, level), 5 * 1000);
        return;
    }
    // @ts-ignore
    gui.memoryPressureNotification(level);
};

// Run gc every 5 minutes.
// @ts-ignore
setInterval(process.gc.bind(null), 5 * 60 * 1000);
