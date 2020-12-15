import { spawn, spawnSync } from 'child_process'
import chokidar from 'chokidar'
import fs from 'fs'
import fetch from 'node-fetch'
import os from 'os'
import path from 'path'
import semver from 'semver'
import { default as bindings, default as events } from './bindings.js'
import config from './config.js'
import { getEmptyDirectory } from './utils/empty-dir.js'
import getResourcePath from './utils/get-resource-path.js'
import randomPort from './utils/random-port.js'

const isDev = process.env.ENV === 'dev'

export const RCLONE_MIN_VERSION = '1.51.0'

// Define unsupported provider types
const UNSUPPORTED_PROVIDERS = ['memory', 'local', 'http', 'cache', 'union', 'crypt']

// Define providers that require buckets and cannot works with root.
const BUCKET_REQUIRED_PROVIDERS = ['b2', 'swift', 's3', 'gsc', 'hubic']

// Instance holder
/** @type {{ server: String, connected: Boolean }} */
const connectionState = {
    server: '',
    connected: false,
}

export function validateBookmarkName(name) {
    return !/[^0-9a-z_-]/i.test(name)
}

/**
 * Run command in OS terminal application
 * @param {Array} command
 */
export function doCommandInTerminal(command) {
    const enquotedCommand = command.map((o) => (o.substr(0, 2) !== '--' ? JSON.stringify(o) : o))

    if (process.platform === 'darwin') {
        spawn('/usr/bin/osascript', [
            '-e',
            `tell application "Terminal" to do script "${enquotedCommand.join(' ').replace(/\"/g, '\\"')}" activate`,
        ])
    } else if (process.platform === 'linux') {
        spawn('x-terminal-emulator', ['-e', ...enquotedCommand])
    } else if (process.platform === 'win32') {
        spawn('start', ['cmd.exe', '/K', `"${enquotedCommand.join(' ')}"`])
    }
}

export function openNCDU(name) {
    return doCommandInTerminal([getRcloneBin(), ...getRcloneDefaultArgs(), 'ncdu', getRemoteFs(name)], true)
}

export function getRcloneVersion() {
    const result = spawnSync(getRcloneBin(), ['version'])
    return semver.clean(result.output.toString().trim().split(/\r?\n/).shift().split(/\s+/).pop())
}

export async function startDaemon() {
    const version = getRcloneVersion()
    if (semver.gte(RCLONE_MIN_VERSION, version)) {
        throw Error(
            `Unsupported version, required version of Rclone is >= ${RCLONE_MIN_VERSION}, but you have ${version}`
        )
    }

    const port = process.env.RCLONE_PORT ? process.env.RCLONE_PORT : await randomPort()
    if (!port) {
        throw Error('Cannot run rclone daemon')
    }

    connectionState.server = '127.0.0.1:' + port

    const args = [
        ...getRcloneDefaultArgs(),
        'rcd',
        '-vv', // Required verbosity to get acknowledge if something is unmounted
        '--rc-addr=' + connectionState.server,
        '--use-mmap',
        '--rc-no-auth',
    ]

    const proc = spawn(getRcloneBin(), args, {
        detached: false,
        shell: false,
        windowsHide: true,
        stdio: 'pipe',
    })

    proc.once('close', () => {
        if (connectionState.connected) {
            connectionState.connected = false
            bindings.emit('rclone/connection/failed')
        }
    })

    let datanl = ''
    proc.stderr.on('data', function (data) {
        datanl += data.toString()
        var lines = datanl.split('\n')
        for (var i = 0; i < lines.length - 1; i++) {
            var line = lines[i]
            proc.stdout.emit('dataline', line)
        }
        datanl = lines[lines.length - 1]
    })

    proc.stdout.on('dataline', function rcloneDataHandler(data) {
        isDev && console.debug(data)
        if (!connectionState.connected) {
            if (data.indexOf('Fatal error:') !== -1) {
                events.emit('rclone/error', data)
            } else if (data.indexOf(`NOTICE: Serving remote control on`) !== -1) {
                connectionState.connected = true
                bindings.emit('rclone/connection/connected')
            } else if (data.indexOf(`Failed to start remote control:`) !== -1) {
                connectionState.connected = false
                bindings.emit('rclone/connection/failed')
            }
        } else {
            if (data.indexOf(' >Destroy:')) {
                // @todo notify that need update
            }
        }
    })

    return proc
}

export function command(command, payload) {
    if (!connectionState.server) {
        throw Error('Rclone daemon not started')
    }

    return fetch('http://' + connectionState.server + '/' + command, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : '{}',
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                throw Error(data.error)
            }
            bindings.emit('rclone/command/' + command, data)
            return data
        })
        .catch((err) => {
            err.command = command
            bindings.emit('rclone/error', err)
            throw err
        })
}

export function remoteCommand(...args) {
    return command(...args)
}

export function createBookmark(name, type, parameters) {
    return remoteCommand('config/create', {
        name,
        type,
        parameters,
    })
}

export function updateBookmark(name, parameters) {
    return remoteCommand('config/update', {
        name,
        parameters,
        obscure: true,
    })
}

export function deleteBookmark(name) {
    return remoteCommand('config/delete', {
        name,
    })
}

export function getBookmark(name) {
    return remoteCommand('config/get', {
        name,
    })
}

