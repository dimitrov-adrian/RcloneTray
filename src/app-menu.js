import gui from 'gui';
import { packageJson } from './utils/package.js';
import { createAboutWindow, openHomepage, openLicense, openRcloneHomepage, reportIssue } from './about.js';
import { appQuit } from './app-quit.js';
import { createBookmarkWizardWindow } from './bookmark-wizard.js';
import { createPreferencesWindow } from './preferences.js';
import { createLogWindow } from './logs.js';

export const appMenu = gui.MenuBar.create([
	{
		submenu: [
			{
				label: 'About',
				accelerator: 'CmdOrCtrl+A',
				onClick: createAboutWindow,
			},
			{ type: 'separator' },
			{
				label: 'New Bookmark',
				onClick: createBookmarkWizardWindow,
				accelerator: 'CmdOrCtrl+N',
			},
			{ type: 'separator' },
			{
				label: 'Preferences',
				onClick: createPreferencesWindow,
				accelerator: 'CmdOrCtrl+P',
			},
			{
				label: 'Logs',
				onClick: createLogWindow,
				accelerator: 'CmdOrCtrl+O',
			},
			{ type: 'separator' },
			{ role: 'hide', accelerator: 'CmdOrCtrl+H' },
			{ role: 'hide-others', accelerator: 'CmdOrCtrl+Alt+H' },
			{ type: 'separator' },
			{
				label: `Quit ${packageJson.build.productName}`,
				accelerator: 'CmdOrCtrl+Q',
				onClick: appQuit,
			},
		],
	},
	{
		label: 'Edit',
		submenu: [
			{ role: 'copy' },
			{ role: 'cut' },
			{ role: 'paste' },
			{ role: 'select-all' },
			{ type: 'separator' },
			{ role: 'undo' },
			{ role: 'redo' },
		],
	},
	{
		label: 'Window',
		role: 'window',
		submenu: [
			{ type: 'separator' },
			{ role: 'minimize', accelerator: 'CmdOrCtrl+M' },
			{ role: 'close-window', accelerator: 'CmdOrCtrl+W' },
			{ type: 'separator' },
		],
	},
	{
		label: 'Help',
		role: 'help',
		submenu: [
			{
				label: 'Homepage',
				onClick: openHomepage,
			},
			{
				label: 'Report issue',
				onClick: reportIssue,
			},
			{
				label: 'View License',
				onClick: openLicense,
			},
			{ type: 'separator' },
			{
				label: 'Rclone Homepage',
				onClick: openRcloneHomepage,
			},
		],
	},
]);
