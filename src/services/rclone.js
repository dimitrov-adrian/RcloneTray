import { spawn, spawnSync } from 'node:child_process';
import chokidar from 'chokidar';
import EventEmitter from 'node:events';
import fs from 'node:fs';
import fetch from 'node-fetch';
import os from 'node:os';
import path from 'node:path';
import semver from 'semver';
import config from './config.js';
import { getEmptyDirectory } from '../utils/empty-dir.js';
import getResourcePath from '../utils/get-resource-path.js';
import isPacked from '../utils/is-packaged.js';
import randomPort from '../utils/random-port.js';
import { emitLines } from '../utils/stream-readline.js';
import execInOSTerminal from '../utils/terminal-command.js';
import win32GetFreeLetter from '../utils/win32-get-free-letter.js';

/**
 * @typedef {'string'|'int'|'bool'|'SizeSuffix'|'MultiEncoder'|'Duration'|'CommaSepList'} RcloneProviderOptionType
 *
 * @typedef {{
 *  Value: string|number|boolean|null,
 *  Name?: string,
 *  Help?: string,
 * }} RcloneProviderOptionOptionsItem
 *
 * @typedef {boolean|number|string|null} RcloneProviderOptionValue
 *
 * @typedef {boolean|0|1} RcloneProviderOpttionBool
 *
 * @typedef {{
 *  Type: RcloneProviderOptionType,
 *  Name: string,
 *  Help?: string,
 *  Provider?: string,
 *  Value?: RcloneProviderOptionValue,
 *  ValueStr?: string,
 *  Default?: RcloneProviderOptionValue,
 *  DefaultStr?: string,
 *  Examples?: RcloneProviderOptionOptionsItem[],
 *  ShortOpt?: string,
 *  Hide?: RcloneProviderOpttionBool,
 *  Required?: RcloneProviderOpttionBool,
 *  IsPassword?: RcloneProviderOpttionBool,
 *  NoPrefix?: RcloneProviderOpttionBool,
 *  Advanced?: RcloneProviderOpttionBool,
 * }} RcloneProviderOption
 *
 * @typedef {{
 *   Name: string,
 *   Description: string,
 *   Prefix: string,
 *   Options: RcloneProviderOption[],
 *   CommandHelp: string | null
 * }} RcloneProvider
 */

export const RCLONE_MIN_VERSION = '1.51.0';

// Define unsupported provider types
const UNSUPPORTED_PROVIDERS = ['memory', 'local', 'http', 'compress', 'cache', 'union', 'chunker'];

// Define providers that require buckets and cannot works with root.
const BUCKET_REQUIRED_PROVIDERS = ['b2', 'swift', 's3', 'gsc', 'hubic'];

const rcloneBinaryBundled = getResourcePath(
    'vendor',
    'rclone',
    process.platform === 'win32' ? 'rclone.exe' : 'rclone.' + process.platform
);
const rcloneBinarySystem = process.platform === 'win32' ? 'rclone.exe' : 'rclone';
const rcloneBinary = config.get('use_system_rclone') ? rcloneBinarySystem : rcloneBinaryBundled;

const eventEmitter = new EventEmitter({ captureRejections: true });
export const once = eventEmitter.once.bind(eventEmitter);
export const on = eventEmitter.on.bind(eventEmitter);

/**
 * @type {Map<string, chokidar.FSWatcher>}
 */
const pushOnChangeWatchers = new Map();

/**
 * Instance holder
 * @type {{ server: string, connected: boolean, password: string, proc: import('child_process').ChildProcess }} */
export const connectionState = {
    server: '',
    connected: false,
    password: '',
    proc: null,
};

const askPassCommand = isPacked
    ? process.argv[0] + '  ask-pass' // call self with argument
    : process.argv.slice(0, 2).join(' ') + ' ask-pass'; // call two first args

/**
 * @returns {string}
 */
