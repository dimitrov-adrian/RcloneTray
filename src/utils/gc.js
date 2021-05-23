// @ts-nocheck
import gui from 'gui';

// API to hint garbage collection.
let gcTimer = null;
process.gc = (immediate = false, level = 1) => {
    if (gcTimer) clearTimeout(gcTimer);
    if (!immediate) {
        // gc after action can cause lagging.
        gcTimer = setTimeout(process.gc.bind(null, true, level), 5 * 1000);
        return;
    }
    gui.memoryPressureNotification(level);
};