export function getProviders() {
    return remoteCommand('config/providers').then((providers) => {
        return providers.providers.filter((provider) => {
            return UNSUPPORTED_PROVIDERS.indexOf(provider.Prefix) === -1
        })
    })
}

export function getProvider(prefix) {
    return getProviders().then((definition) => definition.find((item) => item.Prefix === prefix))
}

export function getBookmarkConfig(name) {
    return remoteCommand('config/get', { name })
}

export function getBookmarks() {
    return remoteCommand('config/dump').then((bookmarks) => {
        return bookmarks
    })
}

export function push(bookmarkName) {
    const localPath = getBookmarkLocalDirectory(bookmarkName)
    if (!localPath) {
        return Promise.reject(Error(`Local directory not set for ${bookmarkName}`))
    }
    return remoteCommand('sync/sync', {
        srcFs: localPath,
        dstFs: bookmarkName + ':/',
    })
}

export function pull(bookmarkName) {
    const localPath = getBookmarkLocalDirectory(bookmarkName)
    if (!localPath) {
        return Promise.reject(Error(`Local directory not set for ${bookmarkName}`))
    }
    return remoteCommand('sync/sync', {
        dstFs: localPath,
        srcFs: bookmarkName + ':/',
    })
}

export function pushOnChange(bookmarkName) {
    const localPath = getBookmarkLocalDirectory(bookmarkName)
    if (!localPath) {
        return Promise.reject(Error(`Local directory not set for ${bookmarkName}`))
    }
    const watcher = chokidar.watch(localPath, {
        awaitWriteFinish: true,
        ignoreInitial: true,
        ignored: ['.DS_Store', '._*', '*~'],
        disableGlobbing: true,
        usePolling: false,
        useFsEvents: true,
        persistent: true,
        alwaysStat: true,
        atomic: 3000,
    })

    watcher.on('raw', () => {
        remoteCommand('sync/sync', {
            srcFs: localPath,
            dstFs: bookmarkName + ':/',
        })
    })

    push(bookmarkName)

    return () => watcher.close()
}

export function getLS(name) {
    return remoteCommand('operations/ls', {
        remote: name,
    })
}

export function getMounted() {
    return remoteCommand('mount/listmounts')
}

export function unmountAll() {
    return remoteCommand('mount/unmountall')
}

export async function mount(name) {
    const config = await getBookmarkConfig(name)
    if (!config) {
        throw Error('No such bookmark')
    }

    const [mountpoint, cleanMountpoint] = useFreeMountpoint(name)

    try {
        const result = remoteCommand('mount/mount', {
            fs: getRemoteFs(name),
            mountPoint: mountpoint,
            mountType: 'cmount',
            vfsOpt: {
                // CacheMode: 2, // full,
                // Timeout: 10,
                // DirCacheTime: 3,
            },
            mountOpt: {
                VolumeName: name,
            },
        })
        // @TODO clean on exit
        return result
    } catch (error) {
        console.log('Early Clean directory', mountpoint)
        throw error
    }
}

export async function unmount(name) {
    const config = await getBookmarkConfig(name)
    if (!config) {
        throw Error('No such bookmark')
    }

    return remoteCommand('mount/unmount', {
        fs: name + ':/',
        mountPoint: '/Users/e01/Vol1',
        mountType: 'mount',
    })
}

export function isDaemonConnected() {
    return !!connectionState.connected
}

export async function getActiveVfs() {
    // await remoteCommand('vfs/refresh')
    return remoteCommand('vfs/list')
}

function getRcloneBin() {
    const bin = process.platform === 'win32' ? 'rclone.exe' : 'rclone'
    if (config.get('rclone_use_bundled')) {
        return getResourcePath('rclone', bin)
    } else {
        return bin
    }
}

function getRcloneDefaultArgs() {
    const args = ['--auto-confirm']
    const rcloneConfFile = config.get('rclone_config')
    if (rcloneConfFile) {
        args.unshift('--config', rcloneConfFile)
    }
    return args
}

function getRemoteFs(name) {
    return name + ':'
}

function getBookmarkLocalDirectory(bookmarkName) {
    return '/tmp/aaaa'
    // return config.get('bookmarkSettings', {})[bookmarkName]?.localDirectory
}

function useFreeMountpoint(name, i) {
    let mountpoint = ''
    if (process.platform === 'win32') {
        mountpoint = driver.win32GetFreeLetter()
        if (!mountpoint) {
            throw Error('Cannot found free drive letter. All drive slots are used.')
        }
        return mountpoint
    } else if (process.platform === 'linux') {
        mountpoint = path.join(os.homedir(), `mount.${name}.rclone`)
    } else {
        mountpoint = path.join(os.homedir(), `volume.${name}.rclone`)
    }

    if (i) {
        mountpoint += '_' + i
    }

    if (!getEmptyDirectory(mountpoint)) {
        return useFreeMountpoint(name, i ? i + 1 : 1)
    }

    return [
        mountpoint,
        function cleanMountpoint() {
            console.log('Cleaning mountpoint directory', mountpoint)
            if (process.platform === 'win32') {
                return
            }
            if (fs.existsSync(mountpoint)) {
                fs.rmdirSync(mountpoint, {
                    recursive: false,
                })
            }
        },
    ]
}
