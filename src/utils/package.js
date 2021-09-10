import process from 'node:process';
import { resolve, basename, join } from 'node:path';
import { readFileSync } from 'node:fs';

/**
 * @type {boolean}
 */
export const isPacked = !['yode', 'qode', 'node'].includes(basename(process.title).toLowerCase());

/**
 * @type {Record<string, any>}
 */
export const packageJson = JSON.parse(
    readFileSync(
        // If packed it's under asar/, otherwise just resolve it.
        isPacked ? process.execPath + '/asar/package.json' : resolve('package.json'),
        { encoding: 'utf-8' }
    )
);

/**
 * Get path to unpacked resource, because when compiled with yackage and yode,
 * the resource files goes to <root>/res/
 * @param  {...string} args
 * @returns {string}
 */
export function getResourcePath(...args) {
    return isPacked
        ? // Yode.
          join(process.execPath, '..', 'res', ...args)
        : resolve(join(...args));
}

/**
 * Get subcommand commandline (about, ask-pass-*, ... etc)
 * @param {string} subcommand
 * @return {string}
 */
export function getSubcommand(subcommand) {
    return [...process.argv.slice(0, isPacked ? 1 : 2), subcommand].join(' ');
}
