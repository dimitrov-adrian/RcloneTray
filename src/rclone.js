'use strict'

const { exec, execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { app, Notification, shell } = require('electron')
const chokidar = require('chokidar')
const ini = require('ini')
const isDev = require('electron-is-dev')
const settings = require('./settings')
const dialogs = require('./dialogs')

/**
 * Rclone executable filename
 * @private
 */
const RcloneBinaryName = process.platform === 'win32' ? 'rclone.exe' : 'rclone'

/**
 * Bundled Rclone path
 * @private
 */
const RcloneBinaryBundled = path.join(app.getAppPath(), 'rclone', process.platform, RcloneBinaryName)

/**
 * Rclone settings cache
 * @private
 */
const Cache = {
  version: null,
  configFile: '',
  providers: {},
  bookmarks: {}
}

/**
 * @private
 */
const UpdateCallbacksRegistry = []

/**
 * BookmarkProcessManager registry
 * @private
 */
const BookmarkProcessRegistry = {}

/**
 * Automatic Upload for bookmark registry
 * @private
 */
const AutomaticUploadRegistry = {}

/**
 * Enquote command
 * @param {Array} command
 */
const enquoteCommand = function (command) {
  for (let i in command) {
    if (command[i].substr(0, 2) !== '--') {
      command[i] = JSON.stringify(command[i])
    }
  }
  return command
}

/**
 * Execute synchronious Rclone command and return the output
 * @param command
 * @returns {string}
 * @private
 * @throws {err}
 */
const doSyncCommand = function (command) {
  command = prepareRcloneCommand(command)
  command = enquoteCommand(command)
  if (isDev) {
    console.info('Rclone[S]', command)
  }
  return execSync(command.join(' ')).toString()
}

/**
 * Execute async Rclone command
 * @param command
 * @returns {Promise}
 * @private
 */
const doCommand = function (command) {
  return new Promise(function (resolve, reject) {
    command = prepareRcloneCommand(command)
    command = enquoteCommand(command)
    if (isDev) {
      console.info('Rclone[A]', command)
    }
    exec(command.join(' '), function (err, stdout, stderr) {
      if (err) {
        console.error('Rclone', err)
        reject(Error('Rclone command error.'))
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 *
 * @param {*} command
 */
const doCommandInTerminal = function (command) {
  command = enquoteCommand(command)
  command = command.join(' ')

  if (isDev) {
    console.log('Rclone[T]', command)
  }

  if (process.platform === 'darwin') {
    // macOS's Terminal
    command = command.replace(new RegExp('"', 'g'), '\\"')
    spawn('/usr/bin/osascript', ['-e', `tell application "Terminal" to do script "${command}" activate`])
  } else if (process.platform === 'linux') {
    // Linux terminal
    let tempCmdWrapper = path.join(app.getPath('temp'), 'rclonetray-linux-cmd-wrapper.sh')
    const data = new Uint8Array(Buffer.from(command))
    fs.writeFile(tempCmdWrapper, data, function (err) {
      if (err) {
        throw Error('Cannot open terminal')
      } else {
        fs.chmodSync(tempCmdWrapper, 0o755)
        exec(`x-terminal-emulator -e "${tempCmdWrapper}"`)
      }
    })
  } else if (process.platform === 'win32') {
    // Windows cmd
    exec(`start cmd.exe /K "${command}"`)
  }
}

/**
 * Simple process tracker. Used to track the rclone command processes status and output.
 */
class BookmarkProcessManager {
  /**
   * Constructor
   * @param {*} processName
   * @param {*} bookmarkName
   */
  constructor (processName, bookmarkName) {
    this.id = `${bookmarkName}:${processName}`
    this.bookmarkName = bookmarkName
    this.processName = processName
  };

  /**
   * Create new monitored process
   * @param {Array} command
   */
  create (command) {
    if (!command || command.length < 0) {
      throw Error('Broken Rclone command')
    }
    if (this.exists()) {
      console.error(`Trying to create new ${this.processName} over existing for ${this.bookmarkName}.`)
      throw Error('There is already such process.')
    }
    let id = this.id
    let bookmark = getBookmark(this.bookmarkName)

    command = prepareRcloneCommand(command)
    command = appendCustomRcloneCommandArgs(command, this.bookmarkName)

    BookmarkProcessRegistry[id] = {
      bookmarkName: this.bookmarkName,
      processName: this.processName,
      process: spawn(command[0], command.slice(1)),
      data: {
        OK: false
      }
    }

    if (isDev) {
      console.log('Rclone[BP]', command)
    }

    BookmarkProcessRegistry[id].process.stderr.on('data', this.rcloneProcessWatchdog.bind(this, bookmark))

    BookmarkProcessRegistry[id].process.on('close', function () {
      if (BookmarkProcessRegistry[id].data.OK) {
        if (BookmarkProcessRegistry[id].processName === 'download') {
          (new Notification({
            body: `Download on ${BookmarkProcessRegistry[id].bookmarkName} process finished`
          })).show()
        } else if (BookmarkProcessRegistry[id].processName === 'upload') {
          (new Notification({
            body: `Upload process on ${BookmarkProcessRegistry[id].bookmarkName} finished`
          })).show()
        } else if (BookmarkProcessRegistry[id].processName === 'mount') {
          (new Notification({
            body: `Unmounted ${BookmarkProcessRegistry[id].bookmarkName}`
          })).show()
        } else if (BookmarkProcessRegistry[id].processName.match(/^serve_/)) {
          let servingProtocolName = getServingProtocols()[BookmarkProcessRegistry[id].data.protocol];
          (new Notification({
            body: `Stopped serving ${BookmarkProcessRegistry[id].bookmarkName} via ${servingProtocolName}`
          })).show()
        }
      }
      delete BookmarkProcessRegistry[id]
      fireRcloneUpdateActions()
    })
  }

  /**
   * Set meta data
   * @param {string} key
   * @param {*} value
   */
  set (key, value) {
    if (this.exists()) {
      BookmarkProcessRegistry[this.id].data[key] = value
      return true
    } else {
      return false
    }
  }

  /**
   * Get meta data
   * @param {*} key
   * @returns {*}
   */
  get (key) {
    return BookmarkProcessRegistry[this.id].data[key]
  }

  /**
   * Check if process is existing and running
   * @returns bool
   */
  exists () {
    return BookmarkProcessRegistry.hasOwnProperty(this.id)
  }

  /**
   * Kill the process wit signal
   * @param {string} signal
   */
  kill (signal) {
    if (this.exists()) {
      BookmarkProcessRegistry[this.id].process.kill(signal || 'SIGTERM')
    } else {
      throw Error('No such process')
    }
  }

  /**
   * Kill all processes for given bookmark
   * @param {string} bookmarkName
   * @param {string} signal
   */
  static killAll (bookmarkName, signal) {
    Object.values(BookmarkProcessRegistry).forEach(function (item) {
      if (item.bookmarkName === bookmarkName) {
        item.process.kill(signal || 'SIGTERM')
      }
    })
  }

  /**
   * Get count of active processes
   * @returns {Number}
   */
  static getActiveProcessesCount () {
    return Object.values(BookmarkProcessRegistry).length
  }

  /**
   * Process rclone output line and do action
   * @param {string} logLine
   * @param {{}} bookmark
   * @param {BookmarkProcessManager} bookmarkProcess
   */
  rcloneProcessWatchdogLine (logLine, bookmark, bookmarkProcess) {
    // Prepare lineInfo{time,level,message}
    let lineInfo = {}

    // Time is Y/m/d H:i:s
    lineInfo.time = logLine.substr(0, 19)

    // Level could be ERROR, NOTICE, INFO or DEBUG.
    logLine = logLine.substr(19).trim().split(':')
    lineInfo.level = (logLine[0] || '').toString().toUpperCase().trim()

    if (['ERROR', 'NOTICE', 'INFO', 'DEBUG'].indexOf(lineInfo.level) === -1) {
      lineInfo.level = 'DEBUG'
      lineInfo.message = logLine.join(':').trim()
    } else {
      // String message
      lineInfo.message = logLine.slice(1).join(':').trim()
    }

    // Starts the line watchdog.
    if (lineInfo.message.match(/(Error while Logging.*)/)) {
      (new Notification({
        body: lineInfo.message
      })).show()
      bookmarkProcess.kill()
      fireRcloneUpdateActions()
      return
    }

    if (lineInfo.message.match(/(Error while Dialing|Failed to)/i)) {
      (new Notification({
        body: lineInfo.message
      })).show()
      bookmarkProcess.kill()
      fireRcloneUpdateActions()
      return
    }

    if (lineInfo.message.match('Mounting on "')) {
      (new Notification({
        body: `Mounted ${bookmark.$name}`
      })).show()
      fireRcloneUpdateActions()
      bookmarkProcess.set('OK', true)
      return
    }

    if (lineInfo.message.match('finishing with parameters')) {
      fireRcloneUpdateActions()
    }

    let addressInUse = lineInfo.message.match(/Opening listener.*address already in use/)
    if (addressInUse) {
      (new Notification({
        body: addressInUse[0]
      })).show()
      bookmarkProcess.kill()
      fireRcloneUpdateActions()
      return
    }

    let matchingString = lineInfo.message.match(/(Serving on|Server started on|Server listening on|Serving restic REST API on)\s*(.*)$/)
    if (matchingString && matchingString[2]) {
      (new Notification({
        body: matchingString[0]
      })).show()
      bookmarkProcess.set('OK', true)
      bookmarkProcess.set('URI', matchingString[2])
      fireRcloneUpdateActions()
      return
    }

    if (lineInfo.message.match(/Fatal Error/i)) {
      (new Notification({
        body: lineInfo.message
      })).show()
      bookmarkProcess.kill()
      fireRcloneUpdateActions()
      return
    }

    if (lineInfo.level === 'couldn\'t connect ') {
      (new Notification({
        body: lineInfo.message
      })).show()
      bookmarkProcess.kill()
      fireRcloneUpdateActions()
      return
    }

    if (isDev) {
      console.log('Rclone Watchdog', lineInfo)
    }
  }

  /**
   * Helper function that split stream to lines and send to rcloneProcessWatchdogLine for processing
   * @param {{}} bookmark
   * @param {{}} data
   */
  rcloneProcessWatchdog (bookmark, data) {
    // https://stackoverflow.com/a/30136877
    let acc = ''
    let splitted = data.toString().split(/\r?\n/)
    let inTactLines = splitted.slice(0, splitted.length - 1)
    // if there was a partial, unended line in the previous dump, it is completed by the first section.
    inTactLines[0] = acc + inTactLines[0]
    // if there is a partial, unended line in this dump,
    // store it to be completed by the next (we assume there will be a terminating newline at some point.
    // This is, generally, a safe assumption.)
    acc = splitted[splitted.length - 1]
    for (var i = 0; i < inTactLines.length; ++i) {
      this.rcloneProcessWatchdogLine(inTactLines[i].trim(), bookmark, this)
    }
  }
}

/**
 * Get current config file location
 * @returns {string}
 */
const getConfigFile = function () {
  return Cache.configFile
}

/**
 * Prepare array to Rclone command, rclone binary should be ommited
 * @param {array} command
 * @returns {string|array}
 * @private
 */
const prepareRcloneCommand = function (command) {
  let config = getConfigFile()
  if (config) {
    command.unshift('--config', config)
  }

  if (settings.get('rclone_use_bundled', true)) {
    command.unshift(RcloneBinaryBundled)
  } else {
    command.unshift(RcloneBinaryName)
  }

  return command
}

/**
 * Append custom rclone args to command array
 * @param {Array} commandArray
 * @param {string} bookmarkName
 * @returns {Array}
 */
const appendCustomRcloneCommandArgs = function (commandArray, bookmarkName) {
  let argsSplitterPattern = new RegExp(/\n+/)

  let customGlobalArgs = settings.get('custom_args').trim().split(argsSplitterPattern)
  customGlobalArgs = customGlobalArgs.filter(function (element) {
    if (element.match(/^-v+\b/)) {
      return false
    }
  })
  commandArray = commandArray.concat(customGlobalArgs)

  if (bookmarkName) {
    let customBookmarkArgs = settings.get(`custom_args:${bookmarkName}`, '').trim().split(argsSplitterPattern)
    customBookmarkArgs = customBookmarkArgs.filter(function (element) {
      if (element.match(/^-v+\b/)) {
        return false
      }
    })
    commandArray = commandArray.concat(customBookmarkArgs)
  }

  return commandArray.filter(function (element) {
    return !!element.trim()
  })
}

/**
 * Update version cache
 * @private
 */
const updateVersionCache = function () {
  let output = doSyncCommand(['version'])
  let version = output.trim().split(/\r?\n/).shift().split(' ').pop() || 'Unknown'
  if (Cache.version && Cache.version !== version) {
    // rclone binary is upgraded
  }
  Cache.version = version
}

/**
 * Update bookmarks cache
 * @private
 */
const updateBookmarksCache = function () {
  doCommand(['config', 'dump'])
    .then(function (bookmarks) {
      try {
        bookmarks = JSON.parse(bookmarks)

        // Add virtual $name representing the bookmark name from index.
        Object.keys(bookmarks).map(function (key) {
          bookmarks[key].$name = key
          bookmarks[key].$externals = {
            custom_args: settings.get(`custom_args:${key}`)
          }
        })
      } catch (err) {
        throw Error('Problem reading bookmarks list.')
      }
      Cache.bookmarks = bookmarks
      fireRcloneUpdateActions()
    })
}

/**
 * Update providers cache, add $type options objects
 * @private
 */
const updateProvidersCache = function () {
  doCommand(['config', 'providers'])
    .then(function (providers) {
      try {
        providers = JSON.parse(providers)
      } catch (err) {
        throw Error('Cannot read providers list.')
      }

      Cache.providers = {}
      providers.forEach(function (provider) {
        provider.Options.map(function (optionDefinition) {
          optionDefinition.$type = 'string'
          if (optionDefinition.Default === true || optionDefinition.Default === false) {
            optionDefinition.$type = 'bool'
          } else if (!isNaN(parseFloat(optionDefinition.Default)) && isFinite(optionDefinition.Default)) {
            optionDefinition.$type = 'number'
          } else if (optionDefinition.IsPassword) {
            optionDefinition.$type = 'password'
          } else {
            optionDefinition.$type = 'string'
          }
          return optionDefinition
        })
        Cache.providers[provider.Prefix] = provider
      })

      fireRcloneUpdateActions()
    })
}

/**
 * Update existing bookmark's fields (rclone remote optons)
 * @param {string} bookmarkName
 * @param {{}} providerObject
 * @param {{}} values
 * @throws {Error}
 */
const updateBookmarkFields = function (bookmarkName, providerObject, values) {
  const reserved = [{
    'Name': '_local_path_map',
    'Required': false
  }]

  let valuesPlain = {}

  reserved.concat(providerObject.Options).forEach(function (optionDefinition) {
    if (optionDefinition.$type === 'password') {
      if (optionDefinition.Name in values) {
        doSyncCommand(['config', 'password', bookmarkName, optionDefinition.Name, values[optionDefinition.Name]])
      }
    } else {
      // Sanitize booleans.
      if (optionDefinition.$type === 'bool') {
        if (optionDefinition.Name in values && ['true', 'yes', true, 1].indexOf(values[optionDefinition.Name]) > -1) {
          values[optionDefinition.Name] = 'true'
        } else {
          values[optionDefinition.Name] = 'false'
        }
      }
      valuesPlain[optionDefinition.Name] = values[optionDefinition.Name]
    }
  })

  try {
    let configIniStruct = ini.decode(fs.readFileSync(getConfigFile()).toString())
    configIniStruct[bookmarkName] = Object.assign(configIniStruct[bookmarkName], valuesPlain)
    fs.writeFileSync(getConfigFile(), ini.encode(configIniStruct, {
      whitespace: true
    }))
  } catch (err) {
    console.error(err)
    throw Error('Cannot update bookmark fields.')
  }
  console.log('Rclone', 'Updated bookmark', bookmarkName)
}

/**
 * Trigger for register update cache listeners
 * @param eventName
 * @private
 */
const fireRcloneUpdateActions = function (eventName) {
  UpdateCallbacksRegistry.forEach(function (callback) {
    callback(eventName)
  })
}

/**
 * Perform Rclone sync command, this function is used as shared for Download and Upload tasks
 * @private
 * @param {string} method
 * @param {{}} bookmark
 * @throws {Error}
 */
const _sync = function (method, bookmark) {
  if (method !== 'upload' && method !== 'download') {
    throw Error(`Unsupported sync way ${method}`)
  }

  let cmd = ['sync']
  if (method === 'upload') {
    cmd.push(bookmark._local_path_map, bookmark.$name + ':')
  } else {
    cmd.push(bookmark._local_path_map, bookmark.$name + ':')
  }
  cmd.push('-vv')

  if ('_local_path_map' in bookmark && bookmark._local_path_map) {
    // Check if source directory is empty because this could damage remote one.
    if (method === 'upload') {
      if (!fs.readdirSync(bookmark._local_path_map).length) {
        throw Error('Cannot upload empty directory.')
      }
    }

    let oppositeMethod = method === 'download' ? 'upload' : 'download'

    if ((new BookmarkProcessManager(oppositeMethod, bookmark.$name)).exists()) {
      throw Error(`Cannot perform downloading and uploading in same time.`)
    }

    let proc = new BookmarkProcessManager(method, bookmark.$name)
    proc.create(cmd)
    fireRcloneUpdateActions()
  } else {
    console.error('SYNC', 'Local Path Map is not set for this bookmark', bookmark)
    throw Error('Local Path Map is not set for this bookmark')
  }
}

/**
 * Get bookmark
 * @param {{}|string} bookmark
 * @returns {{}}
 * @throws {Error}
 */
const getBookmark = function (bookmark) {
  if (typeof bookmark === 'object') {
    if ('$name' in bookmark && 'type' in bookmark) {
      return bookmark
    } else {
      throw Error(`Invalid bookmark object argument.`)
    }
  } else if (bookmark in Cache.bookmarks) {
    return Cache.bookmarks[bookmark]
  } else {
    throw Error(`No such bookmark ${bookmark}`)
  }
}

/**
 * Add callback to execute when Rclone config is changed.
 * @param callback
 */
const onUpdate = function (callback) {
  UpdateCallbacksRegistry.push(callback)
}

/**
 * Get available providers
 * @returns {Cache.providers|{}}
 */
const getProviders = function () {
  return Cache.providers
}

/**
 * Get specific provider
 * @param providerName
 * @returns {{}}
 * @throws {Error}
 */
const getProvider = function (providerName) {
  if (Cache.providers.hasOwnProperty(providerName)) {
    return Cache.providers[providerName]
  } else {
    throw Error(`No such provider ${providerName}`)
  }
}

/**
 * Get bookmarks
 * @returns {Cache.bookmarks}
 */
const getBookmarks = function () {
  return Cache.bookmarks
}

/**
 * Create new bookmark
 * @param {string} type
 * @param {string} bookmarkName
 * @param {{}} options
 * @returns {Promise}
 */
const addBookmark = function (type, bookmarkName, values, customArgs) {
  // Will throw an error if no such provider exists.
  let providerObject = this.getProvider(type)
  let configFile = this.getConfigFile()

  return new Promise(function (resolve, reject) {
    if (!bookmarkName.match(/^([a-zA-Z0-9\-_]{1,32})$/)) {
      reject(Error(`Invalid name.\nName should be 1-32 chars long, and should contain only letters, gidits - and _`))
      return
    }

    if (Cache.bookmarks.hasOwnProperty(bookmarkName)) {
      reject(Error(`There "${bookmarkName}" bookmark already`))
      return
    }
    try {
      let iniBlock = `\n[${bookmarkName}]\nconfig_automatic = no\ntype = ${type}\n`
      fs.appendFileSync(configFile, iniBlock)
      console.log('Rclone', 'Writing new block to config file')
      try {
        updateBookmarkFields(bookmarkName, providerObject, values)

        // Set custom args.
        settings.set(`custom_args:${bookmarkName}`, customArgs || '')

        // Done.
      } catch (err) {
        console.error('Rclone', 'Reverting because of error', err)
        doCommand(['config', 'delete', bookmarkName])
          .then(function () {
            reject(Error('Cannot write bookmark options to config.'));
            (new Notification({
              body: `Bookmark ${bookmarkName} is created`
            })).show()
            resolve()
          })
          .catch(reject)
      }
    } catch (err) {
      console.error(err)
      reject(Error('Cannot create new bookmark'))
    }
  })
}
/**
 * Update existing bookmark
 * @param {{}|string} bookmark
 * @param {{}} values
 * @param {string} customArgs
 * @returns {Promise}
 */
const updateBookmark = function (bookmark, values, customArgs) {
  bookmark = this.getBookmark(bookmark)
  let providerObject = this.getProvider(bookmark.type)
  return new Promise(function (resolve, reject) {
    try {
      updateBookmarkFields(bookmark.$name, providerObject, values)

      // Set custom args.
      settings.set(`custom_args:${bookmark.$name}`, customArgs || '');
      (new Notification({
        body: `Bookmark ${bookmark.$name} is updated.`
      })).show()
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}
/**
 * Delete existing bookmark
 * @param {{}|string} bookmark
 * @returns {Promise}
 */
const deleteBookmark = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  return new Promise(function (resolve, reject) {
    doCommand(['config', 'delete', bookmark.$name])
      .then(function () {
        BookmarkProcessManager.killAll(bookmark.$name);
        (new Notification({
          body: `Bookmark ${bookmark.$name} is deleted.`
        })).show()

        // Delete custom args.
        settings.delete(`custom_args:${bookmark.$name}`)

        resolve()
      })
      .catch(reject)
  })
}

/**
 * Get (generate) path to bookmark mountpoint
 * @param {{}|string} bookmark
 * @returns {String}
 */
const getMountpointVolumePath = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  return path.join('/', 'Volumes', `${bookmark.type}.${bookmark.$name}`)
}

/**
 * Mount given bookmark
 * @param {{}|string} bookmark
 */
const mount = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  let proc = new BookmarkProcessManager('mount', bookmark.$name)

  if (proc.exists()) {
    throw Error(`Bookmark ${bookmark.$name} already mounted.`)
  }
  let mountpoint = this.getMountpointVolumePath(bookmark)

  proc.create([
    'mount',
    bookmark.$name + ':',
    mountpoint,
    '--attr-timeout', '3s',
    '--dir-cache-time', '3s',
    '--allow-non-empty',
    '--volname', bookmark.$name,
    '-vv'
  ])

  fireRcloneUpdateActions()
}

/**
 * Unmount given bookmark (if it's mounted)
 * @param {{}|string} bookmark
 */
const unmount = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  let mountStatus = this.mountStatus(bookmark)
  if (mountStatus !== false) {
    let proc = new BookmarkProcessManager('mount', bookmark.$name)
    if (proc.exists()) {
      proc.kill('SIGTERM')
    } else {
      if (process.platform === 'darwin') {
        exec(`umount -f "${mountStatus}"`, fireRcloneUpdateActions)
      } else if (process.platform === 'linux') {
        exec(`umount "${mountStatus}"`, fireRcloneUpdateActions)
      }
    }
  }
}

/**
 * Check is given bookmark is mounted
 * @param {{}|string} bookmark
 * @returns {false|string Mountpoint}
 */
const mountStatus = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  let proc = new BookmarkProcessManager('mount', bookmark.$name)
  let exists = proc.exists()
  let mountpoint = this.getMountpointVolumePath(bookmark)
  let mountpointExists = fs.existsSync(mountpoint)
  if (exists && mountpointExists) {
    return mountpoint
  } else if (mountpointExists) {
    return mountpoint
  } else if (exists) {
    return ''
  } else {
    return false
  }
}

/**
 * Open mounted directory bookmark in platform's file browser
 * @param {{}|string} bookmark
 */
const openMounted = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  if (this.mountStatus(bookmark) !== false) {
    return shell.openExternal('file://' + this.getMountpointVolumePath(bookmark))
  } else {
    return false
  }
}

/**
 * Perform download task
 * @see _sync()
 * @param {{}|string} bookmark
 */
const download = function (bookmark) {
  _sync('download', this.getBookmark(bookmark))
}

/**
 * Perform upload task
 * @see _sync()
 * @param {{}|string} bookmark
 */
const upload = function (bookmark) {
  _sync('upload', this.getBookmark(bookmark))
}

/**
 * Check if current is uploading
 * @param {{}|string} bookmark
 * @returns {boolean}
 */
const isUploading = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  return (new BookmarkProcessManager('upload', bookmark.$name)).exists()
}

/**
 * Check if current is downloading
 * @param {{}|string} bookmark
 * @returns {boolean}
 */
const isDownloading = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  return (new BookmarkProcessManager('download', bookmark.$name)).exists()
}

/**
 * Stop currently running downloading process
 * @param {{}|string} bookmark
 */
const stopDownloading = function (bookmark) {
  bookmark = this.getBookmark(bookmark);
  (new BookmarkProcessManager('download', bookmark.$name)).kill('SIGTERM')
}

/**
 * Stop currently running uploading process
 * @param {{}|string} bookmark
 */
const stopUploading = function (bookmark) {
  bookmark = this.getBookmark(bookmark);
  (new BookmarkProcessManager('upload', bookmark.$name)).kill('SIGTERM')
}

/**
 *
 * @param {*} bookmark
 */
const isAutomaticUpload = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  return !!AutomaticUploadRegistry.hasOwnProperty(bookmark.$name)
}

/**
 *
 * @param {*} bookmark
 */
const toggleAutomaticUpload = function (bookmark) {
  bookmark = this.getBookmark(bookmark)

  if (AutomaticUploadRegistry.hasOwnProperty(bookmark.$name)) {
    AutomaticUploadRegistry[bookmark.$name].watcher.unwatch()
    delete AutomaticUploadRegistry[bookmark.$name]
  } else if ('_local_path_map' in bookmark && bookmark._local_path_map) {
    // Set the registry.
    AutomaticUploadRegistry[bookmark.$name] = {
      watcher: null,
      timer: null
    }

    AutomaticUploadRegistry[bookmark.$name].watcher = chokidar.watch(bookmark._local_path_map, {
      ignoreInitial: true,
      disableGlobbing: true,
      usePolling: false,
      useFsEvents: true,
      persistent: true,
      alwaysStat: true,
      atomic: true
    })

    AutomaticUploadRegistry[bookmark.$name].watcher.on('raw', function () {
      if (AutomaticUploadRegistry[bookmark.$name].timer) {
        clearTimeout(AutomaticUploadRegistry[bookmark.$name].timer)
      }
      AutomaticUploadRegistry[bookmark.$name].timer = setTimeout(function () {
        _sync('upload', bookmark)
      }, 3000)
    })
  }

  fireRcloneUpdateActions()
}

/**
 * Open local path mapping
 * @param {{}|string} bookmark
 */
const openLocal = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  if ('_local_path_map' in bookmark) {
    if (fs.existsSync(bookmark._local_path_map)) {
      return shell.openExternal(`file://${bookmark._local_path_map}`)
    } else {
      console.error('Rclone', 'Local path does not exists.', bookmark._local_path_map, bookmark.$name)
      throw Error(`Local path ${bookmark._local_path_map} does not exists`)
    }
  } else {
    return false
  }
}

