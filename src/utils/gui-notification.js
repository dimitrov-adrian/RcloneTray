import { title } from 'node:process';
import gui from 'gui';
import { packageJson } from './package.js';

/**
 * @param {string} message
 */
export function sendNotification(message) {
	const notification = gui.Notification.create();
	notification.setTitle(title || packageJson.build.productName);

	if (message) {
		notification.setBody(message);
	}

	notification.show();
}
