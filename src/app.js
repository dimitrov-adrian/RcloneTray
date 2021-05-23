import gui from 'gui';
import './utils/gc.js';
import packageJson from './utils/package-json.js';
import notify from './utils/gui-notification.js';
import * as rclone from './services/rclone.js';
import singleInstanceLock from './utils/single-instance.js';
import config from './services/config.js';
import { promptError, promptErrorReporting } from './utils/prompt.js';
import { createTrayMenu, updateMenu } from './tray-menu.js';
import appMenu from './app-menu.js';
import notification from './utils/gui-notification.js';

export default async function app() {
    process.setUncaughtExceptionCaptureCallback((error) => {
        console.log('[UNEXPECTED_ERROR]', error);
        promptErrorReporting({ title: 'Unexpected error', message: error });
    });

    try {
        await singleInstanceLock(packageJson.build.appId);
    } catch (error) {
        if (error.toString() === 'ALREADY_RUNNING') {
            promptError(
                {
                    title: packageJson.name,
                    message: 'There is already running instance of RcloneTray, cannot start twice.',
                },
                () => process.exit(1)
            );
        } else {
            promptErrorReporting({ title: 'Unexpected error', message: error }, () => process.exit(1));
        }
        return;
    }

    if (process.platform === 'darwin') {
        gui.app.setApplicationMenu(appMenu);
        gui.app.setActivationPolicy('accessory');
    }

    rclone.on('invalid-password', async () => {
        promptError(
            {
                title: 'Invalid Rclone password',
                message: 'Current configuration is encrypted and requires valid password.',
            },
            () => {
                process.exit(1);
            }
        );
    });

    config.onDidChange('rclone_options', rclone.setOptions);

    config.onDidAnyChange(() => updateMenu());
    rclone.on('connected', () => {
        updateMenu();
        // notification('Rclone connecting');
    });
    rclone.on('disconnected', () => {
        updateMenu();
        // notification('Rclone daemon exited');
        setTimeout(() => {
            rclone.startRcloneDaemon();
        }, 5000);
    });
    rclone.on('config', () => updateMenu());
    rclone.on('bookmark:created', () => updateMenu());
    rclone.on('bookmark:deleted', () => updateMenu());
    rclone.on('bookmark:updated', () => updateMenu());
    rclone.on('bookmark:mounted', (bookmarkName) => {
        updateMenu();
        notification(`Mounted ${bookmarkName}`);
    });
    rclone.on('bookmark:unmounted', (bookmarkName) => {
        updateMenu();
        notification(`Unmounted ${bookmarkName}`);
    });
    rclone.on('unmountall', () => updateMenu());

    rclone.on('error', (error) => {
        const message = error.error.toString() + (error.reason ? '\n' + error.reason.toString() : '');
        notify(message);
        console.log('!!!RCLONE_ERROR!!!', message);
    });

    rclone.on('connected', async () => {
        console.log('Mounting automounted');
        try {
            const bookmarks = await rclone.getBookmarks();
            for (const bookmark of Object.entries(bookmarks)) {
                if (bookmark[1].rclonetray_automount === true || bookmark[1].rclonetray_automount === 'true') {
                    console.log('Automount', bookmark[0]);
                }
            }
        } catch (error) {
            console.warn('Cannot fetch bookmarks upon start.', error.toString());
        }
    });

    try {
        await rclone.startRcloneDaemon();
    } catch (error) {
        console.error(error);
        promptError(
            {
                title: 'Connecting Rclone daemon',
                message: error ? error : 'Unexpected error',
            },
            () => {
                process.exit(1);
            }
        );
    }

    createTrayMenu();

    // Run gc every 5 minutes.
    // @ts-ignore
    setInterval(process.gc.bind(null), 5 * 60 * 1000);
}
