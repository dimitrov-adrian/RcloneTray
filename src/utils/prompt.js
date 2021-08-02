import { homedir } from 'os';
import gui from 'gui';
import open from 'open';
import { helpTextFont } from './gui-form-builder.js';
import packageJson from './package-json.js';
import ref from './ref.js';

// @TODO    Promiseify the prompt functions
//          it's not possible right now as libyue has some
//          issue with that so the whole app crashes
//          v0.9.6

/**
 * @param {{
 *  title: string,
 *  message?: string|Error,
 *  parentWindow?: gui.Window,
 *  }} options
 * @param {(result: boolean) => void=} resolve
 * @returns {void}
 */
export function promptError({ title, message, parentWindow }, resolve) {
    const win = ref();
    win.value = gui.MessageBox.create();
    win.value.setType('error');
    win.value.setText(title);
    message && win.value.setInformativeText(message.toString());
    win.value.addButton('OK', 1);
    win.value.onResponse = (self, result) => {
        win.unref();
        if (resolve) {
            resolve(true);
        }
    };
    process.platform === 'darwin' && gui.app.activate(true);
    if (parentWindow) {
        win.value.showForWindow(parentWindow);
    } else if (process.platform === 'darwin') {
        win.value.run();
    } else {
        win.value.show();
    }
}

/**
 * @param {{
 *  title: string,
 *  message?: string|Error,
 *  parentWindow?: gui.Window,
 *  }} options
 * @param {(result: boolean) => void=} resolve
 * @returns {void}
 */
export function promptInfo({ title, message, parentWindow }, resolve) {
    const win = ref();
    win.value = gui.MessageBox.create();
    win.value.setType('none');
    win.value.setText(title);
    message && win.value.setInformativeText(message.toString());
    win.value.addButton('OK', 1);
    win.value.onResponse = (self, result) => {
        win.unref();
        if (resolve) {
            resolve(result === 1);
        }
    };
    process.platform === 'darwin' && gui.app.activate(true);
    if (parentWindow) {
        win.value.showForWindow(parentWindow);
    } else if (process.platform === 'darwin') {
        win.value.run();
    } else {
        win.value.show();
    }
}

/**
 * @param {{
 *  title: string,
 *  message?: string,
 *  parentWindow?: gui.Window,
 *  }} options
 * @param {(result: boolean, parent?: gui.Window) => void=} resolve
 * @returns {void}
 */
export function promptYesNo({ title, message, parentWindow }, resolve) {
    const win = ref();
    win.value = gui.MessageBox.create();
    win.value.setType('warning');
    win.value.setDefaultResponse(0);
    win.value.setCancelResponse(0);
    win.value.setText(title);
    message && win.value.setInformativeText(message.toString());
    win.value.addButton('Yes', 1);
    win.value.addButton('No', 0);
    win.value.onResponse = (self, result) => {
        win.unref();
        if (resolve) {
            resolve(result === 1);
        }
    };
    process.platform === 'darwin' && gui.app.activate(true);
    if (parentWindow) {
        win.value.showForWindow(parentWindow);
    } else if (process.platform === 'darwin') {
        win.value.run();
    } else {
        win.value.show();
    }
}

/**
 * @param {{
 *  title: string,
 *  message?: string|Error,
 *  parentWindow?: gui.Window,
 *  }} options
 * @param {(result: boolean) => void=} resolve
 * @returns {void}
 */
export function promptErrorReporting({ title, message, parentWindow }, resolve) {
    const win = ref();
    win.value = gui.MessageBox.create();
    win.value.setType('error');
    win.value.setText(title);
    win.value.addButton('Report Error', 1);
    win.value.addButton('Ignore', 2);
    message && win.value.setInformativeText(message.toString());

    const plainTextReport =
        typeof message === 'string'
            ? message
            : message instanceof Error
            ? message.toString() + '\n' + message.stack.replace(new RegExp(homedir(), 'g'), '***')
            : JSON.stringify(message);

    win.value.onResponse = (self, result) => {
        win.unref();
        if (result === 1) {
            const link =
                packageJson.bugs.url +
                '/new?title=' +
                encodeURIComponent(title) +
                '&body=' +
                encodeURIComponent(plainTextReport);
            open(link);
            if (resolve) {
                resolve(true);
            }
        }
    };
    process.platform === 'darwin' && gui.app.activate(true);
    if (parentWindow) {
        win.value.showForWindow(parentWindow);
    } else if (process.platform === 'darwin') {
        win.value.run();
    } else {
        win.value.show();
    }
}

