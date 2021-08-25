import gui from 'gui';
import './utils/gc.js';
import { packageJson } from './utils/package.js';
import { sendNotification } from './utils/gui-notification.js';
import * as rclone from './services/rclone.js';
import { singleInstanceLock } from './utils/single-instance.js';
import { config } from './services/config.js';
import { promptError, promptErrorReporting } from './utils/prompt.js';
import { createTrayMenu, updateMenu } from './tray-menu.js';
import { appMenu } from './app-menu.js';

export async function app() {
    process.setUncaughtExceptionCaptureCallback((error) => {
        console.warn('[UNEXPECTED_ERROR]', error);
        promptErrorReporting({ title: 'Unexpected error', message: error });
    });

    if (process.platform === 'win32' || process.platform === 'linux') {
        gui.app.setID(packageJson.build.appId);
    }
    gui.app.setName(packageJson.build.productName);

    try {
        await singleInstanceLock(gui.app.getID());
    } catch (error) {
        if (error.toString() === 'ALREADY_RUNNING') {
            promptError(
                {
                    title: packageJson.productName,
                    message: 'There is already running instance of RcloneTray, cannot start twice.',
                },
                () => process.exit(1)
            );
            return;
        }

        throw error;
    }

    createTrayMenu();

    config.onDidChange('rclone_options', rclone.setOptions);

    config.onDidAnyChange(() => updateMenu());

    rclone.on('invalid-password', async () => {
        promptError(
            {
                title: 'Invalid Rclone password',
                message: 'Current configuration is encrypted and requires valid password.',
            },
            () => process.exit(1)
        );
    });

    rclone.on('disconnected', () => {
        updateMenu();
        setTimeout(() => {
            rclone.startRcloneDaemon();
        }, 5000);
    });

    rclone.on('connected', () => updateMenu());

    rclone.on('connected', async () => {
        if (!config.get('rclone_options')) return;
        try {
            await rclone.setOptions(config.get('rclone_options'));
        } catch (error) {
            console.warn('Cannot set custom RcloneTray daemon options.');
        }
    });

    rclone.on('connected', async () => {
        try {
            const bookmarks = await rclone.getBookmarks();

            Object.entries(bookmarks).forEach(([, bookmarkConfig]) => {
                if (bookmarkConfig.rclonetray_automount !== 'true') return;
                // rclone.mount(bookmarkName, bookmarkConfig)
            });

            Object.entries(bookmarks).forEach(([, bookmarkConfig]) => {
                if (bookmarkConfig.rclonetray_pullonstart !== 'true') return;
                if (!bookmarkConfig.rclonetray_local_directory) return;
                // rclone.pull(bookmarkName, bookmarkConfig)
            });
        } catch (error) {
            console.warn('Cannot fetch bookmarks upon start.', error.toString());
        }
    });

    // Bookmark created, deleted and updated also triggers config refresh,
    // so no need of separate updateMenu() notify, but in some cases does not.
    rclone.on('config', () => updateMenu());
    rclone.on('bookmark:created', () => updateMenu());
    rclone.on('bookmark:deleted', () => updateMenu());
    rclone.on('bookmark:updated', () => updateMenu());

    rclone.on('bookmark:mounted', (bookmarkName) => {
        updateMenu();
        sendNotification(`Mounted ${bookmarkName}`);
    });

    rclone.on('bookmark:unmounted', (bookmarkName) => {
        updateMenu();
        sendNotification(`Unmounted ${bookmarkName}`);
    });

    rclone.on('bookmark:dlna:start', () => updateMenu());
    rclone.on('bookmark:dlna:stop', () => updateMenu());

    rclone.on('error', (error) => {
        const message = error.error.toString() + (error.reason ? '\n' + error.reason.toString() : '');
        sendNotification(message);
        console.log('!!!RCLONE_ERROR!!!', message);
    });

    try {
        await rclone.startRcloneDaemon();
    } catch (error) {
        console.warn(error);
        promptError(
            {
                title: 'Connecting Rclone daemon',
                message: error ? error : 'Unexpected error',
            },
            () => process.exit(1)
        );
    }

    if (process.platform === 'darwin') {
        gui.app.setApplicationMenu(appMenu);
        gui.app.setActivationPolicy('accessory');
    }
}