export function getVersion() {
    try {
        const result = spawnSync(rcloneBinary, [
            '--config',
            // It seems that version require config,
            // and if the default config is encrypted, it fails (Rclone>=1.55).
            process.platform === 'win32' ? 'c:\\nul' : '/dev/null',
            'version',
        ]);
        return semver.clean(result.output.toString().trim().split(/\r?\n/).shift().split(/\s+/).pop());
    } catch (error) {
        console.warn(error.toString());
        config.set('use_system_rclone', false);
        throw Error('Cannot detect Rclone version. Switching back to bundled. Please restart the application.');
    }
}

/**
 * @returns {string}
 */
export function getSystemConfigFile() {
    try {
        const result = spawnSync(rcloneBinary, ['config', 'file']);
        return (result.output.toString().trim().split('\n')[1] || '').trim();
    } catch (error) {
        console.warn(error.toString());
        throw Error('Cannot detect Rclone default config file.');
    }
}

function rcloneDefaultArgs() {
    const args = ['--password-command', askPassCommand];
    const rcloneConfFile = config.get('rclone_config_file'); //|| '/Users/e01/.rcl2.conf';
    if (rcloneConfFile) {
        args.unshift('--config', rcloneConfFile);
    }
    return args;
}

/**
 */
export async function startRcloneDaemon() {
    const version = getVersion();
    if (!version) {
        throw Error(`Cannot detect Rclone version, at least ${RCLONE_MIN_VERSION} is required.`);
    }

    if (semver.gte(RCLONE_MIN_VERSION, version)) {
        throw Error(
            `Unsupported version, required version of Rclone is >= ${RCLONE_MIN_VERSION}, but you have ${version}`
        );
    }

    const port = await randomPort();
    if (!port) {
        throw Error('Cannot run Rclone daemon. System need to provide free port number in order to run the daemon.');
    }

    connectionState.server = '127.0.0.1:' + port;

    const args = [
        'rcd',
        '--no-console',
        `--rc-addr=${connectionState.server}`,
        '--use-mmap',
        '--rc-no-auth',
        '--auto-confirm',
        '--ask-password=false',
        // '-v', // Required verbosity to get acknowledge if something is unmounted
        ...rcloneDefaultArgs(),
    ];

    const proc = spawn(rcloneBinary, args, {
        detached: false,
        shell: false,
        windowsHide: true,
        stdio: 'pipe',
    });

    emitLines(proc.stderr);

    proc.stdout.on('data', function __rcloneStdoutHandler(data) {
        if (data.toString() === 'Remote config') {
            eventEmitter.emit('config');
        }
        console.log(`>${data.toString()}`);
    });

    proc.stderr.setEncoding('utf8');
    proc.stderr.on('line', function __rcloneStderrHandler(data) {
        console.debug('>>>', proc.connected, proc.signalCode, proc.exitCode, '>>', data);

        if (!connectionState.connected) {
            if (data.indexOf('Fatal error:') !== -1) {
                throw Error(data);
            } else if (data.indexOf('NOTICE: Serving remote control on') !== -1) {
                connectionState.connected = true;
                eventEmitter.emit('connected', connectionState.server);
            } else if (data.indexOf(`Failed to start remote control:`) !== -1) {
                eventEmitter.emit('error', {
                    command: 'boot',
                    error: Error('Failed to start daemon.'),
                });
                eventEmitter.emit('disconnected');
                proc.kill(1);
            } else if (
                data.indexOf("ERROR : Couldn't decrypt configuration, most likely wrong password") !== -1 ||
                data.indexOf('password-command returned empty string') !== -1
            ) {
                proc.kill(1);
                eventEmitter.emit('error', {
                    command: 'boot',
                    error: Error('Invalid configuration password'),
                });
                eventEmitter.emit('invalid-password');
            }
        } else {
            if (data.indexOf(' >Destroy:') !== -1) {
                // @todo notify that need update
            }
            // else if (data.indexOf('Error: NewFs: failed to make')) {
            //     eventEmitter.emit('error', {

            //     })
            // }
        }
    });

    proc.once('close', () => {
        if (!connectionState.connected) return;
        connectionState.connected = false;
        pushOnChangeWatchers.forEach((watcher) => watcher.close());
        eventEmitter.emit('disconnected');
    });

    connectionState.proc = proc;
    return connectionState;
}

