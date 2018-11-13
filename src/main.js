'use strict'

const path = require('path')
const { app } = require('electron')
const { autoUpdater } = require('electron-updater')
const isDev = require('electron-is-dev')
const dialogs = require('./dialogs')
const rclone = require('./rclone')
const tray = require('./tray')

// Error handler
process.on('uncaughtException', function (error) {
  console.error('ERROR', 'Uncaught Exception', error)
  if (dialogs.uncaughtException(error)) {
    app.exit()
  }
})

// Check the OS
if (['win32', 'linux', 'darwin'].indexOf(process.platform) === -1) {
  throw Error('Unsupported platform')
}

// Do not allow multiple instances.
if (!app.requestSingleInstanceLock()) {
  console.log('There is already started RcloneTray instance.')
  app.focus()
  dialogs.errorMultiInstance()
  app.exit()
}

// For debugging purposes.
if (isDev) {
  // Export interact from console
  require('inspector').open()
  global.$main = {
    app: app,
    __dirname: __dirname,
    require: require
  }
  // load electron-reload
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
    })
  } catch (err) { }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  // Initialize the tray.
  tray.init()

  // Initialize Rclone.
  rclone.init()
  rclone.onUpdate(tray.refresh)

  // Only on macOS there is app.dock.
  if (process.platform === 'darwin') {
    // Hide the app from dock and taskbar.
    app.dock.hide()
  }

  // Run the auto-updater.
  autoUpdater.checkForUpdatesAndNotify()
})

// Should not quit when all windows are closed,
// because the application is staying as system tray indicator.
app.on('window-all-closed', function (event) {
  event.preventDefault()
})
