/**
 * @typedef {{
 *  type: string,
 * }
 * & Record<string, string>} RcloneBookmarkConfig
 *
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
 *
 * @typedef {{
 *  data?: Record<string, any>,
 *  stop: () => void|Promise<any>
 * }} Job
 *
 * @typedef {Record<string, ActiveJobMapList>} ActiveJobsMap
 *
 * @typedef {{
 *  mount?: true,
 *  dlna?: true,
 *  pull?: true,
 *  push?: true,
 *  autopush?: true
 * }} ActiveJobMapList
 */

import process from 'node:process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import EventEmitter from 'node:events';
import chokidar from 'chokidar';
import open from 'open';
import getPort from 'get-port';
import { ensureEmptyDirectory, isEmptyDirectory } from '../utils/empty-dir.js';
import { execInOSTerminal } from '../utils/terminal-command.js';
import { getResourcePath, getSubcommand } from '../utils/package.js';
import { rcloneDriver, remoteCommand } from '../utils/rclone.js';
import { config } from './config.js';
import logger from './logger.js';

export const RCLONETRAY_CONFIG = {
    RCLONE_MIN_VERSION: '1.56.0',
    UNSUPPORTED_PROVIDERS: ['memory', 'http', 'compress', 'cache', 'union', 'chunker', 'local'],
    BUCKET_REQUIRED_PROVIDERS: ['b2', 'swift', 's3', 'gsc', 'hubic'],
    CUSTOM_KEYS: {
        localDirectory: 'rclonetray_local_directory',
        remoteHome: 'rclonetray_remote_home',
        autoMount: 'rclonetray_automount',
        pullOnStart: 'rclonetray_pullonstart',
        bucket: 'rclonetray_bucket',
    },
};

const rclone = rcloneDriver({
    binary:
        process.env.RCLONETRAY_RCLONE_PATH ||
        (config.get('use_system_rclone')
            ? null
            : getResourcePath('vendor', 'rclone', process.platform === 'win32' ? 'rclone.exe' : 'rclone')),
    configFile: config.get('rclone_config_file'),
});

export const emitter = new EventEmitter({ captureRejections: true });

const rcloneDaemonInfo = {
    proc: null,
    server: null,
};

/**
 * @type {Map<string, Job>}
 */
const jobs = new Map();

/**
 * @returns {boolean}
 */
export function hasActiveJobs() {
    return jobs.size > 0;
}

/**
 * @returns {ActiveJobsMap}
 */
export function getActiveJobsMap() {
    const result = {};
    for (const key of jobs.keys()) {
        const [bookmarkName, jobname] = key.split(':');
        if (!(bookmarkName in result)) {
            result[bookmarkName] = {};
        }

        result[bookmarkName][jobname] = true;
    }

    // @ts-ignore
    return result;
}

export function setupDaemon() {
    if (!rclone.versionGte(RCLONETRAY_CONFIG.RCLONE_MIN_VERSION)) {
        throw new Error(`Minimum version of Rclone must be ${RCLONETRAY_CONFIG.RCLONE_MIN_VERSION}`);
    }

    const user = Math.round(Math.random() * Date.now()).toString(24);
    const pass = Math.round(Math.random() * Date.now()).toString(24);

    rclone
        .rcd({
            RCLONE_PASSWORD: 'false',
            RCLONE_PASSWORD_COMMAND: getSubcommand('ask-pass-config'),
            RCLONE_SFTP_ASK_PASSWORD: getSubcommand('ask-pass-remote'),
            RCLONE_RC_USER: user,
            RCLONE_RC_PASS: pass,
            RCLONE_RC_ADDR: '127.0.0.1:0',
        })
        .on('close', () => {
            logger.error('Rclone daemon exited');
            rcloneDaemonInfo.server = null;
            rcloneDaemonInfo.proc = null;
        })
        .on('error', (error) => {
            emitter.emit('error', error);
        })
        .on('data', (data) => {
            logger.debug('RCV', 'rclone:rcd@data', data);
            emitter.emit('log', data);
        })
        .on('data', rcloneDaemonLogHandler)
        .once('ready', (endpoint) => {
            rcloneDaemonInfo.server = {
                uri: endpoint,
                auth: user + ':' + pass,
            };
            emitter.emit('ready');
        });

    /**
     * @param {import('../utils/rclone.js').LogMessage} data
     */
    function rcloneDaemonLogHandler(data) {
        if (data.msg.includes('go to the following link:')) {
            const url = data.msg.match(/https?:\/\/(\S+)/i);
            emitter.emit('webconfirm', url);
        } else if (data.msg.includes('Error: NewFs: failed to make')) {
            emitter.emit('error', 'NewFs:' + data);
        } else if (data.msg.includes('Fatal error:')) {
            throw new Error(data.msg);
        } else if (data.source.startsWith('config/crypt.go') && data.msg.startsWith("Couldn't decrypt configuration")) {
            emitter.emit('invalid-config-pass', data.msg);
        }
    }
}

