const https = require('https')
const os = require('os')
const fs = require('fs')
const path = require('path')
const dialogs = require('./dialogs')

// @TODO AdmZip seems to be buggy sometimes, may be should found way to deal without it.
const AdmZip = require('adm-zip')

/**
 * Need this variable only to show the progressbar.
 * @private
 */
let dialog

/**
 * Get URL to rclone downloadable for current platform.
 * @returns {string}
 * @private
 */
const getRcloneURL = function () {
  const urlArch = process.arch === 'x64'
    ? 'amd64' : '386'
  const urlOs = process.platform === 'darwin'
    ? 'osx'
    : process.platform === 'win32'
      ? 'windows'
      : process.platform
  return `https://downloads.rclone.org/rclone-current-${urlOs}-${urlArch}.zip`
}

/**
 * Download and install Rclone from url to local path
 * @param {string} url
 * @param {string} temporaryPath
 * @param {string} installationPath
 * @throws {Error}
 */
const installHelper = function (url, temporaryPath, installationPath, callback) {
  console.log('Downloading', url, 'into', temporaryPath)
  let zipFile = fs.createWriteStream(temporaryPath)

  zipFile.on('close', function () {
    console.log('Unpacking...')
    dialog.setInstallProgress(0.9, 'Unpacking...')
    let zip = new AdmZip(temporaryPath)

    let executableEntry = zip.getEntries().find(function (item) {
      return (!item.isDirectory && item.name === path.basename(installationPath))
    })

    if (executableEntry) {
      dialog.setInstallProgress(0.95, 'Preparing executable...')
      let buffer = zip.readFile(executableEntry)
      if (buffer !== null) {
        fs.writeFile(installationPath, buffer, function () {
          if (process.platform === 'linux' || process.platform === 'darwin') {
            fs.chmod(installationPath, 0o755, function () {
              console.log('Adding executable rights')
            })
          }
          dialog.setInstallProgress(1, 'Done.')
          console.log('Extracted Rclone to', installationPath)
          dialog.destroy()
          callback()
        })
      }
    } else {
      throw Error('Cannot found binary in the archive.')
    }
  })

  https.get(url, function (response) {
    // The progress indicator, because first step is 0.1 and extraction is 0.9,
    // then we should progress the download from 0.2 to 0.8
    let len = parseInt(response.headers['content-length'], 10)
    let cur = 0
    response.on('data', function (chunk) {
      cur += chunk.length
      dialog.setInstallProgress(0.1 + parseFloat(((cur / len) * 0.8).toFixed(2)), 'Downloading...')
    })

    if (response.statusCode === 200) {
      response.pipe(zipFile)
    } else {
      throw Error('Cannot download Rclone from rclone.org')
    }
  })
}

// Exports.
module.exports = {

  install: function (installationPath) {
    return new Promise(function (resolve, reject) {
      dialog = dialogs.rcloneInstaller()
      dialog.setInstallProgress(0, 'Starting...')

      if (!fs.existsSync(path.join(process.resourcesPath, 'bin', process.platform))) {
        fs.mkdirSync(path.join(process.resourcesPath, 'bin', process.platform), {
          mode: 0o755,
          recursive: true
        })
      }

      fs.mkdtemp(path.join(os.tmpdir(), 'rclonetray'), function (err, directory) {
        if (err) {
          throw Error('Cannot create temporary directory to download Rclone.')
        }
        let temporaryPath = path.join(directory, 'rclone-latest.zip')
        installHelper(getRcloneURL(), temporaryPath, installationPath, resolve)
      })
    })
  }
}