/**
 * Get available serving protocols
 * @returns {{}}
 */
const getServingProtocols = function () {
  return {
    http: 'HTTP',
    ftp: 'FTP',
    webdav: 'WebDAV',
    restic: 'Restic'
  }
}

/**
 * Start serving protocol+bookmark
 * @param {string} protocol
 * @param {{}|string} bookmark
 */
const serveStart = function (protocol, bookmark) {
  if (!getServingProtocols().hasOwnProperty(protocol)) {
    throw Error(`Protocol "${protocol}" is not supported`)
  }

  bookmark = this.getBookmark(bookmark)

  let proc = new BookmarkProcessManager(`serve_${protocol}`, bookmark.$name)

  if (proc.exists()) {
    throw Error(`${bookmark.$name} is already serving.`)
  }

  proc.create([
    'serve',
    protocol,
    bookmark.$name + ':',
    '-vv'
  ])
  proc.set('protocol', protocol)
  fireRcloneUpdateActions()
}

/**
 * Stop serving protocol+bookmark
 * @param {string} protocol
 * @param {{}|string} bookmark
 */
const serveStop = function (protocol, bookmark) {
  bookmark = this.getBookmark(bookmark)
  if (this.serveStatus(protocol, bookmark) !== false) {
    let proc = new BookmarkProcessManager(`serve_${protocol}`, bookmark.$name)
    if (proc.exists()) {
      proc.kill()
    }
  }
}

