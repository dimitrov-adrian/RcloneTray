'use strict'

const path = require('path')
const { Tray, Menu, shell } = require('electron')
const isDev = require('electron-is-dev')
const settings = require('./settings')
const rclone = require('./rclone')
const dialogs = require('./dialogs')

/**
 * Host the initialized Tray object.
 * @type {Tray}
 * @private
 */
let trayIndicator = null

/**
 * Host the atomic timer
 * @private
 */
let refreshTrayMenuAtomicTimer = null

/**
 * Tray icons
 * @private
 */
const icons = {}

/**
 * Label for platform's file browser
 * @private
 */
const fileExplorerLabel = process.platform === 'darwin'
  ? 'Finder'
  : process.platform === 'win32'
    ? 'Explorer'
    : 'File Browser'

/**
 * Do action with bookmark
 * @param {string} action
 * @param ...args
 */
const bookmarkActionRouter = function (action, ...args) {
  if (action === 'mount') {
    rclone.mount(this)
  } else if (action === 'unmount') {
    rclone.unmount(this)
  } else if (action === 'open-mounted') {
    rclone.openMountPoint(this)
  } else if (action === 'download') {
    rclone.download(this)
  } else if (action === 'stop-downloading') {
    rclone.stopDownload(this)
  } else if (action === 'upload') {
    rclone.upload(this)
  } else if (action === 'stop-uploading') {
    rclone.stopUpload(this)
  } else if (action === 'toggle-automatic-upload') {
    rclone.toggleAutomaticUpload(this)
  } else if (action === 'open-local') {
    rclone.openLocal(this)
  } else if (action === 'serve-start') {
    rclone.serveStart(args[0], this)
  } else if (action === 'serve-stop') {
    rclone.serveStop(args[0], this)
  } else if (action === 'open-ncdu') {
    rclone.openNCDU(this)
  } else if (action === 'open-web-browser') {
    shell.openExternal(args[0])
  } else if (action === 'open-config') {
    shell.openItem(rclone.getConfigFile())
  } else if (action === 'delete-bookmark') {
    rclone.deleteBookmark(this.$name)
  } else {
    console.error('No such action', action, args, this)
  }
}

/**
 * Bookmark submenu
 *
 * @param {{bookmark}}
 * @returns {{}}
 */
const generateBookmarkActionsSubmenu = function (bookmark) {
  // If by some reason bookmark is broken, then show actions menu.
  if (!bookmark.$name || !bookmark.type) {
    return {
      label: bookmark.$name || '<Unknown>',
      enabled: false,
      type: 'submenu',
      submenu: [
        {
          label: 'Fix config file',
          click: bookmarkActionRouter.bind(null, 'open-config')
        },
        {
          label: 'Delete',
          enabled: !!bookmark.$name,
          click: bookmarkActionRouter.bind(bookmark, 'delete-bookmark')
        }
      ]
    }
  }

  // Main template
  let template = {
    type: 'submenu',
    submenu: []
  }

  // Mount
  let isMounted = rclone.getMountStatus(bookmark)
  template.submenu.push({
    label: 'Mount',
    click: bookmarkActionRouter.bind(bookmark, 'mount'),
    checked: !!isMounted,
    enabled: isMounted === false
  })
  if (isMounted !== false) {
    template.submenu.push(
      {
        label: 'Unmount',
        click: bookmarkActionRouter.bind(bookmark, 'unmount')
      },
      {
        label: `Open In ${fileExplorerLabel}`,
        enabled: !!isMounted,
        click: bookmarkActionRouter.bind(bookmark, 'open-mounted')
      }
    )
  }

  // Download/Upload
  let isDownload = false
  let isUpload = false
  let isAutomaticUpload = false
  if (settings.get('rclone_sync_enable') && '_rclonetray_local_path_map' in bookmark && bookmark._rclonetray_local_path_map.trim()) {
    isDownload = rclone.isDownload(bookmark)
    isUpload = rclone.isUpload(bookmark)
    isAutomaticUpload = rclone.isAutomaticUpload(bookmark)
    template.submenu.push(
      {
        type: 'separator'
      },
      {
        type: 'checkbox',
        label: 'Download',
        enabled: !isAutomaticUpload && !isUpload && !isDownload,
        checked: isDownload,
        click: bookmarkActionRouter.bind(bookmark, 'download')
      },
      {
        type: 'checkbox',
        label: 'Upload',
        enabled: !isAutomaticUpload && !isUpload && !isDownload,
        checked: isUpload,
        click: bookmarkActionRouter.bind(bookmark, 'upload')
      },
      {
        type: 'checkbox',
        label: 'Automatic Upload',
        checked: isAutomaticUpload,
        click: bookmarkActionRouter.bind(bookmark, 'toggle-automatic-upload')
      })

    if (isDownload) {
      template.submenu.push({
        label: 'Stop Downloading',
        click: bookmarkActionRouter.bind(bookmark, 'stop-downloading')
      })
    }

    if (isUpload) {
      template.submenu.push({
        label: 'Stop Uploading',
        click: bookmarkActionRouter.bind(bookmark, 'stop-uploading')
      })
    }

    template.submenu.push({
      label: 'Show In Finder',
      click: bookmarkActionRouter.bind(bookmark, 'open-local')
    })
  }

  // Serving.
  let isServing = false
  let availableServingProtocols = rclone.getAvailableServeProtocols()
  let availableServingProtocolsLen = Object.keys(availableServingProtocols).length
  if (availableServingProtocolsLen) {
    template.submenu.push(
      {
        type: 'separator'
      })

    let i = 0
    Object.keys(availableServingProtocols).forEach(function (protocol) {
      i++
      let servingURI = rclone.serveStatus(protocol, bookmark)

      // Add separator before the menu item, only if current serve method is in process.
      if (servingURI !== false) {
        isServing = true
        if (i > 1) {
          template.submenu.push({
            type: 'separator'
          })
        }
      }

      template.submenu.push({
        type: 'checkbox',
        label: `Serve ${availableServingProtocols[protocol]}`,
        click: bookmarkActionRouter.bind(bookmark, 'serve-start', protocol),
        enabled: servingURI === false,
        checked: !!servingURI
      })

      if (servingURI !== false) {
        template.submenu.push(
          {
            label: 'Stop',
            click: bookmarkActionRouter.bind(bookmark, 'serve-stop', protocol)
          },
          {
            label: `Open "${servingURI}"`,
            click: bookmarkActionRouter.bind(bookmark, 'open-web-browser', servingURI),
            enabled: !!servingURI
          }
        )

        // Add separator after the menu item, only if current serve method is in process.
        if (i < availableServingProtocolsLen) {
          template.submenu.push({
            type: 'separator'
          })
        }
      }
    })
  }

  // NCDU
  if (settings.get('rclone_ncdu_enable')) {
    template.submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Console Browser',
        click: bookmarkActionRouter.bind(bookmark, 'open-ncdu')
      }
    )
  }

  // Set the menu item state if there is any kind of connection or current running process.
  let isConnected = isMounted || isDownload || isUpload || isServing || isAutomaticUpload

  // Bookmark controls.
  template.submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Edit',
      enabled: !isConnected,
      click: dialogs.editBookmark.bind(bookmark)
    }
  )

  // Set the bookmark label
  template.label = bookmark.$name

  if (settings.get('tray_menu_show_type')) {
    template.label += ' - ' + bookmark.type.toUpperCase()
  }

  if (process.platform === 'darwin') {
    // Because Apple likes rhombuses.
    template.label = (isConnected ? '◆ ' : '') + template.label
  } else {
    template.label = (isConnected ? '● ' : '○ ') + template.label
  }

  // Usually should not goes here.
  if (!template.label) {
    template.label = '<Unknown>'
  }

  return {
    template,
    isConnected
  }
}

