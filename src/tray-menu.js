import process from 'node:process';
import gui from 'gui';
import open from 'open';
import debounce from 'debounce';
import * as rclone from './services/rclone.js';
import { config } from './services/config.js';
import { ref } from './utils/ref.js';
import { providerIcons, trayIcons } from './services/images.js';
import { packageJson } from './utils/package.js';
import { createBookmarkWizardWindow } from './bookmark-wizard.js';
import { createPreferencesWindow, openRcloneConfigFile } from './preferences.js';
import { createAboutWindow } from './about.js';
import { createBookmarkWindowByName } from './bookmark-edit.js';
import { appQuit } from './app-quit.js';
import { createLogWindow } from './logs.js';

/** @type {{ value: gui.Tray, unref: CallableFunction }} */
const trayIcon = ref();

/** @type {string} */
const fileExplorerAppName =
	{
		darwin: 'Finder',
		win32: 'Explorer',
	}[process.platform] || 'File Browser';

/** @type {string} */
const preferencesAccelerator = process.platform === 'darwin' ? 'CmdOrCtrl+,' : 'CmdOrCtrl+P';

/**
 * Tasks tray menu for update
 * @type {() => void}
 */
export const updateMenu = debounce(() => setMenu(), 500);

/**
 * Create tray menu instance
 */
export function createTrayMenu() {
	if (trayIcon.value) return;

	trayIcon.value = gui.Tray.createWithImage(getTrayIcon());
	setMenu();
}

/**
 * Set tray menu content
 */
async function setMenu() {
	const activeJobsMap = rclone.getActiveJobsMap();

	// Prepare submenus for the bookmarks items.
	const bookmarksMenus = Object.entries(await rclone.getBookmarks())
		.map(([bookmarkName, bookmarkConfig]) =>
			buildBookmarkMenu(bookmarkName, bookmarkConfig, activeJobsMap[bookmarkName] || {})
		)
		.sort(bookmarkSortByFunction(config.store.bookmarks_order))
		.sort(config.store.connected_first ? bookmarkSortConnectedFirstFunction : undefined);

	/**
	 * @type {object[]}
	 */
	const menuStructure = [];

	menuStructure.push(
		{
			label: 'New Bookmark',
			accelerator: 'CmdOrCtrl+N',
			onClick: createBookmarkWizardWindow,
		},
		{ type: 'separator' },
		...bookmarksMenus
	);

	if (bookmarksMenus.length > 0) {
		menuStructure.push({ type: 'separator' });
	}

	if (config.store.show_config_refresh) {
		menuStructure.push(
			{
				label: 'Refresh Bookmarks',
				onClick: updateMenu,
			},
			{ type: 'separator' }
		);
	}

	menuStructure.push({
		label: 'Preferences',
		accelerator: preferencesAccelerator,
		onClick: createPreferencesWindow,
	});

	if (config.store.show_config_shortcut) {
		menuStructure.push({
			label: 'Open config file',
			onClick: openRcloneConfigFile,
		});
	}

	menuStructure.push(
		{
			label: 'Logs',
			accelerator: 'CmdOrCtrl+O',
			onClick: createLogWindow,
		},
		{
			label: 'About',
			accelerator: 'CmdOrCtrl+A',
			onClick: createAboutWindow,
		},
		{
			type: 'separator',
		},
		{
			label: `Quit ${packageJson.build.productName}`,
			accelerator: 'CmdOrCtrl+Q',
			onClick: appQuit,
		}
	);

	trayIcon.value.setImage(getTrayIcon(rclone.hasActiveJobs()));
	trayIcon.value.setMenu(gui.Menu.create(menuStructure));
}

/**
 * Create bookmark item menu content
 * @param {string} bookmarkName
 * @param {object} bookmarkConfig
 * @param {import('./services/rclone.js').ActiveJobMapList} activeJobs
 * @returns {object}
 */
