import AutoLaunch from 'auto-launch'
import appInfo from './app-info.js'

const autoLaunch = new AutoLaunch({
    name: appInfo.name,
    path: process.execPath,
    isHidden: false,
})

export default autoLaunch
