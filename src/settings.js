'use strict'

const { app } = require('electron')
const path = require('path')
const fs = require('fs')

let cache = {}
const settingsFile = path.join(app.getPath('userData'), 'settings.json')

// May be the directory doesn't exists yet.
if (!fs.existsSync(app.getPath('userData'))) {
  fs.mkdirSync(app.getPath('userData'))
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

  has: function (item) {
    return cache.hasOwnProperty(item)
  },

  get: function (item, defaultValue) {
    return this.has(item) ? cache[item] : defaultValue
  },

  set: function (item, newValue) {
    cache[item] = newValue
    updateFile()
  },

  delete: function (item) {
    delete cache[item]
    updateFile()
  },

  setFromObject: function (settingsObject) {
    Object.keys(settingsObject).forEach(function (key) {
      cache[key] = settingsObject[key]
    })
    updateFile()
  }

}

// Initialize the cache.
readFile()