/**
 * Refreshing try menu.
 */
const refreshTrayMenu = function () {
  // If by some reason some part of the code do this.refresh(),
  // before the tray icon initialization, must not continue because possible error.
  if (!trayIndicator) {
    return
  }

  if (isDev) {
    console.log('Refresh tray indicator menu')
  }

  let menuItems = []
  let isConnected = false

  menuItems.push({
    label: 'New Bookmark',
    click: dialogs.addBookmark,
    accelerator: 'CommandOrControl+N'
  })

  let bookmarks = rclone.getBookmarks()

  if (Object.keys(bookmarks).length > 0) {
    menuItems.push({
      type: 'separator'
    })
    for (let key in bookmarks) {
      let bookmarkMenu = generateBookmarkActionsSubmenu(bookmarks[key])
      menuItems.push(bookmarkMenu.template)
      if (bookmarkMenu.isConnected) {
        isConnected = true
      }
    }
  }

  menuItems.push(
    {
      type: 'separator'
    },
    {
      label: 'Preferences',
      click: dialogs.preferences,
      accelerator: 'CommandOrControl+,'
    },
    {
      label: 'About',
      click: dialogs.about
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'CommandOrControl+Q',
      role: 'quit'
    })

  // Set the menu.
  trayIndicator.setContextMenu(Menu.buildFromTemplate(menuItems))

  // Set icon acording to the status
  trayIndicator.setImage(isConnected ? icons.connected : icons.default)
}

/**
 * Refresh the tray menu.
 */
const refresh = function () {
  // Use some kind of static variable to store the timer
  if (refreshTrayMenuAtomicTimer) {
    clearTimeout(refreshTrayMenuAtomicTimer)
  }

  // Set some delay to avoid multiple updates in close time.
  refreshTrayMenuAtomicTimer = setTimeout(refreshTrayMenu, 500)
}

/**
 * Initialize the tray menu.
 */
const init = function () {
  if (trayIndicator) {
    // Avoid double tray loader
    console.error('Cannot start more than one tray indicators.')
    return
  }

  if (process.platform === 'win32') {
    icons.default = path.join(__dirname, 'ui', 'icons', 'icon.ico')
    icons.connected = path.join(__dirname, 'ui', 'icons', 'icon-connected.ico')
  } else if (process.platform === 'linux') {
    // @TODO in some cases the tray icon is blury, it's ok on Deepin, KDE, Xfce
    //       but on ubuntu doesn't looks good.
    //       need more tests with Gnome 3 (topicons), Mate, Cinnamon, Budgie
    icons.default = path.join(__dirname, 'ui', 'icons', 'icon.png')
    icons.connected = path.join(__dirname, 'ui', 'icons', 'icon-connected.png')
  } else {
    icons.default = path.join(__dirname, 'ui', 'icons', 'iconTemplate.png')
    icons.connected = path.join(__dirname, 'ui', 'icons', 'icon-connectedTemplate.png')
  }

  trayIndicator = new Tray(icons.default)
}

// Exports.
module.exports = {
  refresh: refresh,
  init: init
}
