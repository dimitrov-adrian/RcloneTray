import process from 'node:process';
import EventEmitter from 'node:events';
import gui from 'gui';
import { runGC } from './utils/gc.js';
import { packageJson } from './utils/package.js';
import { sendNotification } from './utils/gui-notification.js';
import * as rclone from './services/rclone.js';
import { singleInstanceLock } from './utils/single-instance.js';
import { config } from './services/config.js';
import { promptError, promptErrorReporting } from './utils/prompt.js';
import { createTrayMenu, updateMenu } from './tray-menu.js';
import { appMenu } from './app-menu.js';
import logger from './services/logger.js';

export const pubsub = new EventEmitter({ captureRejections: true });

export async function app() {
    process.setUncaughtExceptionCaptureCallback((error) => {
        logger.error('[UNEXPECTED_ERROR]', error);
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
                    message: `There is already running instance of ${packageJson.productName}, cannot start twice.`,
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

    rclone.emitter.on('error', (error) => {
        const message = error.error.toString() + (error.reason ? '\n' + error.reason.toString() : '');
        sendNotification(message);
        logger.log('!!!RCLONE_ERROR!!!', message);
    });

    rclone.emitter.on('config', updateMenu);
    rclone.emitter.on('activity', updateMenu);

    rclone.emitter.on('ready', async () => {
        await rclone.setOptions({
            vfs: {
                Timeout: 10,
                DirCacheTime: 3,
                ReadOnly: true,
                CachePollInterval: 10_000,
                PollInterval: 10_000,
            },
            mount: {
                NoAppleDouble: true,
                NoAppleXattr: true,
                AllowNonEmpty: false,
                Daemon: false,
                DebugFUSE: false,
            },
            ...config.get('rclone_options'),
        });
    });

    rclone.emitter.on('ready', () => {
        updateMenu();
        if (process.platform === 'darwin') {
            gui.app.setApplicationMenu(appMenu);
            gui.app.setActivationPolicy('accessory');
        }
    });

    rclone.emitter.on('ready', async () => {
        try {
            const bookmarks = await rclone.getBookmarks();
            for (const [bookmarkName, bookmarkConfig] of Object.entries(bookmarks)) {
                if (bookmarkConfig[rclone.RCLONETRAY_CONFIG.CUSTOM_KEYS.autoMount] === 'true') {
                    console.log('@TODO', 'Automount', bookmarkName);
                    // @TODO rclone.mount(bookmarkName, bookmarkConfig);
                }

                if (
                    bookmarkConfig[rclone.RCLONETRAY_CONFIG.CUSTOM_KEYS.pullOnStart] !== 'true' &&
                    bookmarkConfig[rclone.RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory]
                ) {
                    console.log('@TODO', 'Pull', bookmarkName);
                    // @TODO  rclone.pull(bookmarkName, bookmarkConfig);
                }
            }
        } catch (error) {
            logger.warn('Cannot fetch bookmarks upon start.', error.toString());
        }
    });

    // rclone.on('invalid-password', async () => {
    //     promptError(
    //         {
    //             title: 'Invalid Rclone password',
    //             message: 'Current configuration is encrypted and requires valid password.',
    //         },
    //         () => process.exit(1)
    //     );
    // });

    rclone.setupDaemon();

    runGC();
}