function buildBookmarkMenu(bookmarkName, bookmarkConfig, activeJobs) {
	const isConnected = Object.keys(activeJobs).length > 0;
	const showMenuType = process.platform === 'linux' && config.store.show_type ? 'text' : config.store.show_type;

	const bookmarkMenu = {
		$meta: {
			type: bookmarkConfig.type,
			name: bookmarkName,
			isConnected,
		},
		label: bookmarkName || '<Untitled>',
		type: 'submenu',
		submenu: [],
	};

	if (bookmarkConfig.host && config.store.show_host) {
		if (showMenuType === 'text') {
			bookmarkMenu.label +=
				showMenuType === 'text' ? bookmarkConfig.type + '://' + bookmarkConfig.host : bookmarkConfig.host;
		}
	} else if (showMenuType === 'text') {
		bookmarkMenu.label = bookmarkConfig.type + '://' + bookmarkMenu.label;
	}

	if (showMenuType === 'icon') {
		bookmarkMenu.image = providerIcons[bookmarkConfig.type] || providerIcons.$unknown;
	}

	if (config.store.show_status) {
		bookmarkMenu.checked = isConnected;
	}

	bookmarkMenu.submenu.push({
		label: 'Mount',
		type: 'checkbox',
		checked: activeJobs.mount,
		enabled: !activeJobs.mount,
		onClick: (menuItem) => {
			menuItem.setChecked(false);
			rclone.mount(bookmarkName, bookmarkConfig);
		},
	});

	if (activeJobs.mount) {
		bookmarkMenu.submenu.push(
			{
				label: 'Unmount',
				onClick: () => rclone.unmount(bookmarkName),
			},
			{
				label: `Open in ${fileExplorerAppName}`,
				onClick: rclone.openMounted(bookmarkName),
			}
		);
	}

	if (bookmarkConfig[rclone.RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory]) {
		bookmarkMenu.submenu.push(
			{ type: 'separator' },
			{
				type: 'label',
				label: 'Pull',
				onClick: () => rclone.pull(bookmarkName, bookmarkConfig),
				enabled: !activeJobs.pull && !activeJobs.push,
			},
			{
				type: 'label',
				label: 'Push',
				onClick: () => rclone.push(bookmarkName, bookmarkConfig),
				enabled: !activeJobs.pull && !activeJobs.push,
			},
			{
				label: 'Push on Change',
				type: 'label',
				checked: activeJobs.autopush,
				onClick: () => {
					if (activeJobs.autopush) {
						rclone.autopush(bookmarkName, false);
					} else {
						rclone.autopush(bookmarkName, bookmarkConfig);
					}
				},
			},
			{
				label: `Open Local in ${fileExplorerAppName}`,
				onClick: () => open('file://' + bookmarkConfig[rclone.RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory]),
			}
		);
	}

	// NCDU
	if (config.store.enable_ncdu) {
		bookmarkMenu.submenu.push(
			{ type: 'separator' },
			{
				label: 'Console Browser',
				onClick: () => rclone.openNCDU(bookmarkName, bookmarkConfig),
			}
		);
	}

	// DLNA
	if (config.store.enable_dlna_serve) {
		bookmarkMenu.submenu.push(
			{ type: 'separator' },
			{
				label: 'Serve DLNA',
				type: 'checkbox',
				checked: activeJobs.dlna,
				onClick: (menuItem) => {
					if (activeJobs.dlna) {
						menuItem.setChecked(false);
						rclone.stopDLNA(bookmarkName);
					} else {
						menuItem.setChecked(true);
						rclone.startDLNA(bookmarkName, bookmarkConfig);
					}
				},
			}
		);
	}

	bookmarkMenu.submenu.push(
		{ type: 'separator' },
		{
			label: 'Edit',
			enabled: !isConnected,
			onClick: () => createBookmarkWindowByName(bookmarkName),
		}
	);

	return bookmarkMenu;
}

/**
 * @param {boolean=} state
 */
function getTrayIcon(state) {
	if (process.platform === 'darwin') {
		return trayIcons[`light${state ? 'Connected' : ''}`];
	}

	const theme = config.store.tray_icon_theme || (process.platform === 'win32' ? 'color' : 'light');
	return trayIcons[`${theme}${state ? 'Connected' : ''}`];
}

/**
 * Create bookmark sorting callback
 * @param  {string} field
 * @returns {(a: object, b: object) => 1|-1|0}
 */
function bookmarkSortByFunction(field) {
	return (a, b) => {
		if (field === 'type') {
			if (a.$meta.type === b.$meta.type) {
				return 0;
			}

			return a.$meta.type > b.$meta.type ? 1 : -1;
		}

		if (field === 'name') {
			return a.$meta.name > b.$meta.name ? 1 : -1;
		}

		return 0;
	};
}

/**
 * Sort bookmark by their status
 * @param {object} a
 * @param {object} b
 * @return 1|-1|0
 */
function bookmarkSortConnectedFirstFunction(a, b) {
	return a.$meta.isConnected > b.$meta.isConnected ? -1 : 0;
}
