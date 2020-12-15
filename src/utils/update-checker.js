import fetch from 'node-fetch'
import semver from 'semver'
import appInfo from './app-info.js'

function platformBundlerFindCallback(bundle) {
    if (process.platform === 'win32') {
        return bundle.name.endsWith('.exe')
    } else if (process.platform === 'darwin') {
        return bundle.name.endsWith('.dmg')
    } else if (process.platform === 'linux') {
        return bundle.name.endsWith('.AppImage')
    } else {
        return false
    }
}

export function getLatestRelaseInfo() {
    return fetch(appInfo.releaseUpdateURI)
        .then((content) => content.json())
        .then((info) => {
            const asset = info.assets.find(platformBundlerFindCallback)

            if (!asset) {
                return null
            }

            return {
                hasUpdate: semver.gt(semver.clean(info.name), semver.clean(appInfo.version)),
                date: asset.updated_at,
                version: info.name,
                url: asset.browser_download_url,
                size: asset.size,
                label: asset.label,
                name: asset.name,
            }
        })
}
