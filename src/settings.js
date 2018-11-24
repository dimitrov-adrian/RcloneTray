'use strict'

const path = require('path')
const fs = require('fs')
const { app } = require('electron')

/**
 * Path to settings.json file
 * @private
 */
const settingsFile = path.join(app.getPath('userData'), 'settings.json')

/**
 * Cache for current settings and predefine defaults.
 * @private
 */
const cache = {
  tray_menu_show_type: true,
  rclone_use_bundled: true,
  rclone_config: '',
  custom_args: '',

  rclone_cache_files: 3,
  rclone_cache_directories: 10,
  rclone_sync_enable: true,
  rclone_sync_autoupload_delay: 5,
  rclone_ncdu_enable: true,
  rclone_serving_http_enable: true,
  rclone_serving_ftp_enable: true,
  rclone_serving_restic_enable: false,
  rclone_serving_webdav_enable: false,
  rclone_serving_username: '',
  rclone_serving_password: ''
}

/**
 * Check if setting exists
 * @param {string} item
 * @returns {boolean}
 */
const has = function (item) {
  return cache.hasOwnProperty(item)
}

/**
 * Get setting value
 * @param {string} item
 * @param {*} defaultValue
 * @returns {*}
 */
const get = function (item, defaultValue) {
  return has(item) ? cache[item] : defaultValue
}

/**
 * Set setting value
 * @param {string} item
 * @param {*} newValue
 */
const set = function (item, newValue) {
  cache[item] = newValue
  updateFile()
}

/**
 * Remove setting
 * @param {string} item
 * @returns {boolean}
 */
const remove = function (item) {
  if (has(item)) {
    delete cache[item]
    updateFile()
    return true
  }

  return false
}

/**
 * Merge current settings
 * @param {{}} settingsObject
 */
const merge = function (settings) {
  Object.keys(settings).forEach(function (key) {
    cache[key] = settings[key]
  })
  updateFile()
}

/**
 * Get all settings
 * @returns {{}}
 */
const getAll = function () {
  return cache
}

/**
 * Update the settings file.
 */
const updateFile = function () {
  try {
    console.log('Update settings file: ' + settingsFile)
    let jsonContent = JSON.stringify(cache)
    fs.writeFileSync(settingsFile, jsonContent)
  } catch (err) {
    console.error('Settings', err)
  }
}

/**
 * Read the settings file and init the settings cache.
 */
const readFile = function () {
  // Create the directory if not exists yet.
  if (!fs.existsSync(app.getPath('userData'))) {
    fs.mkdirSync(app.getPath('userData'))
  }

  // Initialize settings cache.
  if (fs.existsSync(settingsFile)) {
    try {
      let settings = JSON.parse(fs.readFileSync(settingsFile))
      Object.keys(settings).forEach(function (key) {
        cache[key] = settings[key]
      })
    } catch (err) {
      console.error('Settings', err)
    }
  }
}

// Read the settings file and init the settings cache.
readFile()

// Exports.
// Because next keywords are very common and delete has an collision,
// should pick more odd names or do some longnames.
module.exports = {
  set,
  get,
  has,
  getAll,
  remove,
  merge
}
