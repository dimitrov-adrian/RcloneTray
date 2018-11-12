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
 * Cache for current settings
 * @private
 */
const cache = {}

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
  return this.has(item) ? cache[item] : defaultValue
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
 */
const remove = function (item) {
  delete cache[item]
  updateFile()
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
 * Update the settings file.
 */
const updateFile = function () {
  try {
    console.log('Update settings file: ' + settingsFile)
    fs.writeFileSync(settingsFile, JSON.stringify(cache))
  } catch (err) {
    console.error(err)
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
  remove,
  merge
}
