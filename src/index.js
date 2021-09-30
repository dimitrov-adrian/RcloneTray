import process from 'node:process';
import {createAboutWindow} from './about.js';
import {app} from './app.js';
import {askPass, askConfigPass} from './ask-pass.js';
import {createPreferencesWindow} from './preferences.js';

if (process.arch !== 'x64' || !['win32', 'linux', 'darwin'].includes(process.platform)) {
	console.log('Unsupported platform. Currently supported platforms are:');
	console.log(' - macOS (Intel, M1)');
	console.log(' - Windows 10, 11 (x64)');
	console.log(' - GNU/Linux (x64) + Desktop Environment and GTK');
	process.exit(1);
}

// Check for yode.
if (!process.versions.yode && !process.versions.qode) {
	console.error('App must be run under Yode/Qode engine.');
	process.exit(1);
}

// Main router.
(async function (command) {
	if (command === 'ask-pass-config') {
		askConfigPass();
		return;
	}

	if (command === 'ask-pass-remote' || command === 'ask-pass') {
		askPass();
		return;
	}

	if (command === 'about') {
		createAboutWindow().onClose = () => process.exit();
		return;
	}

	if (command === 'preferences') {
		createPreferencesWindow().onClose = () => process.exit();
		return;
	}

	app();
})(process.argv.slice(-1)[0]);