/**
 * Set current instace options
 * @param {object=} newOptions
 */
export function setOptions(newOptions) {
    if (newOptions && typeof newOptions === 'object') {
        remoteCommand('options/set', newOptions);
    }
}

/**
 * Perform RC command
 * @param {string} command
 * @param {object=} payload
 * @returns {Promise<*>}
 */
export async function remoteCommand(command, payload) {
    if (!connectionState.server) {
        throw Error('Rclone daemon not started');
    }

    try {
        const response = await fetch('http://' + connectionState.server + '/' + command, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload ? JSON.stringify(payload) : '{}',
            timeout: 0,
        });
        const data = await response.json();
        if (data.error) {
            throw Error(data.error);
        }
        return data;
    } catch (err) {
        err.command = command;
        throw err;
    }
}

export async function stopAll() {
    await unmountAll();
}

export async function createBookmark(name, type, parameters) {
    if (!name || !/^([0-9a-z_-]{2,40})$/i.test(name.trim())) {
        throw Error('Invalid bookmark name: ' + name);
    }

    const result = await remoteCommand('config/create', {
        name,
        type,
        parameters,
    });

    eventEmitter.emit('bookmark:created', name, { ...parameters, type });
    return result;
}

export async function updateBookmark(name, parameters) {
    const result = await remoteCommand('config/update', {
        name,
        parameters,
    });
    eventEmitter.emit('bookmark:updated', name, parameters);
    return result;
}

export async function deleteBookmark(name) {
    const result = await remoteCommand('config/delete', {
        name,
    });
    if (pushOnChangeWatchers.has(name)) {
        pushOnChangeWatchers.get(name).close();
    }
    eventEmitter.emit('bookmark:deleted', name);
    return result;
}

export function getBookmark(name) {
    return remoteCommand('config/get', {
        name,
    });
}

/**
 * Get all supported providers
 * @returns {Promise<object[]>}
 */
export async function getProviders() {
    const providers = await remoteCommand('config/providers');
    return providers.providers.filter((provider) => UNSUPPORTED_PROVIDERS.indexOf(provider.Prefix) === -1);
}

/**
 * @param {string} prefix
 * @returns {Promise<Object, Error>}
 */
export async function getProvider(prefix) {
    const definition = await getProviders();
    return definition.find((item) => item.Prefix === prefix);
}

/**
 * @param {string} name
 * @returns {Promise<Object, Error>}
 */
export function getBookmarkConfig(name) {
    return remoteCommand('config/get', { name });
}

export async function getBookmarks() {
    const bookmarks = await remoteCommand('config/dump');
    return bookmarks;
}

export function push(bookmarkName) {
    const localPath = getBookmarkLocalDirectory(bookmarkName);
    if (!localPath) {
        return Promise.reject(Error(`Local directory not set for ${bookmarkName}`));
    }
    return remoteCommand('sync/sync', {
        srcFs: localPath,
        dstFs: bookmarkName + ':/',
    });
}

export function pull(bookmarkName) {
    const localPath = getBookmarkLocalDirectory(bookmarkName);
    if (!localPath) {
        return Promise.reject(Error(`Local directory not set for ${bookmarkName}`));
    }
    return remoteCommand('sync/sync', {
        dstFs: localPath,
        srcFs: bookmarkName + ':/',
    });
}

export function getPushOnChangeState(bookmarkName) {
    if (pushOnChangeWatchers.has(bookmarkName)) {
        return pushOnChangeWatchers.get(bookmarkName);
    }
    return false;
}

export function pushOnChange(bookmarkName) {
    if (pushOnChangeWatchers.has(bookmarkName)) {
        return pushOnChangeWatchers.get(bookmarkName);
    }

    const localPath = getBookmarkLocalDirectory(bookmarkName);
    if (!localPath) {
        throw Error(`Local directory not set for ${bookmarkName}`);
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
    });

    watcher.on('raw', () => {
        remoteCommand('sync/sync', {
            srcFs: localPath,
            dstFs: bookmarkName + ':/',
        });
    });

    push(bookmarkName);
    pushOnChangeWatchers.set(bookmarkName, watcher);
    return watcher;
}

