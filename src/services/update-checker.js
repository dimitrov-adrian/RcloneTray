import fetch from 'node-fetch';
import semver from 'semver';
import packageJson from '../utils/package-json.js';

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
 * }} UpdateInfo
 */

/**
 * @returns {Promise<UpdateInfo>}
 */
export async function getLatestRelaseInfo() {
    const content = await fetch(packageJson.RcloneTray.releaseInfo);
    const info = await content.json();
    const asset = info.assets.find(findBundleForPlatformFunction);

    if (!asset) null;

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
 */
function findBundleForPlatformFunction(bundleUrl) {
    if (process.platform === 'darwin') return bundleUrl.name.endsWith('.dmg');
    if (process.platform === 'win32') return bundleUrl.name.endsWith('.exe');
    if (process.platform === 'linux') return bundleUrl.name.endsWith('.AppImage');
    return false;
}