/**
 * @param {{
 *  label: string,
 *  buttonText:? string,
 *  helpText:? string,
 *  type?: ''|'password',
 *  required?: boolean,
 *  resolve?: (result: string) => void,
 *  reject?: () => void,
 *  parentWindow?: gui.Window,
 *  validator?: (result: string, invalidAttempts: number) => Error|void,
 *  }} options
 * @returns {gui.Window}
 */
export function promptInput(options) {
    const win = ref();
    if (win.value) return win.value;

    let isSuccess = false;
    let invalidAttempts = 0;
    const maxHeight = options.helpText ? 140 : 100;

    win.value = gui.Window.create({
        frame: process.platform !== 'darwin' && !options.required,
        transparent: false,
        showTrafficLights: !options.required,
    });
    win.value.setAlwaysOnTop(true);
    win.value.setContentSize({ width: 340, height: maxHeight });
    win.value.setContentSizeConstraints({ width: 340, height: maxHeight }, { width: 460, height: maxHeight });
    win.value.setTitle(`${options.label || ''} - ${packageJson.build.productName || packageJson.name}`);
    win.value.setResizable(true);
    win.value.setMaximizable(false);
    win.value.setMinimizable(false);
    win.value.onClose = (self) => {
        win.unref();
        if (!isSuccess && options.reject) {
            options.reject();
        }
    };

    if (options.required) {
        win.value.shouldClose = () => isSuccess;
    }

    if (options.parentWindow) {
        options.parentWindow.addChildWindow(win.value);
    }

    const contentView = createContentView();
    contentView.setStyle({
        paddingTop: process.platform !== 'darwin' ? 10 : 32,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 20,
    });
    win.value.setContentView(contentView);

    const labelField = gui.Label.create(options.label || '');
    labelField.setAlign('start');
    contentView.addChildView(labelField);

    const fieldWrapper = gui.Container.create();
    contentView.addChildView(fieldWrapper);
    fieldWrapper.setStyle({ flexDirection: 'row', flex: 0, marginTop: 10 });

    const inputField = gui.Entry.createType(options.type || 'normal');
    inputField.setStyle({ flex: 1 });
    fieldWrapper.addChildView(inputField);
    inputField.focus();
    inputField.onActivate = resolveAction;

    const resolveButton = gui.Button.create(options.buttonText || 'OK');
    resolveButton.setStyle({ flex: 0, marginLeft: 10 });
    resolveButton.onClick = resolveAction;
    fieldWrapper.addChildView(resolveButton);

    if (options.helpText) {
        const providerDescription = gui.Label.createWithAttributedText(
            gui.AttributedText.create(options.helpText, { font: helpTextFont })
        );
        providerDescription.setAlign('start');
        providerDescription.setVAlign('start');
        providerDescription.setStyle({ marginTop: 10 });
        contentView.addChildView(providerDescription);
    }

    win.value.onFocus = () => inputField.focus();
    win.value.center();
    win.value.setVisible(true);
    win.value.activate();
    return win.value;

    function resolveAction() {
        if (options.validator) {
            const error = options.validator(inputField.getText(), invalidAttempts);
            if (error) {
                invalidAttempts++;
                const errWindow = gui.MessageBox.create();
                errWindow.setType('error');
                errWindow.setText(error.toString());
                errWindow.showForWindow(win.value);
                return;
            }
        }

        isSuccess = true;

        if (options.resolve) {
            options.resolve(inputField.getText());
        }

        if (win.value) {
            win.value.close();
        } else if (win) {
            win.unref();
        }
    }
}

function createContentView() {
    if (process.platform === 'darwin') {
        const contentView = gui.Vibrant.create();
        contentView.setMaterial('appearance-based');
        contentView.setBlendingMode('behind-window');
        return contentView;
    } else {
        return gui.Container.create();
    }
}