/**
 * @param {string} endpoint
 * @param {object=} payload
 */
export function rc(endpoint, payload) {
    if (!rcloneDaemonInfo.server) throw new Error('No server');

    logger.debug('SND', endpoint);

    return remoteCommand(rcloneDaemonInfo.server, endpoint, payload);
}

/**
 * @returns {string}
 */
export function getConfigFile() {
    return rclone.getConfigFile();
}

/**
 * Set current instace options
 * @param {object=} newOptions
 */
export async function setOptions(newOptions) {
    if (newOptions && typeof newOptions === 'object') {
        rc('options/set', newOptions);
        return true;
    }

    return true;
}

/**
 * Create new bookmark
 * @param {string} bookmarkName
 * @param {string} type
 * @param {Record<string, any>} parameters
 * @returns {Promise<object>}
 * @emits 'bookmark:created'
 */
export async function createBookmark(bookmarkName, type, parameters) {
    if (!bookmarkName || !/^([\w-]{2,40})$/i.test(bookmarkName)) {
        throw new Error('Invalid bookmark name: ' + bookmarkName);
    }

    const command = rc('config/create', {
        name: bookmarkName,
        type,
        parameters,
    });

    emitter.emit('config');
    emitter.emit('bookmarkCreated', bookmarkName, { ...parameters, type });

    return command.result;
}

/**
 * Update existing bookmark
 * @param {string} bookmarkName
 * @param {Record<string, any>} parameters
 * @returns {Promise<JSON>}
 * @emits 'bookmark:updated'
 */
export async function updateBookmark(bookmarkName, parameters) {
    if (jobs.has(`${bookmarkName}:autopush`)) {
        // @TODO if path is changed, then should restart autopush,
        //       for now, just stop it
        autopush(bookmarkName, false);
    }

    const command = rc('config/update', {
        name: bookmarkName,
        parameters,
    });

    emitter.emit('config');
    emitter.emit('bookmarkCreated', bookmarkName, parameters);

    return command.result;
}

/**
 * Delete existing bookmark
 * @param {string} bookmarkName
 * @returns {Promise<JSON>}
 * @emits 'bookmark:deleted'
 */
export async function deleteBookmark(bookmarkName) {
    if (jobs.has(`${bookmarkName}:autopush`)) {
        autopush(bookmarkName, false);
    }

    const command = rc('config/delete', {
        name: bookmarkName,
    });

    emitter.emit('config');
    emitter.emit('bookmarkDeleted', bookmarkName);

    return command.result;
}

/**
 * Get bookmark properties by name
 * @param {string} bookmarkName
 * @returns {Promise<RcloneBookmarkConfig, Error>}
 */
export function getBookmark(bookmarkName) {
    return rc('config/get', { name: bookmarkName }).result;
}

/**
 * @returns {Promise<Record<string, RcloneBookmarkConfig>>}
 */
export async function getBookmarks() {
    try {
        const result = await rc('config/dump').result;

        return Object.fromEntries(
            Object.entries(result).filter(([, info]) => !RCLONETRAY_CONFIG.UNSUPPORTED_PROVIDERS.includes(info.type))
        );
    } catch {}

    return {};
}

/**
 * Get all supported providers
 * @returns {Promise<object[]>}
 */
