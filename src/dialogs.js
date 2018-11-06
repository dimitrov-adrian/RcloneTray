'use strict'

const { shell, app, BrowserWindow } = require('electron')
const path = require('path')

// Enable context menus.
require('electron-context-menu')({
  showCopyImageAddress: false,
  showSaveImageAs: false,
  showInspectElement: false
})

/**
 * Dialog names that should be opened with single instances
 * @type {{}}
 * @private
 */
const dialogsSingletoneInstances = {}

/**
 * Simple factory for the dialogs
 *
 * @param dialogName
 * @param options
 * @param props
 * @returns {*}
 * @private
 */
const createNewDialog = function (dialogName, options, props) {
  let singleId = options && options.hasOwnProperty('singleId')
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
    webPreferences: {
      backgroundThrottling: false,
      preload: path.join(__dirname, 'dialogs-preload.js'),
      devTools: false,
      defaultEncoding: 'UTF-8',
      nodeIntegration: false,
      sandbox: true
    }
  }, options)

  // Instantinate the window.
  let theDialog = new BrowserWindow(options)

  // Disable the menu on windows and linux.
  if (process.platform !== 'darwin') {
    theDialog.setMenu(null)
  }

  // Assign $props that we will use in RenderUtils.getProps() as window properties (params) on load time.
  theDialog.$props = props || {}

  // TODO: this event hapen after window.load event and shod be fixed.
  theDialog.on('ready-to-show', function () {
    this.show()

    // Hide macOS dock icon.
    if (process.platform === 'darwin') {
      app.dock.show()
    }
  })

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

    if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length < 1) {
      app.dock.hide()
    }
  })

  theDialog.webContents.on('new-window', function (event, url) {
    event.preventDefault()
    shell.openExternal(url)
  })

  if (singleId) {
    dialogsSingletoneInstances[singleId] = theDialog
  }

  return theDialog
}

// Module object.
module.exports = {

  /**
   * Show About dialog
   * @returns {*}
   */
  about: function () {
    createNewDialog('About', {
      $singleId: 1,
      title: 'About RcloneTray',
      width: 320,
      height: 296,
      minimizable: false,
      alwaysOnTop: true,
      acceptFirstMouse: true,

      // Make the window sexy.
      vibrancy: 'appearance-based',
      titleBarStyle: 'hiddenInset',
      backgroundColor: null
    })
  },

  /**
   * Show Preferences dialog
   * @returns {*}
   */
  preferences: function () {
    createNewDialog('Preferences', {
      $singleId: 1,
      width: 460,
      height: 296
    })
  },

  /**
   * Show new Bookmark dialog
   * @returns {*}
   */
  addBookmark: function () {
    createNewDialog('AddBookmark', {
      $singleId: 1,
      width: 600,
      height: 460
    })
  },

  /**
   * Show edit Bookmark dialog
   * @returns {*}
   */
  editBookmark: function () {
    createNewDialog('EditBookmark', {
      $singleId: this.$name,
      width: 600,
      height: 460
    }, this)
  }

}
