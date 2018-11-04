'use strict'

// Load the vendor modules.
const { app, dialog } = require('electron')

// Error handler
process.on('uncaughtException', function (error) {
  console.error('ERROR', error)
  if (app.isReady()) {
    // When error happen when app is ready then seems to be happen on late stage,
    // and user should decide to ignore or to exit (because could have active transfers)
    let choice = dialog.showMessageBox(null, {
      type: 'warning',
      buttons: [ 'Quit RcloneTray', 'Ignore' ],
      title: 'Error',
      message: 'Unexpected runtime error.',
      detail: error.toString()
    })
    if (choice === 0) {
      app.exit()
    }
  } else {
    // This message will be shown on very early stage before most of the app is loaded.
    dialog.showErrorBox('Error', 'Unexpected runtime error. RcloneTray cannot starts.')
    app.exit()
  }
})

// Do not allow multiple instances.
if (!app.requestSingleInstanceLock()) {
  console.error('Cannot start twice.')
  dialog.showErrorBox('Cannot start', 'RcloneTray is already started and cannot be started twice.')
  app.exit()
}

// Load app modules
const tray = require('./tray')
const appMenu = require('./app-menu')

// Starts remote debugging on port, BUT IF the app is not packaged (devel mode)
if (process.argv.indexOf('--debug') !== -1 || !app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9229')
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  // Initialize the tray indicator.
  tray.init()

  // Initialize app menu.
  appMenu.init()

  // Only on macOS there is app.dock.
  if (process.platform === 'darwin') {
    // Hide the app from dock and taskbar.
    app.dock.hide()
  }
})

// Should not quit when all windows are closed, because have a tray indicator.
app.on('window-all-closed', function (event) {
  event.preventDefault()
})
