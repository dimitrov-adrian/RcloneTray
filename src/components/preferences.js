import gui from 'gui'
import config from '../config.js'
import appInfo from '../utils/app-info.js'
import winRef from '../utils/winref.js'
import formBuilder from './form-builder.js'

const preferencesDefinition = {
    general: [
        {
            $Label: 'Auto launch',
            Name: 'auto_start',
            Type: 'bool',
        },
        {
            $Label: 'Theme',
            IsStringLocked: true,
            Name: 'theme',
            Type: 'string',
            Examples: [
                {
                    Value: 'auto',
                },
                {
                    Value: 'dark',
                },
                {
                    Value: 'light',
                },
            ],
        },
        {
            $Label: 'Show Type',
            Help: 'Show bookmarks type in the menu',
            Type: 'bool',
            Name: 'tray_menu_show_type',
        },
        {
            $Label: 'Show Status',
            Help: 'Show bookmark status indicator',
            Type: 'bool',
            Name: 'tray_menu_show_status',
        },
        {
            $Label: 'Short hosts',
            Help: 'Show bookmark host',
            Type: 'bool',
            Name: 'tray_menu_show_host',
        },
        {
            $Label: 'Order Bookmarks',
            IsStringLocked: true,
            Type: 'string',
            Name: 'order_bookmarks',
            Examples: [
                {
                    Help: 'Auto',
                    Value: 'auto',
                },
                {
                    Help: 'By Name',
                    Value: 'name',
                },
                {
                    Help: 'By Type',
                    Value: 'type',
                },
            ],
        },
        {
            $Label: 'Connected First',
            Help: 'Order connected bookmarks first',
            Type: 'bool',
            Name: 'tray_menu_connected_first',
        },
        {
            $Label: 'Show Dock',
            Help: 'Show Dock icon',
            Type: 'bool',
            Name: 'show_dock',
        },
    ],
    features: [
        {
            $Label: 'Enable mount menu',
            Type: 'bool',
            Name: 'allow_mounts',
            Default: false,
        },
        {
            $Label: 'Enable Push/Pull menu',
            Type: 'bool',
            Name: 'allow_pushpull',
            Default: false,
        },
        {
            $Label: 'Enable NCDU menu',
            Type: 'bool',
            Name: 'allow_ncdu',
            Default: false,
        },
        {
            $Label: 'Push on change delay',
            Type: 'number',
            Name: 'push_on_change_delay',
            Default: 2000,
        },
    ],
    advanced: [
        {
            $Label: 'Config',
            Type: 'string',
            IsFilePath: true,
            Name: 'rclone_config',
            $RequireRestart: true,
            Help: 'Changing this option require restart.',
            Provider: '',
            ShortOpt: '',
            Hide: 0,
            Required: false,
            IsPassword: false,
            NoPrefix: false,
            Advanced: false,
        },
        {
            Name: 'rclone_use_bundled',
            $Label: 'Use bundled Rclone',
            Type: 'bool',
            $RequireRestart: true,
            Help:
                'Use the Rclone binary that is bundled with the app, otherwise installed system wide version will be used (if not found, then you will receive and error).',
        },
        {
            Name: 'rclone_cache_files',
            $Label: 'File cache TTL (s)',
            Type: 'int',
            IsSuffix: 's',
        },
        {
            Name: 'rclone_cache_directories',
            $Label: 'Dir. cache TTL (s)',
            Type: 'int',
            IsSuffix: 's',
        },
        {
            $Label: 'Custom args',
            IsMultiline: true,
            Type: 'string',
            Name: 'custom_args',
            Help:
                'Space or new-line separated rclone command arguments to be appended to all commands.\nCheck more at https://rclone.org/docs/',
        },
    ],
}

export default async function createPreferencesWindow() {
    const win = winRef('preferences')

    if (win.value) {
        win.value.activate()
        return
    }

    win.value = gui.Window.create({})

    win.value.setResizable(false)
    win.value.setMaximizable(false)
    win.value.setTitle(`${appInfo.productName} - Preferences`)
    win.value.setContentSize({ width: 480, height: 480 })
    win.value.onClose = () => {
        storeWindowPosition()
        win.unref()
    }

    const contentView = gui.Container.create()
    contentView.setStyle({
        flex: 1,
        flexDirection: 'column',
        padding: 10,
    })

    win.value.setContentView(contentView)

    const tabs = gui.Tab.create()
    tabs.setStyle({
        flex: 1,
    })

    const tabContents = [
        {
            label: 'General',
            form: formBuilder(preferencesDefinition.general, config.store),
        },
        {
            label: 'Features',
            form: formBuilder(preferencesDefinition.features, config.store),
        },
        {
            label: 'Advanced',
            form: formBuilder(preferencesDefinition.advanced, config.store),
        },
    ]

    for (const tab of tabContents) {
        tabs.addPage(tab.label, tab.form.container)
    }

    tabs.onSelectedPageChange = () => resizeWindow()
    contentView.addChildView(tabs)

    const actionButtons = gui.Container.create()
    contentView.addChildView(actionButtons)
    actionButtons.setStyle({
        flexGrow: 0,
        flexShrink: 1,
        alignSelf: 'flex-end',
        flexDirection: 'row',
        margin: 10,
    })

    const noticeRestartRequired = gui.Label.create('Restart is required')
    noticeRestartRequired.setStyle({ marginRight: 40 })
    actionButtons.addChildView(noticeRestartRequired)

    const actionButtonSave = gui.Button.create('Save')
    actionButtonSave.onClick = () => {
        let values = {}
        for (const tab of tabContents) {
            values = { ...values, ...tab.form.getValues() }
        }
        config.set(values)
        win.value.close()
    }
    actionButtons.addChildView(actionButtonSave)

    win.value.activate()
    resizeWindow()
    restoreWindowPosition()

    function storeWindowPosition() {
        config.set('state.preferences.window', {
            x: Math.max(win.value.getBounds().x, 10),
            y: Math.max(win.value.getBounds().y, 10),
        })
    }

    function restoreWindowPosition() {
        const winLastState = config.get('state.preferences.window')
        if (winLastState) {
            win.value.setBounds({
                ...win.value.getBounds(),
                ...winLastState,
            })
        }
    }

    function resizeWindow() {
        const contentSize = tabContents[tabs.getSelectedPageIndex()].form.getSize()
        const winSize = {
            width: win.value.getContentSize().width,
            height: Math.min(contentSize.height + 120, 600),
        }
        win.value.setContentSize(winSize)
    }
}