export async function getProviders() {
    const providers = await rc('config/providers').result;
    return providers.providers.filter((provider) => !RCLONETRAY_CONFIG.UNSUPPORTED_PROVIDERS.includes(provider.Prefix));
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
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export async function push(bookmarkName, bookmarkConfig, initiator) {
    if (jobs.has(`${bookmarkName}:push`) || jobs.has(`${bookmarkName}:pull`)) return;

    if (!bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory]) {
        throw new Error(`Local directory not set for ${bookmarkName}`);
    }

    emitter.emit('activity', 'push');

    const info = {
        srcFs: bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory],
        dstFs: getBookmarkFs(bookmarkName, bookmarkConfig),
    };

    try {
        const command = rc('sync/sync', { ...info });

        jobs.set(`${bookmarkName}:push`, {
            stop: () => command.abort(),
            data: { ...info },
        });

        await command.result;
    } catch {}

    jobs.delete(`${bookmarkName}:push`);
    emitter.emit('pushed', bookmarkName, initiator);
    emitter.emit('activity', 'pushed');
}

/**
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export async function pull(bookmarkName, bookmarkConfig) {
    if (jobs.has(`${bookmarkName}:push`) || jobs.has(`${bookmarkName}:pull`)) return;

    if (!bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory]) {
        throw new Error(`Local directory not set for ${bookmarkName}`);
    }

    emitter.emit('activity', 'pull');

    const info = {
        srcFs: getBookmarkFs(bookmarkName, bookmarkConfig),
        dstFs: bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory],
    };

    try {
        const command = rc('sync/sync', { ...info });

        jobs.set(`${bookmarkName}:pull`, {
            stop: () => command.abort(),
            data: { ...info },
        });

        await command.result;
    } catch {}

    jobs.delete(`${bookmarkName}:pull`);
    emitter.emit('pulled', bookmarkName);
    emitter.emit('activity', 'pulled');
}

/**
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig|false=} bookmarkConfig
 */
export function autopush(bookmarkName, bookmarkConfig) {
    if (typeof bookmarkConfig === 'boolean') {
        if (jobs.has(`${bookmarkName}:autopush`)) {
            jobs.get(`${bookmarkName}:autopush`).stop();
        }
    } else {
        if (jobs.has(`${bookmarkName}:autopush`)) return;

        if (!bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory]) {
            throw new Error(`Local directory not set for ${bookmarkName}`);
        }

        const watcher = chokidar.watch(bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory], {
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

        watcher.on('raw', () => push(bookmarkName, bookmarkConfig, 'autopush'));

        jobs.set(`${bookmarkName}:autopush`, {
            data: {
                path: bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory],
            },
            stop: async () => {
                if (!watcher) return;
                try {
                    watcher.close();
                    jobs.delete(`${bookmarkName}:autopush`);
                } catch (error) {
                    logger.error(error.toString());
                }
            },
        });

        push(bookmarkName, bookmarkConfig, 'autopush');
    }
}

/**
 * @TODO reimplement with mount/mount command,
 *       right now this is not possible because of
 *       https://github.com/rclone/rclone/issues/4860
 *
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export async function mount(bookmarkName, bookmarkConfig) {
    if (jobs.has(`${bookmarkName}:mount`)) return;

    const mountpoint = await prepareMountpoint(bookmarkName);

    emitter.emit('activity', 'mount');

    try {
        const command = rc('core/command', {
            command: 'mount',
            arg: [getBookmarkFs(bookmarkName, bookmarkConfig), mountpoint],
            opt: {
                volname: bookmarkName,
            },
            returnType: 'STREAM',
        });

        jobs.set(`${bookmarkName}:mount`, {
            data: {
                mountpoint,
            },
            stop: () => command.abort(),
        });

        emitter.emit('mounted', bookmarkName);
        await command.result;
    } catch {}

    jobs.delete(`${bookmarkName}:mount`);
    emitter.emit('unmounted', bookmarkName);
    emitter.emit('activity', 'unmounted');
    cleanMountpoint(mountpoint);
}

/**
 * @param {string} bookmarkName
 */
