import gui from 'gui';
import config from './services/config.js';
import * as rclone from './services/rclone.js';
import { ref } from './utils/ref.js';
import { providerIcons, trayIcons } from './services/images.js';
import packageJson from './utils/package-json.js';
import { debounce } from './utils/debounce.js';
import createBookmarkWizardWindow from './bookmark-wizard.js';
import createPreferencesWindow, { openRcloneConfigFile } from './preferences.js';
import createAboutWindow from './about.js';
import { createBookmarkWindowByName } from './bookmark-edit.js';
import { appQuit } from './app-quit.js';
import open from 'open';

/** @type {{ value: gui.Tray, unref: CallableFunction }} */
const trayIcon = ref();

/** @type {string} */
const fileExplorerAppName = { darwin: 'Finder', win32: 'Explorer' }[process.platform] || 'File Browser';

/** @type {string} */
const preferencesAccelerator = process.platform === 'darwin' ? 'CmdOrCtrl+,' : 'CmdOrCtrl+P';

/**
 * Tasks tray menu for update
 * @type {() => void}
 */
export const updateMenu = debounce(async () => {
    const connected = rclone.isDaemonConnected();
    if (connected) {
        try {
            const [bookmarks, mounted, inSync] = await Promise.all([
                rclone.getBookmarks(),
                rclone.getMounted(),
                rclone.getSyncing(),
            ]);

            setMenu(bookmarks, {
                mounted: mounted.mountPoints.map((item) => item.Fs),
                inSync,
                connected,
                dlna: rclone.getDLNAServings(),
            });

            return;
        } catch (error) {
            console.warn('Cannot get required info to update menu');
        }
    }

    setMenu([], { mounted: [], inSync: [], dlna: [], connected: false });
});

/**
 * Create tray menu instance
 */
export function createTrayMenu() {
    if (trayIcon.value) return;
    trayIcon.value = gui.Tray.createWithImage(getTrayIcon());
    setMenu([], { mounted: [], inSync: [], dlna: [], connected: false });
}

/**
 * Set tray menu content
 * @param {object} bookmarks
 * @param {{mounted: string[], inSync: string[], dlna: string[], connected: boolean}} state
 */
async function setMenu(bookmarks, state) {
    const hasConnectedBookmark = state.inSync.length + state.dlna.length + state.mounted.length > 0;

    const bookmarksMenus = Object.keys(bookmarks)
        .map((bookmarkName) =>
            buildBookmarkMenu(bookmarkName, bookmarks[bookmarkName], {
                mounted: state.mounted.indexOf(bookmarkName) !== -1,
                inSync: state.inSync.indexOf(bookmarkName) !== -1,
                dlna: state.dlna.indexOf(bookmarkName) !== -1,
            })
        )
        .sort(bookmarkSortByFunction(config.store.bookmarks_order))
        .sort(config.store.connected_first ? bookmarkSortConnectedFirstFunction : undefined);

    const menuStructure = [];
    menuStructure.push(
        {
            label: 'New Bookmark',
            accelerator: 'CmdOrCtrl+N',
            onClick: createBookmarkWizardWindow,
            enabled: state.connected,
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
            label: 'About',
            accelerator: 'CmdOrCtrl+A',
            onClick: createAboutWindow,
        },
        {
            type: 'separator',
        }
    );

    menuStructure.push({
        label: `Quit ${packageJson.build.productName}`,
        accelerator: 'CmdOrCtrl+Q',
        onClick: appQuit,
    });

    trayIcon.value.setMenu(gui.Menu.create(menuStructure));
    trayIcon.value.setImage(getTrayIcon(hasConnectedBookmark));
}

/**
 * Create bookmark item menu content
 * @param {string} bookmarkName
 * @param {object} bookmarkConfig
 * @param {{mounted: boolean, inSync: boolean, dlna: boolean}} state
 * @returns {object}
 */
