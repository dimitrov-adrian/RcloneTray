import gui from 'gui'
import opener from 'opener'
import appInfo from '../utils/app-info.js'
import winRef from '../utils/winref.js'

/**
 * @param {String} title
 * @param {String} message
 * @returns {Number}
 */
export function errorDialog(title, message) {
    const win = gui.MessageBox.create()
    win.setType('error')
    win.setText(title)
    win.setInformativeText(message)
    win.addButton('OK', 1)
    gui.app.activate(true)
    return win.run()
}

/**
 * @param {String} title
 * @param {String} message
 * @returns {Number}
 */
export function messageDialog(title, message) {
    const win = gui.MessageBox.create()
    win.setType('none')
    win.setText(title)
    win.setInformativeText(message)
    win.addButton('OK', 1)
    gui.app.activate(true)
    return win.run()
}

/**
 * @param {String} title
 * @param {String} message
 * @returns {Number}
 */
export function reportErrorDialog(title, message) {
    const win = gui.MessageBox.create()
    win.setType('error')
    win.setText(title)
    win.addButton('Send', 1)
    win.addButton("Don't send", 2)
    gui.app.activate(true)

    const plainTextReport =
        typeof message === 'string'
            ? message
            : message instanceof Error
            ? message.toString() + '\n' + message.stack
            : JSON.stringify(message)

    const response = win.run()
    if (response === 1) {
        opener(appInfo.generateReportLink(title, plainTextReport))
    }
}

/**
 * @param {{
 *  label: String,
 *  buttonText:? String,
 *  type?: ''|'password',
 *  resolve?: CallableFunction,
 *  reject?: CallableFunction
 *  }} options
 * @returns {gui.Window}
 */
export function promptDialog(options) {
    // @TODO promiseify the function, right now it has some error when do that.
    const win = winRef()
    win.value = gui.Window.create({
        frame: false,
        transparent: false,
        showTrafficLights: true,
    })

    win.value.setAlwaysOnTop(true)
    win.value.setContentSize({ width: 340, height: 100 })
    win.value.setTitle(`${options.label || ''} - ${appInfo.productName}`)
    win.value.setResizable(false)
    win.value.setMaximizable(false)
    win.value.setMinimizable(false)

    let contentView
    if (process.platform === 'darwin') {
        contentView = gui.Vibrant.create()
        contentView.setMaterial('appearance-based')
    } else {
        contentView = gui.Container.create()
    }

    const wrapper = gui.Container.create()
    wrapper.setStyle({
        paddingTop: 32,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 20,
    })

    contentView.setStyle({
        flexDirection: 'row',
        flex: 0,
        marginTop: 10,
    })

    const labelField = gui.Label.create(options.label || '')
    labelField.setAlign('start')
    wrapper.addChildView(labelField)

    win.value.setContentView(wrapper)
    wrapper.addChildView(contentView)

    let inputField = null
    if (options.type === 'password') {
        inputField = gui.Entry.createType('password')
    } else {
        inputField = gui.Entry.create()
    }
    inputField.setStyle({ flex: 1 })
    contentView.addChildView(inputField)

    const resolveButton = gui.Button.create(options.buttonText || 'OK')
    resolveButton.setStyle({ flex: 0, marginLeft: 30, width: 30 })

    contentView.addChildView(resolveButton)

    win.value.center()
    win.value.activate()

    resolveButton.onClick = () => {
        if (options.validator) {
            const error = options.validator(inputField.getText())
            if (error) {
                const errWindow = gui.MessageBox.create()
                errWindow.setType('error')
                errWindow.setText(error.toString())
                errWindow.runForWindow(win.value)
                return
            }
        }
        if (options.resolve) {
            options.resolve(inputField.getText())
        }
        win.value.$success = true
        win.value.close()
    }

    win.value.onClose = () => {
        if (!win.value.$success && options.reject) {
            options.reject()
        }
        win.unref()
    }

    return win.value
}

export default {
    messageDialog,
    errorDialog,
    reportErrorDialog,
    promptDialog,
}
