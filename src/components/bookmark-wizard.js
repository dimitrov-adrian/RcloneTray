import gui from 'gui'
import bindings from '../bindings.js'
import { getProviders } from '../rcloned.js'
import appInfo from '../utils/app-info.js'
import winRef from '../utils/winref.js'

export default function createBookmarkWizardWindow() {
    const win = winRef('createwizard')

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
    win.value.setTitle(`${appInfo.productName} new bookmark`)
    win.value.setContentSize({ width: 480, height: 200 })
    win.value.onClose = () => win.unref()

    let contentView
    if (process.platform === 'darwin') {
        contentView = gui.Vibrant.create()
        contentView.setMaterial('appearance-based')
    } else {
        contentView = gui.Container.create()
    }
    contentView.setStyle({
        flex: 1,
        flexDirection: 'column',
        padding: 10,
        paddingTop: 40,
        justifyContent: 'space-between',
    })
    win.value.setContentView(contentView)

    const label = gui.Label.create('Select provider')
    label.setAlign('start')
    contentView.addChildView(label)

    const picker = gui.Picker.create()
    picker.setEnabled(false)
    contentView.addChildView(picker)

    const providerDescription = gui.Label.create('')
    providerDescription.setAlign('start')
    providerDescription.setVAlign('start')
    providerDescription.setStyle({ height: 60 })
    contentView.addChildView(providerDescription)

    getProviders().then((result) => {
        picker._providers = result.map((item) => ({
            prefix: item.Prefix,
            name: item.Name,
            description: item.Description,
        }))
        for (const provider of picker._providers) {
            picker.addItem(provider.name)
        }
        picker.setEnabled(true)
    })

    picker.onSelectionChange = (picker) => {
        const selected = picker._providers[picker.getSelectedItemIndex()]
        providerDescription.setText(selected.description)
    }

    const actionButtons = gui.Container.create()
    contentView.addChildView(actionButtons)
    actionButtons.setStyle({
        flexGrow: 0,
        flexShrink: 1,
        alignSelf: 'flex-end',
        flexDirection: 'row',
    })

    const actionButtonNext = gui.Button.create('Next')
    actionButtonNext.onClick = () => {
        const selected = picker._providers[picker.getSelectedItemIndex()]
        bindings.emit('app/new_bookmark', selected.prefix, win.value.getBounds())
        win.value.close()
    }
    actionButtons.addChildView(actionButtonNext)

    win.value.activate()
    win.value.center()
}
