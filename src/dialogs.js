'use strict'

const path = require('path')
const { shell, app, BrowserWindow, Menu, Notification, dialog } = require('electron')
const electronContextMenu = require('electron-context-menu')
const isDev = require('electron-is-dev')
const settings = require('./settings')

/**
 * Dialog names that should be opened with single instances
 * @type {{}}
 * @private
 */
const dialogsSingletoneInstances = {}

/**
 * Simple factory for the dialogs
 * @param {string} dialogName
 * @param {{}} options
 * @param {{}} props
 * @returns {BrowserWindow}
 * @private
 */
const createNewDialog = function (dialogName, options, props) {
  // Use $singleId options property with special meaning of not allowing,
  // dialog to have multiple instances.
  let singleId = options && options.hasOwnProperty('$singleId')
  if (singleId) {
    delete options['$singleId']
    singleId = dialogName + '/' + singleId.toString()
    if (dialogsSingletoneInstances.hasOwnProperty(singleId) && dialogsSingletoneInstances[singleId]) {
      dialogsSingletoneInstances[singleId].focus()
      return dialogsSingletoneInstances[singleId]
    }
  }

  // Dialog options.
  options = Object.assign({
    maximizable: false,
    minimizable: true,
    resizable: false,
    fullscreenable: false,
    useContentSize: true,
    show: false,
    backgroundColor: process.platform === 'win32' ? '#ffffff' : '#ececec',
    zoomToPageWidth: true,
    autoHideMenuBar: true,
    webPreferences: {
      backgroundThrottling: false,
      preload: path.join(__dirname, 'dialogs-preload.js'),
      devTools: isDev,
      defaultEncoding: 'UTF-8',
      nodeIntegration: false,
      sandbox: true
    }
  }, options)

  // Instantinate the window.
  let theDialog = new BrowserWindow(options)
  if (process.platform === 'darwin') {
    app.dock.show()
  }

  // Assign $props that we will use in window.getProps() as window properties (params) on load time.
  theDialog.$props = props || {}

  theDialog.on('ready-to-show', theDialog.show)
  theDialog.on('show', app.focus)

  // and load the index.html of the app.
  theDialog.loadFile(path.join(__dirname, 'ui', 'dialogs', dialogName + '.html'))

  // Emitted when the window is closed.
  theDialog.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    theDialog = null

    if (singleId) {
      delete dialogsSingletoneInstances[singleId]
    }

    // On macos hide the dock icon when no active windows by this app.
    if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length < 1) {
      app.dock.hide()
    }
  })

  // Open links in system default browser.
  theDialog.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    shell.openExternal(url)
  })

  if (singleId) {
    dialogsSingletoneInstances[singleId] = theDialog
  }

  return theDialog
}

/**
 * Show About dialog
 */
const about = function () {
  let aboutDialog = createNewDialog('About', {
    $singleId: 1,
    title: 'About',
    width: 340,
    height: 296,
    minimizable: false,
    alwaysOnTop: true,
    acceptFirstMouse: true,

    // Make the window sexy.
    vibrancy: 'appearance-based',
    titleBarStyle: 'hidden',
    backgroundColor: null
  })

  // Close when loose focus, but only when non-dev because even the dev tool trigger the close.
  if (!isDev) {
    aboutDialog.on('blur', aboutDialog.close)
  }
}

/**
 * Show Preferences dialog
 */
const preferences = function () {
  createNewDialog('Preferences', {
    $singleId: 1,
    width: 600,
    height: 300
  })
}

/**
 * Show new Bookmark dialog
 */
const addBookmark = function () {
  createNewDialog('AddBookmark', {
    $singleId: 1,
    width: 600,
    height: 460
  })
}

/**
 * Show edit Bookmark dialog
 */
const editBookmark = function () {
  let props = this
  createNewDialog('EditBookmark', {
    $singleId: this.$name,
    width: 600,
    height: 460
  }, props)
}

