import * as rclone from './services/rclone.js';

export async function appQuit() {
    // @TODO close all rclone connections
    // @TODO unmount all
    // @TODO close windows
    // @TODO delete temporary directories
    try {
        console.log('Exitint 1');
        console.log('Exitint 2');
        rclone.connectionState.proc.kill(1);
        process.exit(0);
    } catch (error) {
        console.warn('Exit with errors.', error.toString());
        process.exit(1);
    }
}
