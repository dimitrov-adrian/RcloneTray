import process from 'node:process';
import console from 'node:console';
import { createAboutWindow } from './about.js';
import { app } from './app.js';
import { askPass, askConfigPass } from './ask-pass.js';
import { createPreferencesWindow } from './preferences.js';

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
switch (process.argv.slice(-1)[0]) {
	case 'ask-pass-config':
		askConfigPass();
		break;
	case 'ask-pass-remote':
	case 'ask-pass':
		askPass();
		break;
	case 'about':
		createAboutWindow().onClose = () => process.exit();
		break;
	case 'preferences':
		createPreferencesWindow().onClose = () => process.exit();
		break;
	default:
		app();
}
