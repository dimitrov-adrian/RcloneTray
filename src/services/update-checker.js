/**
 * @typedef {{
 *  hasUpdate: boolean,
 *  date: Date,
 *  version: string,
 *  current: string,
 *  url: string,
 *  size: number,
 *  label: string,
 *  name: string,
 * }} UpdateCheckResult
 */

import process from 'node:process';
import fetch from 'node-fetch';
import semver from 'semver';
import {packageJson} from '../utils/package.js';

/**
 * @throws {Error}
 * @returns {Promise<UpdateCheckResult>}
 */
export async function getLatestRelaseInfo() {
	const content = await fetch(packageJson.config.RcloneTray.releaseInfo);

	/** @type {object} */
	const info = await content.json();

	if (!info || !info.assets || !info.tag_name) {
		throw new Error('Invalid remote manifest');
	}

	const asset = info
		.assets
		.find(url => findBundleForPlatformFunction(url, process.platform));

	if (!asset) {
		throw new Error('No update for current platform');
	}

	const currentVer = semver.clean(packageJson.version);
	const remoteVer = semver.clean(info.tag_name);

	return {
		hasUpdate: semver.gt(remoteVer, currentVer),
		date: new Date(asset.updated_at),
		version: remoteVer,
		current: currentVer,
		url: asset.browser_download_url,
		size: asset.size,
		label: asset.label,
		name: asset.name,
	};
}

/**
 * @param {{name: string}} bundleUrl
 * @param {string} platform
 */
function findBundleForPlatformFunction(bundleUrl, platform) {
	if (platform === 'darwin') {
		return bundleUrl.name.endsWith('.dmg');
	}

	if (platform === 'win32') {
		return bundleUrl.name.endsWith('.exe');
	}

	if (platform === 'linux') {
		return bundleUrl.name.endsWith('.AppImage');
	}

	return false;
}
