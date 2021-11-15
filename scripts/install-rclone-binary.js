import process from 'node:process';
import console from 'node:console';
import { join, dirname, resolve } from 'node:path';
import { writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';

const rcloneVersion = process.env.npm_package_engines_rclone;
const targetPlatform = process.env.npm_config_platform || process.platform;
const targetArch = process.env.npm_config_arch || process.arch;

if (!rcloneVersion) {
	console.log('Required Rclone version not defined in package.json:engines.rclone');
	process.exit(1);
}

if (!process.env.npm_package_json) {
	console.log('Must run from NPM script');
	process.exit(1);
}

const rcloneUrl = (
	{
		darwin_x64: 'https://downloads.rclone.org/{version}/rclone-{version}-osx-amd64.zip',
		darwin_arm64: 'https://downloads.rclone.org/{version}/rclone-{version}-osx-arm64.zip',
		linux_x64: 'https://downloads.rclone.org/{version}/rclone-{version}-linux-amd64.zip',
		win32_x64: 'https://downloads.rclone.org/{version}/rclone-{version}-windows-amd64.zip',
	}[`${targetPlatform}_${targetArch}`] || ''
).replaceAll('{version}', `v${rcloneVersion}`);

if (!rcloneUrl) {
	console.log('No rclone for target platform: %s_%s', targetPlatform, targetArch);
	process.exit(1);
}
const destDirectory = process.argv[2]
	? resolve(join(process.argv[2], 'rclone'))
	: join(dirname(process.env.npm_package_json), 'package', 'vendor', 'rclone');

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
				chmodSync(binPath, 0o755);
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