/**
 * Show OS notification
 * @param {string} message
 */
const notification = function (message) {
  (new Notification({
    body: message
  })).show()
}

/**
 * Multi Instance error
 */
const errorMultiInstance = function () {
  // @TODO consider switch to notification (baloon),
  //       the problem is that Notifications are available after app is ready
  // (new Notification({ body: 'RcloneTray is already started and cannot be started twice.' })).show()
  dialog.showErrorBox('', 'RcloneTray is already started and cannot be started twice.')
}

/**
 * Show the Uncaught Exception dialog
 * @param {Error} detail
 * @returns {boolean} Should exit
 */
const uncaughtException = function (detail) {
  if (app.isReady()) {
    // When error happen when app is ready then seems to be happen on late stage,
    // and user should decide to ignore or to exit (because could have active transfers)
    let choice = dialog.showMessageBox(null, {
      type: 'warning',
      buttons: ['Quit RcloneTray', 'Cancel'],
      title: 'Error',
      message: 'Unexpected runtime error.',
      detail: (detail || '').toString()
    })
    app.focus()
    return choice === 0
  } else {
    // This message will be shown on very early stage before most of the app is loaded.
    console.error(detail)
    dialog.showErrorBox('Error', 'Unexpected runtime error. RcloneTray cannot starts.')
    app.focus()
    return true
  }
}

/**
 * Show confirm exit dialog.
 * @returns {boolean}
 */
const confirmExit = function () {
  let choice = dialog.showMessageBox(null, {
    type: 'warning',
    buttons: ['Yes', 'No'],
    title: 'Quit RcloneTray',
    message: 'Are you sure you want to quit? There is active processes that will be terminated.'
  })
  return choice === 0
}

/**
 * Show confirm exit dialog.
 * @returns {boolean}
 */
const brokenUpdates = function () {
  let choice = dialog.showMessageBox(null, {
    type: 'warning',
    buttons: ['OK'],
    message: 'There is a problem while doing update check. The problem is not critical and do not affect normal work of the app, but the update notification will not be displayed.'
  })
  return choice === 0
}

/**
 * Show missing Rclone action dialog
 * @returns {Number}
 */
const missingRclone = function () {
  let choice = dialog.showMessageBox(null, {
    type: 'warning',
    buttons: ['Go Rclone Website', 'Switch to bundled version', 'Quit'],
    title: 'Error',
    message: 'Seems that Rclone is not installed (or cannot be found) on your system.\n\nYou need to install Rclne to your system or to switch to use bundled version of Rclone.\n'
  })

  if (choice === 0) {
    shell.openExternal('http://rclone.org/downloads/')
    app.exit()
  } else if (choice === 1) {
    settings.set('rclone_use_bundled', true)
  } else {
    app.exit()
  }

  return choice
}

/**
 * Initialize module
*/
const init = function () {
  // Build the global menu
  // @see https://electronjs.org/docs/api/menu#examples
  let template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'redo' },
        { role: 'undo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    }]

  template.push({
    role: 'window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  })

  if (process.platform === 'darwin') {
    // First "Application" menu on macOS
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'quit' }
      ]
    })

    // Edit menu
    template[1].submenu.push(
      { type: 'separator' },
      {
        label: 'Speech',
        submenu: [
          { role: 'startspeaking' },
          { role: 'stopspeaking' }
        ]
      }
    )

    // Window menu
    template[2].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ]
  }

  if (isDev) {
    template.push({
      label: 'Debug',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' }
      ]
    })
  }

  // Set the global menu, as it is part of the dialogs.
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  // Enable context menus.
  electronContextMenu({
    showCopyImageAddress: false,
    showSaveImageAs: false,
    showInspectElement: isDev
  })
}

// Do the initialization.
init()

// Module object.
module.exports = {
  about,
  editBookmark,
  addBookmark,
  preferences,
  errorMultiInstance,
  uncaughtException,
  confirmExit,
  brokenUpdates,
  missingRclone,
  notification
}
