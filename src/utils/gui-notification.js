import { execFile, spawn } from 'child_process';
import gui from 'gui';
import { title } from 'process';
import getResourcePath from './get-resource-path.js';
import packageJson from './package-json.js';

/**
 * @param {string} message
 */
export default function sendNotification(message) {
    const notification = gui.Notification.create();
    notification.setTitle(title || packageJson.build.productName);
    message && notification.setBody(message);
    notification.show();
}

function darwinOsascriptSendNotification(message) {
    const messagePayload = `"${message}" with title "${packageJson.displayName}"`;
    spawn('osascript', ['-e', 'display notification ' + messagePayload]);
}

const notifiactionIcon = getResourcePath('icons', 'rclone-icon-color-64@2x.png');
function linuxGdbusSendNotification(message) {
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
