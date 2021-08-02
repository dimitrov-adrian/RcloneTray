import { existsSync, mkdirSync, promises as fsp } from 'fs';

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function isEmptyDirectory(path) {
    if (!existsSync(path)) {
        return true;
    }
    try {
        const iterator = await fsp.opendir(path);
        // @ts-ignore
        const { value, fail } = await iterator[Symbol.asyncIterator]().next();
        await iterator.close();
        return !fail;
    } catch (error) {
        return false;
    }
}

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function getEmptyDirectory(path) {
    if (!existsSync(path)) {
        try {
            mkdirSync(path, { recursive: true });
            return true;
        } catch (error) {
            return false;
        }
    }
    try {
        const iterator = await fsp.opendir(path);
        // @ts-ignore
        const { value, fail } = await iterator[Symbol.asyncIterator]().next();
        await iterator.close();
        return !fail;
    } catch (error) {
        return false;
    }
}
