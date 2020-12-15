import path from 'path'
import isPackaged from './is-packaged.js'

/**
 * Get path to unpacked resource, because when compiled with yackage and yode,
 * the resource files goes to <root>/res/
 * @param  {...String} args
 * @returns {String}
 */
export default function getResourcePath(...args) {
    let resourcePath
    if (isPackaged) {
        resourcePath = path.join('..', 'res', ...args)
    } else {
        resourcePath = path.join(...args)
    }
    resourcePath = path.resolve(resourcePath)
    return resourcePath
}
