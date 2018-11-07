'use strict'

const { app } = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * Path to settings.json file
 * @private
 */
const settingsFile = path.join(app.getPath('userData'), 'settings.json')

// May be the directory doesn't exists yet.
if (!fs.existsSync(app.getPath('userData'))) {
  fs.mkdirSync(app.getPath('userData'))
}

/**
 * Cache for current settings
 * @private
 */
let cache = {}

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
 * Read settings from file.
 */
const readFile = function () {
  if (fs.existsSync(settingsFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(settingsFile))
    } catch (err) {
      cache = {}
      console.log(err)
    }
  } else {
    cache = {}
  }
}

// Exports.
module.exports = {

  /**
   * Check if setting exists
   * @param {string} item
   * @returns {boolean}
   */
  has: function (item) {
    return cache.hasOwnProperty(item)
  },

  /**
   * Get setting value
   * @param {string} item
   * @param {*} defaultValue
   * @returns {*}
   */
  get: function (item, defaultValue) {
    return this.has(item) ? cache[item] : defaultValue
  },

  /**
   * Set setting value
   * @param {string} item
   * @param {*} newValue
   */
  set: function (item, newValue) {
    cache[item] = newValue
    updateFile()
  },

  /**
   * Remove setting
   * @param {string} item
   */
  delete: function (item) {
    delete cache[item]
    updateFile()
  },

  /**
   * Merge current settings
   * @param {{}} settingsObject
   */
  setFromObject: function (settingsObject) {
    Object.keys(settingsObject).forEach(function (key) {
      cache[key] = settingsObject[key]
    })
    updateFile()
  }

}

// Initialize the cache.
readFile()
