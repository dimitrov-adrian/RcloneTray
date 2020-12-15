import gui from 'gui'
import bindings from '../bindings.js'
import config from '../config.js'
import { getBookmarks, isDaemonConnected } from '../rcloned.js'
import appInfo from '../utils/app-info.js'
import getResourcePath from '../utils/get-resource-path.js'
import isDarkmode from '../utils/is-darkmode.js'
import ref from '../utils/ref.js'

/** @type {{ value: gui.Tray, unref }} */
const trayIcon = ref()

const fileExplorerAppName = { darwin: 'Finder', win32: 'Explorer' }[process.platform] || 'File Browser'

export function createTrayMenu() {
    if (trayIcon.value) {
        return
    }
    trayIcon.value = gui.Tray.createWithImage(getTrayIcon())
    setMenu([])
}

export async function updateMenu() {
    const bookmarks = await getBookmarks()
    setMenu(bookmarks)
}

function getTrayIcon(state) {
    const theme = isDarkmode() ? 'light' : 'dark'
    let imageFilename = `rclone-icon${state ? '-connected' : ''}-${theme}@4x.png`
    const image = gui.Image.createFromPath(getResourcePath('icons', imageFilename))
    return image
}

function bookmarkSortFunction(a, b) {
    if (config.get('order_bookmarks') === 'type') {
        return a._bookmark?.type > b._bookmark?.type ? 1 : -1
    } else if (config.get('order_bookmarks') === 'type') {
        return a._name > b?._name ? 1 : -1
    }
}

function buildBookmarkMenuTitle({ bookmarkName, host, type }) {
    let title = bookmarkName || '<Untitled>'
    if (config.get('tray_menu_show_type') && type) {
        title = `[${type.toUpperCase()}] ${title}`
    }
    if (config.get('tray_menu_show_host') && host) {
        title = `${title} <${host}>`
    }
    return title
}

function buildBookmarkMenu(bookmarkName, bookmark, status) {
    const isMounted = false
    const isSyncing = false
    const isConnected = isMounted || isSyncing

    const bookmarkMenu = {
        _bookmark: bookmark,
        _name: bookmarkName,
        label: buildBookmarkMenuTitle({
            bookmarkName,
            host: bookmark?.host,
            type: bookmark?.type,
        }),
        type: 'submenu',
        checked: isConnected,
        submenu: [],
        enabled: isDaemonConnected(),
    }

    if (config.get('rclone_enable_mount') || true) {
        bookmarkMenu.submenu.push({
            label: 'Mount',
            type: 'checkbox',
            checked: !!isMounted,
            onClick: (menuItem) => {
                if (menuItem.isChecked()) {
                    menuItem.setChecked(false)
                    bindings.emit('bookmark/mount', bookmarkName)
                } else {
                    bindings.emit('bookmark/unmount', bookmarkName)
                }
            },
        })

        if (isMounted) {
            bookmarkMenu.submenu.push({
                label: `Open in ${fileExplorerAppName}`,
                onClick: bindings.createEmitter('bookmark/mount_open', bookmarkName),
            })
        }

        bookmarkMenu.submenu.push({
            type: 'separator',
        })
    }

    if (config.get('allow_pushpull') || true) {
        bookmarkMenu.submenu.push(
            {
                type: 'label',
                label: 'Pull',
                onClick: bindings.createEmitter('bookmark/pull', bookmarkName),
                enabled: !isSyncing,
            },
            {
                type: 'label',
                label: 'Push',
                onClick: bindings.createEmitter('bookmark/push', bookmarkName),
                enabled: !isSyncing,
            },
            {
                label: 'Push on Change',
                type: 'label',
                checked: !!isSyncing,
                onClick: (menuItem) => {
                    if (menuItem.isChecked()) {
                        menuItem.setChecked(false)
                        bindings.emit('app/push_on_change/start', bookmarkName)
                    } else {
                        bindings.emit('app/push_on_change/stop', bookmarkName)
                    }
                },
            },
            {
                label: `Open Local in ${fileExplorerAppName}`,
                onClick: bindings.createEmitter('app/mount_open', bookmarkName),
            },
            {
                type: 'separator',
            }
        )
    }

    // NCDU
    if (config.get('rclone_ncdu_enable') || true) {
        bookmarkMenu.submenu.push(
            {
                type: 'separator',
            },
            {
                label: 'Console Browser',
                onClick: bindings.createEmitter('bookmark/ncdu', bookmarkName),
            }
        )
    }

    bookmarkMenu.submenu.push(
        {
            type: 'separator',
        },
        {
            label: 'Edit',
            enabled: !isConnected,
            onClick: bindings.createEmitter('app/edit', bookmarkName),
        }
    )

    return bookmarkMenu
}

async function setMenu(bookmarks) {
    let isAppConnected = false

    const bookmarksMenus = Object.keys(bookmarks)
        .map((bookmarkName) => buildBookmarkMenu(bookmarkName, bookmarks[bookmarkName]))
        .sort(bookmarkSortFunction)

    const menu = gui.Menu.create([
        {
            label: 'New Bookmark',
            accelerator: 'CmdOrControl+N',
            onClick: bindings.createEmitter('app/wizard'),
            enabled: isDaemonConnected(),
        },
        {
            type: 'separator',
        },
        ...bookmarksMenus,
        {
            type: 'separator',
        },
        {
            label: 'Preferences',
            accelerator: 'CommandOrControl+,',
            onClick: bindings.createEmitter('app/preferences'),
        },
        {
            label: 'About',
            accelerator: 'CommandOrControl+A',
            onClick: bindings.createEmitter('app/about'),
        },
        {
            type: 'separator',
        },
        {
            label: `Quit ${appInfo.productName}`,
            accelerator: 'CmdOrCtrl+Q',
            onClick: bindings.createEmitter('app/quit'),
        },
    ])

    trayIcon.value.setMenu(menu)
    trayIcon.value.setImage(getTrayIcon(isAppConnected))
}
