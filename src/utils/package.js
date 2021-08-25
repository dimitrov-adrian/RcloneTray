import { resolve, basename, join } from 'path';
import { readFileSync } from 'fs';

/**
 * @type {boolean}
 */
export const isPacked = ['yode', 'qode', 'node'].indexOf(basename(process.title).toLowerCase()) === -1;

/**
 * @type {Record<string, any>}
 */
export const packageJson = JSON.parse(
    readFileSync(
        // If packed it's under asar/
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
        : // Node.
          resolve(join(...args));
}

/**
 * Get subcommand commandline (about, ask-pass-*, ... etc)
 * @param {string} subcommand
 * @param {string[]} parameters
 * @return {string}
 */
export function getSubcommand(subcommand, ...parameters) {
    return isPacked
        ? process.argv[0] + ' ' + subcommand + ' ' + parameters.join(' ') // call self with argument
        : process.argv.slice(0, 2).join(' ') + subcommand + ' ' + parameters.join(' '); // call two first args
}
