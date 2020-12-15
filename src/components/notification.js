import notifier from 'node-notifier'
import appInfo from '../utils/app-info.js'

/**
 * @param {String} message
 * @returns {notifier.NodeNotifier}
 */
export default function notify(message) {
    return notifier.notify({
        title: appInfo.productName,
        message: message,
        sound: true,
        appID: appInfo.appId,
        'app-name': appInfo.name,
        wait: false,
    })
}
