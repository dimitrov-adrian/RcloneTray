'use strict'

const path = require('path')
const { Tray, Menu, shell } = require('electron')
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
 * Tray icon, default state
 * @private
 */
let iconDefault

/**
 * Tray icon, connected state
 */
let iconConnected

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
    rclone.openMounted(this)
  } else if (action === 'download') {
    rclone.download(this)
  } else if (action === 'stop-downloading') {
    rclone.stopDownloading(this)
  } else if (action === 'upload') {
    rclone.upload(this)
  } else if (action === 'stop-uploading') {
    rclone.stopUploading(this)
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
  let isMounted = rclone.mountStatus(bookmark)

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
  let isDownloading = false
  let isUploading = false
  let isAutomaticUpload = false

  if ('_local_path_map' in bookmark) {
    isDownloading = rclone.isDownloading(bookmark)
    isUploading = rclone.isUploading(bookmark)
    isAutomaticUpload = rclone.isAutomaticUpload(bookmark)
    template.submenu.push(
      {
        type: 'separator'
      },
      {
        type: 'checkbox',
        label: 'Download',
        enabled: !isAutomaticUpload && !isUploading && !isDownloading,
        checked: isDownloading,
        click: bookmarkActionRouter.bind(bookmark, 'download')
      },
      {
        type: 'checkbox',
        label: 'Upload',
        enabled: !isAutomaticUpload && !isUploading && !isDownloading,
        checked: isUploading,
        click: bookmarkActionRouter.bind(bookmark, 'upload')
      },
      {
        type: 'checkbox',
        label: 'Automatic Upload',
        checked: isAutomaticUpload,
        click: bookmarkActionRouter.bind(bookmark, 'toggle-automatic-upload')
      })

    if (isDownloading) {
      template.submenu.push({
        label: 'Stop Downloading',
        click: bookmarkActionRouter.bind(bookmark, 'stop-downloading')
      })
    }

    if (isUploading) {
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
  let servingProtocols = rclone.getServingProtocols()
  let servingProtocolsLen = Object.keys(servingProtocols).length
  if (servingProtocolsLen) {
    template.submenu.push(
      {
        type: 'separator'
      })

    let i = 0
    Object.keys(servingProtocols).forEach(function (protocol) {
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
        label: `Serve ${servingProtocols[protocol]}`,
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
        if (i < servingProtocolsLen) {
          template.submenu.push({
            type: 'separator'
          })
        }
      }
    })
  }

  // NCDU
  template.submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Console Browser',
      click: bookmarkActionRouter.bind(bookmark, 'open-ncdu')
    }
  )

  // Bookmark controls.
  template.submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Edit',
      click: dialogs.editBookmark.bind(bookmark)
    }
  )

  // Set the menu item state if there is any kind of connection or current running process.
  let isConnected = isMounted || isDownloading || isUploading || isServing || isAutomaticUpload

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
    console.error('ERROR', 'tray-indicator: refresh() before init()')
    return
  }

  console.log('Refresh tray indicator menu')

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
  trayIndicator.setImage(isConnected ? iconConnected : iconDefault)
}

/**
 * Refresh the tray menu.
 */
const refresh = function () {
  // Use some kind of static variable to store the timer
  if (typeof refresh.refreshTrayMenuAtomicTimer !== 'undefined' && refresh.refreshTrayMenuAtomicTimer) {
    clearTimeout(refresh.refreshTrayMenuAtomicTimer)
  }

  // 500ms delay should be enough to prevent multiple updates in neartime.
  refresh.refreshTrayMenuAtomicTimer = setTimeout(refreshTrayMenu, 500)
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
    iconDefault = path.join(__dirname, 'ui', 'icons', 'icon.ico')
    iconConnected = path.join(__dirname, 'ui', 'icons', 'icon-connected.ico')
  } else if (process.platform === 'linux') {
    iconDefault = path.join(__dirname, 'ui', 'icons', 'icon.png')
    iconConnected = path.join(__dirname, 'ui', 'icons', 'icon-connected.png')
  } else {
    iconDefault = path.join(__dirname, 'ui', 'icons', 'iconTemplate.png')
    iconConnected = path.join(__dirname, 'ui', 'icons', 'icon-connectedTemplate.png')
  }

  trayIndicator = new Tray(iconDefault)
}

// Exports.
module.exports = {
  refresh: refresh,
  init: init
}
