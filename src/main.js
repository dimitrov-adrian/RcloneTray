'use strict'

const { app, dialog } = require('electron')
const path = require('path')

// let x = require('child_process').spawn('"rclone"', [ '--config',
//   '"/Users/e01/.config/rclone/rclone.conf"',
//   '"mount"',
//   '"ftp_scifi_bg:"',
//   '"/Volumes/ftp.ftp_scifi_bg"',
//   '--attr-timeout',
//   '"3s"',
//   '--dir-cache-time',
//   '"3s"',
//   '--allow-non-empty',
//   '--volname',
//   '"ftp_scifi_bg"',
//   '"-vv"' ])
// console.log(x)
// app.exit()

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

process.isDebug = (process.argv.indexOf('--debug') !== -1)
// Starts remote debugging on port, BUT IF the app is not packaged (devel mode)
if (process.isDebug) {
  // Export interact from console
  require('inspector').open()
  global.$main = {
    app: app,
    __dirname: __dirname,
    require: require
  }
  // load electron-reload
  require('electron-reload')(__dirname, {
    electron: require('path').join(__dirname, '..', 'node_modules', '.bin', 'electron')
  })
}

// Adds Resources/bin/<platform> PATH variable to system PATH
let localBinPath = path.join(process.resourcesPath, 'bin', process.platform)
if (process.platform === 'linux' || process.platform === 'darwin') {
  process.env.PATH = process.env.PATH + ':' + path.join('/', 'usr', 'local', 'bin')
  process.env.PATH = process.env.PATH + ':' + localBinPath
} else if (process.platform === 'win32') {
  process.env.Path = process.env.Path + ';' + localBinPath
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  // Initialize app menu.
  require('./app-menu')

  // Initialize the tray indicator.
  require('./tray').init()

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
