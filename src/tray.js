'use strict'

// Modules to control application life and create native browser window
const { Tray, Menu, shell } = require('electron')
const path = require('path')
const settings = require('./settings')
const rclone = require('./rclone')
const dialogs = require('./dialogs')

// Host the initialized Tray object.
let trayIndicator = null

// Store timer to avoid multiple neartime menu refreshes.
let refreshTrayMenuAtomicTimer = null

const fileExplorerLabel = process.platform === 'darwin'
  ? 'Finder'
  : process.platform === 'win32'
    ? 'Explorer'
    : 'File Browser'

/**
 * Do action with bookmark
 * @param action
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
  } else if (action === 'open-local') {
    rclone.openLocal(this)
  } else if (action === 'serve-start') {
    rclone.serveStart(args[0], this)
  } else if (action === 'serve-stop') {
    rclone.serveStop(args[0], this)
  } else if (action === 'ncdu') {
    rclone.ncdu(this)
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
 * @returns {*}
 */
const generateBookmarkActionsSubmenu = function (bookmark) {
  // If by some reason bookmark is broken, then show actions menu.
  if (!bookmark.$name || !bookmark.type) {
    return {
      label: bookmark.$name || '<Unknown>',
      enabled: false,
      type: 'submenu',
      // icon: icons.empty,
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
  if (isMounted !== false) {
    template.submenu.push(
      {
        label: isMounted ? 'Mounted' : 'Mounting',
        type: 'checkbox',
        checked: !!isMounted,
        enabled: false
      },
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
  } else {
    template.submenu.push({
      label: 'Mount',
      click: bookmarkActionRouter.bind(bookmark, 'mount')
    })
  }

  // Download/Upload
  let isDownloading = rclone.isDownloading(bookmark)
  let isUploading = rclone.isUploading(bookmark)
  if ('_local_path_map' in bookmark) {
    template.submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Download',
        enabled: !isUploading && !isDownloading,
        checked: isDownloading,
        click: bookmarkActionRouter.bind(bookmark, 'download')
      },
      {
        label: 'Upload',
        enabled: !isUploading && !isDownloading,
        checked: isUploading,
        click: bookmarkActionRouter.bind(bookmark, 'upload')
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
      if (servingURI !== false) {
        isServing = true

        if (i > 1) {
          template.submenu.push({
            type: 'separator'
          })
        }

        template.submenu.push({
          label: servingURI ? `Serving ${servingProtocols[protocol]}` : `Starting ${servingProtocols[protocol]} server`,
          type: 'checkbox',
          checked: true,
          enabled: false
        },
        {
          label: 'Stop',
          click: bookmarkActionRouter.bind(bookmark, 'serve-stop', protocol)
        })

        if (servingURI) {
          template.submenu.push({
            label: `Open "${servingURI}"`,
            click: bookmarkActionRouter.bind(bookmark, 'open-web-browser', servingURI)
          })
        }

        if (i < servingProtocolsLen) {
          template.submenu.push({
            type: 'separator'
          })
        }
      } else {
        template.submenu.push({
          label: `Serve ${servingProtocols[protocol]}`,
          click: bookmarkActionRouter.bind(bookmark, 'serve-start', protocol)
        })
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
      click: bookmarkActionRouter.bind(bookmark, 'ncdu')
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

  let isConnected = isMounted || isDownloading || isUploading || isServing

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
    template: template,
    connected: isConnected
  }
}

/**
 * Refreshing try menu.
 */
const refreshTrayMenu = function () {
  // If by some reason some part of the code do this.refresh() we should'nt do anything with the tray.
  if (!trayIndicator) {
    console.error('ERROR', 'tray-indicator: refresh() before init()')
    return
  }

  console.log('Refresh tray indicator menu')
  let isConnected = false

  let menuItems = [
    {
      label: 'New Bookmark',
      click: dialogs.addBookmark,
      accelerator: 'CommandOrControl+N'
    }
  ]

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

  trayIndicator.setContextMenu(Menu.buildFromTemplate(menuItems))
}

// Exports.
module.exports = {

  refresh: function () {
    if (refreshTrayMenuAtomicTimer) {
      clearTimeout(refreshTrayMenuAtomicTimer)
    }
    refreshTrayMenuAtomicTimer = setTimeout(refreshTrayMenu, 250)
  },

  /**
   * Initialize the tray menu.
   */
  init: function () {
    if (trayIndicator === null) {
      let icon = null
      if (process.platform === 'win32') {
        icon = path.join(__dirname, 'ui', 'icons', 'icon.ico')
      } else if (process.platform === 'linux') {
        icon = path.join(__dirname, 'ui', 'icons', 'icon.png')
      } else {
        icon = path.join(__dirname, 'ui', 'icons', 'iconTemplate.png')
      }
      trayIndicator = new Tray(icon)
      rclone.onUpdate(this.refresh)
      rclone.init()
    } else {
      throw Error('Cannot start more than one tray indicators.')
    }
  }

}
