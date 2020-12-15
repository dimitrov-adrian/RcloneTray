import bindings from './bindings.js'
import { errorDialog, reportErrorDialog } from './components/messages.js'
import { startDaemon as rclone } from './rcloned.js'
import appInfo from './utils/app-info.js'
import singleInstanceLock from './utils/single-instance.js'

const isDev = process.env.ENV === 'dev'

console.debug = function (...args) {
    console.log('🐛', ...args)
}

// Check the OS and arch.
if (process.arch !== 'x64' || ['win32', 'linux', 'darwin'].indexOf(process.platform) === -1) {
    throw Error('Unsupported platform. RcloneTray requires 64bit platform (macOS, Windows or Linux)')
}

// Check for yode.
if (!process.versions.yode) {
    console.error('App must be run under Yode engine.')
    process.exit()
}

if (!isDev) {
    process.setUncaughtExceptionCaptureCallback((error) => {
        reportErrorDialog('Unexpected error', error)
    })
}

// Main
;(async () => {
    if (!isDev) {
        try {
            await singleInstanceLock(appInfo.appId)
        } catch (error) {
            if (error.toString() === 'ALREADY_RUNNING') {
                errorDialog(appInfo.name, 'There is already running instance of RcloneTray, cannot start twice.')
            } else {
                reportErrorDialog('Unexpected error', error)
            }
            process.exit()
        }
    }

    try {
        const proc = await rclone()
        if (isDev) {
            process.once('SIGUSR2', () => proc && proc.kill('SIGHUP'))
        }
    } catch (error) {
        errorDialog('Error', error.toString())
        process.exit()
    }

    bindings.emit('app/ready')
})()
