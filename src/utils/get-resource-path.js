import path from 'node:path';
import isPackaged from './is-packaged.js';

/**
 * Get path to unpacked resource, because when compiled with yackage and yode,
 * the resource files goes to <root>/res/
 * @param  {...string} args
 * @returns {string}
 */
export default function getResourcePath(...args) {
    return isPackaged
        ? // Yode
          path.join(process.execPath, '..', 'res', ...args)
        : // Node
          path.resolve(path.join(...args));
}