export async function unmount(bookmarkName) {
    if (!jobs.has(`${bookmarkName}:mount`)) return;
    jobs.get(`${bookmarkName}:mount`).stop();
}

/**
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export function openNCDU(bookmarkName, bookmarkConfig) {
    return execInOSTerminal([
        rclone.getBinary(),
        '--config',
        rclone.getConfigFile(),
        'ncdu',
        getBookmarkFs(bookmarkName, bookmarkConfig),
    ]);
}

/**
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export async function startDLNA(bookmarkName, bookmarkConfig) {
    if (jobs.has(`${bookmarkName}:dlna`)) return;

    const asrc = {
        command: 'serve',
        arg: ['dlna', getBookmarkFs(bookmarkName, bookmarkConfig)],
        opt: {
            name: bookmarkName,
            addr: ':' + (await getPort()),
            'no-checksum': '',
            'no-modtime': '',
        },
        returnType: 'STREAM',
    };

    emitter.emit('activity', 'dlna');

    try {
        const command = rc('core/command', asrc);

        jobs.set(`${bookmarkName}:dlna`, {
            stop: () => command.abort(),
        });

        emitter.emit('dlnaStarted', bookmarkName);

        await command.result;
    } catch {}

    emitter.emit('dlnaStopped', bookmarkName);
    emitter.emit('activity', 'dlna');
    jobs.delete(`${bookmarkName}:dlna`);
}

/**
 * @param {string} bookmarkName
 */
export function stopDLNA(bookmarkName) {
    if (!jobs.has(`${bookmarkName}:dlna`)) return;
    jobs.get(`${bookmarkName}:dlna`).stop();
}

/**
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export function getBookmarkFs(bookmarkName, bookmarkConfig) {
    return (
        bookmarkName +
        (bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.remoteHome]
            ? ':' + bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.remoteHome]
            : ':/')
    );
}

/**
 * @param {string} bookmarkName
 * @param {RcloneBookmarkConfig} bookmarkConfig
 */
export async function openLocal(bookmarkName, bookmarkConfig) {
    const dir = bookmarkConfig[RCLONETRAY_CONFIG.CUSTOM_KEYS.localDirectory];
    if (!dir) return;
    open(`file://${dir}`);
}

/**
 * @param {string} bookmarkName
 */
export async function openMounted(bookmarkName) {
    if (!jobs.has(`${bookmarkName}:mount`)) return;
    const { mountpoint } = jobs.get(`${bookmarkName}:mount`).data;
    if (mountpoint) return open(`file://${mountpoint}`);
}

/**
 * @param {string} mountpoint
 */
export async function cleanMountpoint(mountpoint) {
    if (process.platform === 'win32' || !fs.existsSync(mountpoint)) return;
    if (await isEmptyDirectory(mountpoint)) {
        await fs.promises.rmdir(mountpoint, { maxRetries: 3, retryDelay: 1000 });
    }
}

/**
 * @param {string} bookmarkName
 * @returns {string}
 */
export function getDefaultMountPoint(bookmarkName) {
    if (process.platform === 'win32') return `\\\\cloud\\\\${bookmarkName}`;
    return path.join(os.homedir(), `volume_${bookmarkName}`);
}

/**
 * @param {string} bookmarkName
 * @returns {string}
 */
function getMountpointPattern(bookmarkName) {
    if (config.get('mount_pattern')) {
        if (/%s/.test(config.get('mount_pattern'))) {
            return config.get('mount_pattern').toString().replace('%s', bookmarkName);
        }

        return config.get('mount_pattern').toString() + '-' + bookmarkName;
    }

    return getDefaultMountPoint(bookmarkName);
}

/**
 * @param {string} bookmarkName
 * @parma {number=} i
 * @returns {Promise<string>}
 */
async function prepareMountpoint(bookmarkName, i) {
    if (process.platform === 'win32') {
        return getMountpointPattern(bookmarkName);
    }

    const mountpoint = getMountpointPattern(bookmarkName) + (i ? '_' + i : '');
    if (!(await ensureEmptyDirectory(mountpoint))) {
        return prepareMountpoint(bookmarkName, i ? i + 1 : 1);
    }

    return mountpoint;
}