/**
 * Check if current protocol+bookmark is in serving
 * @param {string} protocol
 * @param {{}} bookmark
 * @returns {string|boolean}
 */
const serveStatus = function (protocol, bookmark) {
  bookmark = this.getBookmark(bookmark)
  let proc = new BookmarkProcessManager(`serve_${protocol}`, bookmark.$name)
  if (proc.exists()) {
    return proc.get('URI') || ''
  } else {
    return false
  }
}

/**
 * Open NCDU in platform's terminal emulator
 * @param {{}|string} bookmark
 */
const openNCDU = function (bookmark) {
  bookmark = this.getBookmark(bookmark)
  let command = prepareRcloneCommand(['ncdu', bookmark.$name + ':/'])
  command = appendCustomRcloneCommandArgs(command, bookmark.$name)
  doCommandInTerminal(command)
}

/**
 * Get version of installed Rclone
 * @returns {string}
 */
const getVersion = function () {
  return Cache.version
}

/**
 * Init Rclone
 */
const init = function () {
  // On linux and mac add /usr/local/bin to the $PATH
  if (process.platform === 'linux' || process.platform === 'darwin') {
    process.env.PATH += ':' + path.join('/', 'usr', 'local', 'bin')
  }

  try {
    // Update version cache, it also do the first Rclone existance check
    updateVersionCache()
  } catch (err) {
    // This could happen if something wrong with the system Path variable or installed "unbundled"
    // package, and there is no Rclone installed on current system.
    dialogs.missingRclone()

    // If fails again, then there is really something wrong and will fail in to the uncaughtException handler.
    updateVersionCache()
  }

  // Update config file path cache.
  if (settings.get('rclone_config', '')) {
    Cache.configFile = settings.get('rclone_config', '')
  } else {
    let output = doSyncCommand(['config', 'file'])
    Cache.configFile = output.trim().split(/\r?\n/).pop()
  }

  // While chokidar fails if the watching file is not exists.
  // then need to create empty rclone conf file.
  if (!fs.existsSync(getConfigFile())) {
    fs.appendFileSync(getConfigFile(), '')
  }

  // chokidar seems to be more relyable than fs.watch() and give better results.
  chokidar.watch(getConfigFile(), {
    ignoreInitial: true,
    disableGlobbing: true,
    usePolling: false,
    useFsEvents: true,
    persistent: true,
    alwaysStat: true,
    atomic: true
  })
    .on('change', updateBookmarksCache)

  // Update providers cache.
  updateProvidersCache()

  // Update bookmarks cache.
  updateBookmarksCache()

  // Force killing all processes if the app is going to quit.
  app.on('before-quit', function (event) {
    if (Object.keys(BookmarkProcessRegistry).length < 1) {
      return
    }

    if (!dialogs.confirmExit()) {
      event.preventDefault()
      return
    }

    Object.keys(BookmarkProcessRegistry).map(function (key) {
      BookmarkProcessRegistry[key].process.kill()
    })
  })
}

// Exports.
module.exports = {
  getConfigFile,

  getProviders,
  getProvider,

  getBookmark,
  getBookmarks,
  addBookmark,
  updateBookmark,
  deleteBookmark,

  mount,
  unmount,
  mountStatus,
  openMounted,
  getMountpointVolumePath,

  download,
  stopDownloading,
  isDownloading,

  upload,
  stopUploading,
  isUploading,
  isAutomaticUpload,
  toggleAutomaticUpload,

  openLocal,

  getServingProtocols,
  serveStart,
  serveStop,
  serveStatus,

  openNCDU,

  getVersion,

  onUpdate,

  // Initializing promise.
  init
}
