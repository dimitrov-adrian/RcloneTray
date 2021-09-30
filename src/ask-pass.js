import process from 'node:process';
import {promptInput} from './utils/prompt.js';

/**
 * @returns {import('gui').Window}
 */
export function askPass() {
	return promptInput(
		{
			label: 'Enter Password',
			helpText: 'Password is required to authenticate in remote.',
			buttonText: 'Authenticate',
			required: true,
			type: 'password',
		},
		password => {
			process.stdout.write(password.toString());
			process.exit();
		},
	);
}

/**
 * @returns {import('gui').Window}
 */
export function askConfigPass() {
	return promptInput(
		{
			buttonText: 'Unlock',
			helpText: 'Rclone config file is encrypted, need to enter password to unlock.',
			label: 'Rclone Config Password',
			required: true,
			type: 'password',
		},
		password => {
			process.stdout.write(password.toString());
			process.exit();
		},
	);
}