function buildBookmarkMenu(bookmarkName, bookmarkConfig, state) {
    const isConnected = state.mounted || state.dlna || state.inSync;
    const showMenuType = process.platform === 'linux' && config.store.show_type ? 'text' : config.store.show_type;

    const bookmarkMenu = {
        _meta: {
            type: bookmarkConfig.type,
            name: bookmarkName,
            isConnected: isConnected,
        },
        label: bookmarkName || '<Untitled>',
        type: 'submenu',
        submenu: [],
    };

    if (bookmarkConfig.host && config.store.show_host) {
        if (showMenuType === 'text') {
            bookmarkMenu.label = bookmarkMenu.label + ' - ' + bookmarkConfig.type + '://' + bookmarkConfig.host;
        } else {
            bookmarkMenu.label = bookmarkMenu.label + ' - ' + bookmarkConfig.host;
        }
    } else if (showMenuType === 'text') {
        bookmarkMenu.label = bookmarkConfig.type + '://' + bookmarkMenu.label;
    }

    if (showMenuType === 'icon') {
        bookmarkMenu.image = providerIcons[bookmarkConfig.type] || providerIcons._unknown;
    }

    if (config.store.show_status) {
        bookmarkMenu.checked = isConnected;
    }

    bookmarkMenu.submenu.push({
        label: 'Mount',
        type: 'checkbox',
        checked: !!state.mounted,
        enabled: !state.mounted,
        onClick: (menuItem) => {
            menuItem.setChecked(false);
            rclone.mount(bookmarkName, bookmarkConfig);
        },
    });

    if (state.mounted) {
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

    bookmarkMenu.submenu.push({ type: 'separator' });

    if (bookmarkConfig.rclonetray_local_directory) {
        bookmarkMenu.submenu.push(
            {
                type: 'label',
                label: 'Pull',
                onClick: () => rclone.pull(bookmarkName, bookmarkConfig),
                enabled: !state.inSync,
            },
            {
                type: 'label',
                label: 'Push',
                onClick: () => rclone.push(bookmarkName, bookmarkConfig),
                enabled: !state.inSync,
            },
            {
                label: 'Push on Change',
                type: 'label',
                checked: !!state.inSync,
                onClick: () => {
                    if (state.inSync) {
                        rclone.pushOnChange(bookmarkName, bookmarkConfig).close();
                    } else {
                        rclone.pushOnChange(bookmarkName, bookmarkConfig);
                    }
                },
            },
            {
                label: `Open Local in ${fileExplorerAppName}`,
                onClick: () => open('file://' + bookmarkConfig.rclonetray_local_directory),
            },
            { type: 'separator' }
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
                checked: state.dlna,
                onClick: (menuItem) => {
                    if (!rclone.isBookmarkDLNAStarted(bookmarkName)) {
                        menuItem.setChecked(true);
                        rclone.bookmarkStartDLNA(bookmarkName, bookmarkConfig);
                    } else {
                        menuItem.setChecked(false);
                        rclone.bookmarkStopDLNA(bookmarkName);
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
 * @param {Promise<any>} asyncFunction
 */
async function unhandledSafeAsync(asyncFunction) {
    try {
        await asyncFunction;
    } catch (error) {}
}

/**
 * @param {boolean=} state
 */
function getTrayIcon(state) {
    if (process.platform === 'darwin') return trayIcons[`light${state ? 'Connected' : ''}`];

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
            if (a._meta.type === b._meta.type) return 0;
            return a._meta.type > b._meta.type ? 1 : -1;
        } else if (field === 'name') {
            return a._meta.name > b._meta.name ? 1 : -1;
        } else {
            return 0;
        }
    };
}

/**
 * Sort bookmark by their status
 * @param {object} a
 * @param {object} b
 * @return 1|-1|0
 */
function bookmarkSortConnectedFirstFunction(a, b) {
    return a._meta.isConnected > b._meta.isConnected ? -1 : 0;
}
