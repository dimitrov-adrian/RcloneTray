import gui from 'gui'
import bindings from '../bindings.js'
import appInfo from '../utils/app-info.js'
import winRef from '../utils/winref.js'
import formBuilder, { createTabs } from './form-builder.js'

export default function createBookmarkWindow({ isNew, type, providerConfig, name, values, bounds }) {
    const win = winRef()
    win.value = gui.Window.create({})

    win.value.setResizable(false)
    win.value.setMaximizable(false)
    if (isNew) {
        win.value.setTitle(`${appInfo.productName} - Create new ${type} bookmark`)
    } else {
        win.value.setTitle(`${appInfo.productName} - Edit ${name}`)
    }
    win.value.setContentSize({ width: 540, height: 600 })
    win.value.onClose = () => win.unref()

    const contentView = gui.Container.create()
    contentView.setStyle({
        padding: 10,
    })
    win.value.setContentView(contentView)

    const systemFields = formBuilder(
        [
            {
                $Disabled: true,
                Help: providerConfig.Description,
                Name: 'type',
            },
            {
                $Disabled: !isNew,
                Name: 'name',
            },
        ],
        {
            name: name || '',
            type: type,
        }
    )

    contentView.addChildView(systemFields.container)

    const [tabsContainer, tabsGetValue, tabsGetSize] = createTabs([
        {
            label: 'General',
            fields: providerConfig.Options,
            values: values,
        },
        {
            label: 'Advanced',
            fields: [],
        },
        {
            label: 'Mappings',
            fields: [],
        },
    ])
    contentView.addChildView(tabsContainer)

    const actionButtons = gui.Container.create()
    contentView.addChildView(actionButtons)
    actionButtons.setStyle({
        flexGrow: 0,
        flexShrink: 1,
        alignSelf: 'flex-end',
        flexDirection: 'row',
    })

    if (!isNew) {
        const actionButtonClone = gui.Button.create('Clone')
        actionButtonClone.setStyle({ marginRight: 20 })
        actionButtons.addChildView(actionButtonClone)

        actionButtonClone.onClick = () => {
            bindings.emit('app/clone', name)
            win.value.close()
        }
    }

    const actionButtonSave = gui.Button.create('Save')
    actionButtons.addChildView(actionButtonSave)
    actionButtonSave.onClick = () => {
        if (isNew) {
            bindings.emit('bookmark/create', {
                ...systemFields.getValues(),
                parameters: tabsGetValue(),
            })
        } else {
            bindings.emit('bookmark/update', {
                name,
                parameters: tabsGetValue(),
            })
        }
        win.value.close()
    }

    win.value.activate()
    win.value.center()
    if (bounds) {
        win.value.setBounds({
            ...win.value.getBounds(),
            ...bounds,
        })
    }

    return win.value
}
