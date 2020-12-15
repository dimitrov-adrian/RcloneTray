import gui from 'gui'
import bindings from '../bindings.js'
import appInfo from '../utils/app-info.js'
import getResourcePath from '../utils/get-resource-path.js'
import winRef from '../utils/winref.js'

export default function createAboutWindow() {
    const win = winRef('about')

    if (win.value) {
        win.value.activate()
        return
    }

    win.value = gui.Window.create({
        frame: false,
        transparent: false,
        showTrafficLights: true,
    })

    win.value.setResizable(false)
    win.value.setMaximizable(false)
    win.value.setMinimizable(false)
    win.value.setAlwaysOnTop(true)
    win.value.setMovable(false)
    win.value.setTitle(`${appInfo.productName} - About`)
    win.value.setContentSize({ width: 420, height: 340 })
    win.value.onBlur = (self) => self.close()
    win.value.onClose = () => win.unref()

    let contentView
    if (process.platform === 'darwin') {
        contentView = gui.Vibrant.create()
        contentView.setMaterial('appearance-based')
        contentView.setBlendingMode('behind-window')
    } else {
        contentView = gui.Container.create()
    }
    contentView.setStyle({
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
    })

    win.value.setContentView(contentView)

    const appInfoContainer = gui.Container.create()
    contentView.addChildView(appInfoContainer)

    // Logo
    const logo = gui.GifPlayer.create()
    appInfoContainer.addChildView(logo)
    logo.setStyle({ marginBottom: 20 })
    logo.setImage(gui.Image.createFromPath(getResourcePath('icons', 'rclone-icon-color-64@2x.png')))
    logo.onClick = bindings.createEmitter('app/about/homepage')

    // App Info
    const appInfoLines = [
        appInfo.productName,
        appInfo.version,
        `by ${appInfo.author.replace(/(<.*>)/gm, '')}`,
        '',
        'Credits',
        '',
        'rclone from Nick Craig-Wood',
        'libyue from zcbenz',
    ]

    for (const appInfoLine of appInfoLines) {
        const line = gui.Label.create(appInfoLine)
        line.setAlign('center')
        appInfoContainer.addChildView(line)
    }

    const actionButtons = gui.Container.create()
    contentView.addChildView(actionButtons)
    actionButtons.setStyle({
        marginTop: '40px',
        flexDirection: 'row',
        justifyContent: 'space-between',
    })

    const actionButtonWebsite = gui.Button.create('Homepage')
    actionButtonWebsite.onClick = bindings.createEmitter('app/about/homepage')
    actionButtons.addChildView(actionButtonWebsite)

    const actionButtonIssue = gui.Button.create('Issues')
    actionButtonIssue.onClick = bindings.createEmitter('app/about/issues')
    actionButtons.addChildView(actionButtonIssue)

    const actionButtonLicense = gui.Button.create('License Notes')
    actionButtonLicense.onClick = bindings.createEmitter('app/about/license')
    actionButtons.addChildView(actionButtonLicense)

    const actionButtonRcloneWebsite = gui.Button.create('About Rclone')
    actionButtonRcloneWebsite.onClick = bindings.createEmitter('app/about/homepage_rclone')
    actionButtons.addChildView(actionButtonRcloneWebsite)

    win.value.center()
    win.value.activate()
}
