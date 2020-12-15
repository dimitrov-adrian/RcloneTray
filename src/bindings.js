import gui from 'gui'
import opener from 'opener'
import createAboutWindow from './components/about.js'
import createBookmarkWindow from './components/bookmark-edit.js'
import createBookmarkWizardWindow from './components/bookmark-wizard.js'
import createDarwinAppMenu from './components/menu-darwin.js'
import { createTrayMenu, updateMenu } from './components/menu.js'
import { errorDialog, promptDialog } from './components/messages.js'
import notify from './components/notification.js'
import createPreferencesWindow from './components/preferences.js'
import config from './config.js'
import * as rclone from './rcloned.js'
import appInfo from './utils/app-info.js'
import autoLaunch from './utils/autolaunch.js'
import events, { on } from './utils/event-emitter.js'
import getResourcePath from './utils/get-resource-path.js'

export default events

global.dev = {
    rclone,
    autoLaunch,
    events,
    appInfo,
    getResourcePath,
    notify,
    gui,
    opener,
}

/**
 * Events binding
 */
process.on('exit', (code) => {
    // Stop timer
    // Unmount mounts
    console.debug('Process Exit', code)
})

config.onDidChange('auto_start', async (newValue) => {
    try {
        const serviceStatus = await autoLaunch.isEnabled()
        if (!!serviceStatus === !!newValue) {
            return
        }
        if (!!newValue) {
            await autoLaunch.enable()
        } else {
            await autoLaunch.disable()
        }
    } catch (error) {
        errorDialog(`${appInfo.name} cannot access system auto-launch service`)
    }
})

on('app/ready', () => {
    createTrayMenu()
    if (process.platform === 'darwin') {
        gui.app.setActivationPolicy('accessory')
        gui.app.setApplicationMenu(createDarwinAppMenu())
    }
})

on('rclone/connection/connected', () => {
    updateMenu()
})

on('app/about', () => {
    createAboutWindow()
})

on('app/about/homepage', () => {
    opener(appInfo.homepage)
})

on('app/about/homepage_rclone', () => {
    opener('https://rclone.org/')
})

on('app/about/license', () => {
    opener(getResourcePath('LICENSE.txt'))
})

on('app/about/issues', () => {
    opener(appInfo.issuesLink)
})

on('app/quit', () => {
    process.exit(0)
})

on('app/preferences', () => {
    createPreferencesWindow()
})

on('app/wizard', () => {
    createBookmarkWizardWindow()
})

on('app/new_bookmark', async (type, windowBounds) => {
    const providerConfig = await rclone.getProvider(type)
    createBookmarkWindow({
        isNew: true,
        providerConfig,
        type,
        bounds: {
            x: windowBounds.x,
            y: windowBounds.y,
        },
    })
})

on('app/edit', async (name) => {
    const config = await rclone.getBookmarkConfig(name)
    const providerConfig = await rclone.getProvider(config.type)
    createBookmarkWindow({
        isNew: false,
        name,
        type: config.type,
        providerConfig,
        config,
    })
})

on('app/clone', async (name) => {
    promptDialog({
        label: 'New Name',
        buttonText: 'Clone',
        resolve: (newName) => {
            if (newName) {
                events.emit('bookmark/clone', name, newName)
            }
        },
        validator: (input) => {
            if (!rclone.validateBookmarkName(input)) {
                return 'Invalid name'
            }
        },
    })
})

on('bookmark/clone', async (name, newName) => {
    try {
        const ifExistsConfig = await rclone.getBookmarkConfig(newName)
        if (ifExistsConfig.type) {
            errorDialog(`Failed to clone ${name} to ${newName}`, `Bookmark with name ${newName} already exists.`)
            return
        }
    } catch (error) {}

    const config = await rclone.getBookmarkConfig(name)

    events.emit('bookmark/create', {
        name: newName,
        type: config.type,
        parameters: config,
    })
})

on('bookmark/create', (data) => {
    rclone
        .createBookmark(data.name, data.type, data.parameters)
        .then(() => {
            updateMenu()
        })
        .catch((error) => {
            errorDialog(`Failed to create new ${data.type} bookmark - ${data.name}`, error.toString())
        })
})

on('bookmark/update', (data) => {
    rclone
        .updateBookmark(data.name, data.parameters)
        .then(() => {
            updateMenu()
        })
        .catch((error) => {
            errorDialog(`Failed to create new ${data.type} bookmark - ${data.name}`, error.toString())
        })
})

on('bookmark/mount', (name) => {
    rclone.mount(name)
})

on('bookmark/unmount', (name) => {
    rclone.mount(name)
})

on('bookmark/pull', (name) => {
    rclone.pull(name)
})

on('bookmark/push', (name) => {
    rclone.push(name)
})

on('rclone/error', (error) => {
    errorDialog('Error', error.toString())
    console.log('------ERROR-----', error.toString(), '--------/ERROR------')
})