export function isDaemonConnected() {
    return !!connectionState.connected;
}

export function openNCDU(name) {
    return execInOSTerminal([rcloneBinary, ...rcloneDefaultArgs(), 'ncdu', getRemoteFs(name)]);
}

export function bookmarkStartDLNA(name) {}

export function isBookmarkDLNAStarted(name) {
    return false;
}

export function openLocal(name) {
    return open('file://');
}

export function openMounted(name) {
    return open('file://');
}

export function isMounted(name) {
    return false;
}

function getRemoteFs(name) {
    return name + ':';
}

export function getBookmarkLocalDirectory(bookmark) {
    return bookmark.rclonetray_local_directory || null;
}

/**
 * @returns {Promise<string[]>}
 */
export async function getSyncing() {
    // @TODO request from the operations
    return Array.from(pushOnChangeWatchers.keys());
}

export function getMounted() {
    return remoteCommand('mount/listmounts');
}

export async function getBookomarkMountinfo(bookmarkName) {
    const mounted = await getMounted();
    return mounted.mountPoints.find((item) => item.Fs === bookmarkName);
}

export async function unmountAll() {
    const result = await remoteCommand('mount/unmountall');
    eventEmitter.emit('unmountall', result);
}

export async function mount(name) {
    const config = await getBookmarkConfig(name);
    if (!config) {
        throw Error('No such bookmark');
    }
    console.log('Mounting', config);

    const [mountpoint, cleanMountpoint] = useFreeMountpoint(name);

    try {
        const result = await remoteCommand('mount/mount', {
            fs: getRemoteFs(name),
            mountPoint: mountpoint,
            mountType: 'cmount',
            vfsOpt: {
                Timeout: 10,
                DirCacheTime: 3,
                ReadOnly: true,
                CachePollInterval: 10000,
                PollInterval: 10000,
            },
            mountOpt: {
                NoAppleDouble: true,
                NoAppleXattr: true,
                AllowNonEmpty: false,
                Daemon: false,
                DebugFUSE: false,
                VolumeName: name,
            },
        });
        eventEmitter.emit('bookmark:mounted', name, config, mountpoint);
        return result;
    } catch (error) {
        cleanMountpoint();
        eventEmitter.emit('error', {
            command: 'mount',
            error: Error(`Failed to mount ${name}`),
            reason: error,
        });
        throw error;
    }
}

export async function unmount(name) {
    const mountedInfo = await getBookomarkMountinfo(name);
    if (!mountedInfo) return;
    return await remoteCommand('mount/unmount', {
        mountPoint: mountedInfo.MountPoint,
    })
        .then((resolve) => {
            eventEmitter.emit('bookmark:mounted', name, config);
            return resolve;
        })
        .catch((error) => {
            eventEmitter.emit('error', {
                command: 'mount',
                error: Error(`Failed to unmount ${name}`),
                reason: error,
            });
            throw error;
        });
}

export function cleanMountpoint(mountpoint) {
    if (!fs.existsSync(mountpoint)) return;

    fs.rmdir(
        mountpoint,
        {
            maxRetries: 3,
            retryDelay: 1000,
        },
        () => {}
    );
}

/**
 * @param {string} bookmarkName
 * @parma {number=} i
 */
function useFreeMountpoint(bookmarkName, i) {
    let mountpoint = '';
    if (process.platform === 'win32') {
        mountpoint = win32GetFreeLetter();
        if (!mountpoint) {
            throw Error('Cannot found free drive letter. All drive slots are used.');
        }
        return [mountpoint, () => {}];
    } else if (process.platform === 'linux') {
        mountpoint = path.join(os.homedir(), `mount.${bookmarkName}.rclone`);
    } else {
        mountpoint = path.join(os.homedir(), `volume.${bookmarkName}.rclone`);
    }

    if (i) {
        mountpoint += '_' + i;
    }

    if (!getEmptyDirectory(mountpoint)) {
        return useFreeMountpoint(bookmarkName, i ? i + 1 : 1);
    }

    return [mountpoint, cleanMountpoint.bind(null, mountpoint)];
}
