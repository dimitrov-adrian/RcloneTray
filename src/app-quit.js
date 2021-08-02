import * as rclone from './services/rclone.js';
import { forEach } from './utils/gui-winref.js';

export async function appQuit() {
    try {
        forEach((win) => win.close());
        await rclone.stopRcloneDaemon();
    } catch (error) {
        console.warn('Exit with errors.', error.toString());
        process.exit(1);
    }
    process.exit(0);
}
