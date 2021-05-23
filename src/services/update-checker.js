import fetch from 'node-fetch';
import semver from 'semver';
import packageJson from '../utils/package-json.js';

/**
 * @typedef {{
 *  hasUpdate: boolean,
 *  date: Date,
 *  version: string,
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
    const content = await fetch(packageJson.publishedMetaInfo);
    const info = await content.json();
    const asset = info.assets.find(findBundleForPlatformFunction);

    if (!asset) null;

    return {
        hasUpdate: true || semver.gt(semver.clean(info.name), semver.clean(packageJson.version)),
        date: new Date(asset.updated_at),
        version: info.name,
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
