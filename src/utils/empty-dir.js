import {existsSync, mkdirSync, promises as fsp} from 'node:fs';

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function isEmptyDirectory(path) {
	try {
		const iterator = await fsp.opendir(path);
		const {done} = await iterator[Symbol.asyncIterator]().next();
		if (!done) {
			iterator.close();
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function ensureEmptyDirectory(path) {
	if (!existsSync(path)) {
		try {
			mkdirSync(path, {recursive: true});
			return true;
		} catch {
			return false;
		}
	}

	return isEmptyDirectory(path);
}
