import { execFile, spawn } from 'node:child_process';
import os from 'node:os';
import gui from 'gui';
import getResourcePath from './get-resource-path.js';
import packageJson from './package-json.js';
import which from './which.js';
import { trayIcons } from '../services/images.js';

/**
 * @typedef {(message: string) => void} NotificationFunction
 */

/**
 * @type {string}
 */
const notifiactionIcon = getResourcePath('icons', 'rclone-icon-color-64@2x.png');

/**
 * @type {NotificationFunction}
 */
const notification = detectNotificationFunction();

const customNotificationRegistry = new Map();

/**
 * @type {NotificationFunction}
 */
export default notification;

/**
 * @returns {NotificationFunction}
 */
function detectNotificationFunction() {
    if (process.platform === 'win32') {
        if (parseInt(os.release()) >= 8) return win32Snoretoast;
    }

    // Osascript doesn't play well, and the terminal notifier too
    // if (process.platform === 'darwin') return darwinTerminalNotifier;
    // if (process.platform === 'darwin') return darwinOsascript;

    if (process.platform === 'linux') {
        if (which('notify-send')) return linuxLibnotify;
        if (which('zenity')) return linuxGdbus;
    }

    return customNotification;
}

/**
 * @type {NotificationFunction}
 */
function win32Snoretoast(message) {
    const SnoreToast = getResourcePath('vendor', 'notify', 'SnoreToast-x64.exe');
    execFile(
        SnoreToast,
        ['-appid', packageJson.build.appid, '-p', notifiactionIcon, '-t', packageJson.displayName, '-m', message],
        {
            windowsHide: true,
        }
    );
}

/**
 * @type {NotificationFunction}
 */
function darwinOsascript(message) {
    const messagePayload = `"${message}" with title "${packageJson.displayName}"`;
    spawn('osascript', ['-e', 'display notification ' + messagePayload]);
}

/**
 * The terminal-notifier doesn't work well after Big Sur
 * @type {NotificationFunction}
 */
function darwinTerminalNotifier(message) {
    const terminalNotifier = getResourcePath('vendor', 'notify', 'terminal-notifier');
    execFile(terminalNotifier, [
        '-sender',
        packageJson.build.appId,
        '-activate',
        packageJson.build.appId,
        '-title',
        packageJson.name,
        '-message',
        message,
    ]);
}

/**
 * @type {NotificationFunction}
 */
function linuxGdbus(message) {
    execFile('gdbus', [
        'call',
        '--session',
        '--dest=org.freedesktop.Notifications',
        '--object-path=/org/freedesktop/Notifications',
        '--method=org.freedesktop.Notifications.Notify',
        '',
        0,
        notifiactionIcon,
        packageJson.displayName,
        message,
        '[]',
        '{"urgency": <1>}',
        7000,
    ]);
}

/**
 * @type {NotificationFunction}
 */
function linuxLibnotify(message) {
    execFile('notify-send', ['-i', notifiactionIcon, '-a', packageJson.displayName, packageJson.displayName, message]);
}

/**
 * @type {NotificationFunction}
 */
function customNotification(message) {
    const id = Symbol();
    const win = gui.Window.create({
        frame: false,
        transparent: false,
        showTrafficLights: false,
    });

    const primaryScreen = gui.screen.getPrimaryDisplay();
    if (!primaryScreen) {
        return;
    }

    customNotificationRegistry.set(id, [setTimeout((win) => win.close(), 7000, win), win]);

    win.onFocus = (self) => self.close();

    win.onClose = () => {
        clearTimeout(customNotificationRegistry.get(id)[0]);
        customNotificationRegistry.delete(id);
        reposition();
    };

    win.setHasShadow(false);
    win.setResizable(false);
    win.setMaximizable(false);
    win.setMinimizable(false);
    win.setAlwaysOnTop(true);
    win.setMovable(false);
    win.setBounds({
        y: 0,
        x: primaryScreen.bounds.width - 360,
        width: 340,
        height: 88,
    });

    win.setContentView(
        (() => {
            if (process.platform === 'darwin') {
                const contentView = gui.Vibrant.create();
                contentView.setMaterial('appearance-based');
                contentView.setBlendingMode('behind-window');
                return contentView;
            }
            return gui.Container.create();
        })()
    );

    win.getContentView().setStyle({ padding: 10 });

    const headWrapper = gui.Container.create();
    headWrapper.setStyle({ flexDirection: 'row' });
    // @ts-ignore
    win.getContentView().addChildView(headWrapper);

    const appIcon = gui.GifPlayer.create();
    appIcon.setImage(trayIcons.color);
    headWrapper.addChildView(appIcon);

    const appNameElement = gui.Label.create(packageJson.displayName);
    appNameElement.setAlign('start');
    appNameElement.setVAlign('center');
    appNameElement.setStyle({ padding: 5, flex: 0, marginLeft: 10 });
    headWrapper.addChildView(appNameElement);

    const messageElement = gui.Label.create(message);
    messageElement.setAlign('start');
    messageElement.setVAlign('start');
    messageElement.setStyle({ padding: 5, flex: 1, wrap: true, ellipsis: true });
    // @ts-ignore
    win.getContentView().addChildView(messageElement);

    reposition();
    win.setVisible(true);

    function reposition() {
        let yp = 10;
        let yc = primaryScreen.workArea.y + yp;
        for (const [t, ewin] of Array.from(customNotificationRegistry).reverse()) {
            const bounds = ewin[1].getBounds();
            ewin[1].setBounds({
                ...bounds,
                y: yc,
            });
            yc += yp + bounds.height;
        }
    }
}
