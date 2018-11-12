'use strict'

// Workaround because some of the modules that are intended to works in renderer,
// exports modules via module.exports
window.module = {}

const remote = require('electron').remote
const remoteElectron = remote.require('electron')
const appPath = remote.app.getAppPath()

window.$main = {
  platform: process.platform,
  currentWindow: remote.getCurrentWindow(),
  app: remote.app,
  tray: remote.require('./tray'),
  rclone: remote.require('./rclone'),
  settings: remote.require('./settings')
}

window.$main.r = remote // @TODO remove before release
window.$main.re = remoteElectron // @TODO remove before release

/**
 * Set autostart
 */
window.$main.setAutostart = function (state) {
  remoteElectron.app.setLoginItemSettings({
    openAtLogin: !!state
  })
}

/**
 * Check if the app is set to autostart
 * @returns {boolean}
 */
window.$main.isAutostart = function () {
  return remoteElectron.app.getLoginItemSettings().openAtLogin
}

/**
 * Popup context menu from given template
 * @param {Array}
 */
window.popupContextMenu = function (menuTemplate) {
  remote.Menu.buildFromTemplate(menuTemplate).popup()
}

/**
 * Get assigned window props
 * @returns {{}}
 */
window.$main.getProps = function () {
  return remote.getCurrentWindow().$props
}

/**
 * Show node's message box
 * @param {string} message
 * @returns {number}
 */
window.messageBox = function (message) {
  return remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      message: message
    })
}

/**
 * Override the standard confirm dialog
 * @param {string} message
 * @returns {boolean}
 */
window.confirm = function (message) {
  let choice = remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      buttons: ['No', 'Yes'],
      message: message
    })
  return choice === 1
}

/**
 * Show error box
 * @param {string} message
 */
window.errorBox = function (message) {
  remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      message: message.toString()
    })
}

/**
 * Show OS notification shorthand
 * @param {string} message
 */
window.notification = function (message) {
  new remoteElectron.Notification({
    body: message.toString()
  }).show()
}

/**
 * Resize current window to conent
 */
window.resizeToContent = function () {
  if (typeof screen !== 'undefined') {
    let h = document.body.offsetHeight + (window.outerHeight - window.innerHeight)
    if (h > window.screen.height * 0.8) {
      h = Math.ceil(window.screen.height * 0.8)
      document.body.style.overflow = 'auto'
    } else {
      document.body.style.overflow = 'hidden'
    }
    remote.getCurrentWindow()
      .setSize(window.outerWidth, h, false)
  }
}
window.addEventListener('load', window.resizeToContent)

/**
 * Directory selector dialog
 * @param {string} defaultDirectory
 * @param {callback} callback
 */
window.selectDirectory = function (defaultDirectory, callback) {
  remoteElectron.dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select Directory',
    defaultPath: defaultDirectory || remote.app.getPath('home'),
    properties: [
      'openDirectory',
      'createDirectory'
    ]
  }, callback)
}

/**
 * File selector dialog
 * @param {string} defaultFile
 * @param {callback} callback
 */
window.selectFile = function (defaultFile, callback) {
  remoteElectron.dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select File',
    defaultPath: defaultFile || remote.app.getPath('home'),
    properties: [
      'openFile',
      'showHiddenFiles'
    ]
  }, callback)
}

/**
 * Scripts loader
 * @param {string} script
 */
window.$main.require = function (script) {
  if (script === 'ui') {
    document.write('<link rel="stylesheet" href="' + appPath + '/src/ui/styles/ui.css" />')
    document.write('<link rel="stylesheet" href="' + appPath + '/src/ui/styles/ui-' + process.platform + '.css" />')
  } else {
    // remote.getCurrentWebContents().executeJavaScript(fs.readFileSync(appPath + '/' + item, 'utf-8'))
    document.write('<script src="' + appPath + '/' + script + '"></script>')
  }
}
