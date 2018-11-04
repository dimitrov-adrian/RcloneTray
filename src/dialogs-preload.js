'use strict'

window.module = {}

const remote = require('electron').remote
const remoteElectron = remote.require('electron')
const appPath = remote.app.getAppPath()

window.$main = {
  app: remote.app,
  tray: remote.require('./tray'),
  rclone: remote.require('./rclone'),
  settings: remote.require('./settings')
}

window.$main.r = remote
window.$main.re = remoteElectron

/**
 * Popup context menu from given template
 *
 * @param {{Menu}}
 */
window.popupContextMenu = function (menuTemplate) {
  remote.Menu.buildFromTemplate(menuTemplate).popup()
}

/**
 * Get assigned window props
 * @returns {*|{}}
 */
window.$main.getProps = function () {
  return remote.getCurrentWindow().$props
}

/**
 * Show node's message box
 * @param options
 * @returns {number}
 */
window.messageBox = function (message) {
  return remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      title: 'RcloneTray',
      message: message
    })
}

/**
 *
 */
window.confirm = function (message) {
  let choice = remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      buttons: ['No', 'Yes'],
      title: 'RcloneTray',
      message: message
    })
  return choice === 1
}

/**
 * Show error box
 */
window.errorBox = function (message) {
  remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      title: 'RcloneTray',
      message: message.toString()
    })
}

/**
 * Show OS notification shorthand
 * @param message
 * @private
 */
window.notification = function (message) {
  new remoteElectron.Notification({
    title: 'RcloneTray',
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
    }
    remote.getCurrentWindow()
      .setSize(window.outerWidth, h, false)
  }
}
window.addEventListener('load', window.resizeToContent)

/**
 * Directory selector dialog
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
 * Styles loader
 */
window.loadStyles = function () {
  document.write('<link rel="stylesheet" href="' + appPath + '/src/ui/styles/ui.css" />')
  document.write('<link rel="stylesheet" href="' + appPath + '/src/ui/styles/ui-' + process.platform + '.css" />')
}

/**
 * Scripts loader
 */
window.loadScripts = function (scripts) {
  scripts.forEach(function (item) {
    document.write('<script src="' + appPath + '/' + item + '"></script>')
  })
}
