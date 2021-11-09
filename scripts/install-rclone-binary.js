import process from 'node:process';
import console from 'node:console';
import { join, dirname } from 'node:path';
import { writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';

const targetPlatform = process.env.npm_config_platform || process.platform;
const targetArch = process.env.npm_config_arch || process.arch;
const rcloneUrl = process.env[`npm_package_config_rcloneDownloadURL_${targetPlatform}_${targetArch}`];

if (!rcloneUrl) {
	console.log('No rclone for target platform:', targetPlatform);
	process.exit(1);
}

if (!process.env.npm_package_json) {
	console.log('Must run from NPM script');
	process.exit(1);
}

const destDirectory = join(dirname(process.env.npm_package_json), 'vendor', 'rclone');

(async function () {
	console.log('Downloading', rcloneUrl);

	/**
	 * @type {import('node-fetch').Response}
	 */
	const response = await fetch(rcloneUrl, {
		headers: {
			'User-Agent': 'RcloneTray/Fetcher',
		},
	});

	if (verifyETag(response.headers.get('etag'))) {
		console.log(' - Skip. Already have latest version in', destDirectory);
		return;
	}

	console.log(' -', response.statusText);
	console.log(' - Fetching');
	const responseBody = await response.buffer();
	console.log('Installing');
	const installedFile = await installVendorFromRequest(responseBody);
	writeETag(response.headers.get('etag'));
	console.log(' - Done', installedFile);
	process.exit(0);
})();

/**
 * @param {Buffer} responseBody
 */
async function installVendorFromRequest(responseBody) {
	const zip = new AdmZip(responseBody);
	const entry = zip.getEntries().find((entry) => {
		if (targetPlatform === 'darwin' || targetPlatform === 'linux') {
			return /\/rclone$/.test(entry.entryName);
		}

		if (targetPlatform === 'win32') {
			return /\/rclone\.exe$/.test(entry.entryName);
		}

		return false;
	});

	if (entry) {
		console.log(' - Extracting', entry.entryName);
		if (zip.extractEntryTo(entry, destDirectory, false, true)) {
			const binPath = join(destDirectory, entry.name);
			if (targetPlatform !== 'win32') {
				chmodSync(binPath, 750);
			}

			return binPath;
		}

		throw new Error('Cannot extract');
	}

	throw new Error('No rclone inside the archive');
}

/**
 * @param {string} etag
 */
function writeETag(etag) {
	writeFileSync(join(destDirectory, '.rclone'), targetPlatform + targetArch + etag);
}

/**
 * @param {string} etag
 * @returns {boolean}
 */
function verifyETag(etag) {
	if (!existsSync(join(destDirectory, '.rclone'))) {
		return null;
	}

	return readFileSync(join(destDirectory, '.rclone')).toString() === targetPlatform + targetArch + etag;
}
