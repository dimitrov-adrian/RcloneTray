import gui from 'gui';
import parse from 'parse-duration';
import { debounce } from './debounce.js';
import { formatTitle, sanitizeSizeSuffix } from './formatter.js';

/**
 * @typedef {{
 *  container: gui.Tab|gui.Container|gui.View,
 *  getValues: () => Record<string, any>,
 *  getSize: () => gui.SizeF,
 * }} Form
 *
 * @typedef {{
 *  description: string,
 *  extensions: string[],
 *  Help?: string,
 * }} FileDialogFilter
 *
 * @typedef {{
 *  Title?: string,
 *  OnChange?: CallableFunction,
 *  Readonly?: boolean,
 *  Disable?: boolean,
 *  Enums?: import('../services/rclone.js').RcloneProviderOptionOptionsItem[],
 *  FileDialog?: 'file' | 'files' | 'folder',
 *  FileDialogFilter?: FileDialogFilter[],
 * } & import('../services/rclone.js').RcloneProviderOption} FieldDefinition
 *
 * @typedef {{
 *  label: string,
 *  fields: FieldDefinition[],
 *  enableScroll?: boolean
 * }} FieldDefinitionGroup
 *
 * @typedef {() => import('../services/rclone.js').RcloneProviderOptionValue} FieldValueCallback
 */

/**
 * @type {gui.Font}
 */
export const helpTextFont = gui.Font.create('', 10, 'normal', 'normal');

/**
 * @param {object} objectTree
 * @param {string} path
 * @returns {*=}
 */
function deepValue(objectTree, path) {
    return path.split('.').reduce((a, v) => a[v], objectTree);
}

/**
 * @param {FieldDefinition[]} fields
 * @param {{}} values
 */
export function assignFieldsValues(fields, values) {
    return fields.map((field) => ({
        ...field,
        Value: values[field.Name] || deepValue(values, field.Name) || field.Value || field.Default || null,
    }));
}

/**
 * @param {gui.Container} view
 */
function scrollRedraw(view) {
    const isSmaller = view.getParent().getBounds().height < view.getPreferredSize().height;
    // @ts-ignore
    view.getParent().setScrollbarPolicy('never', isSmaller ? 'automatic' : 'never');
}

/**
 * @param {FieldDefinition[]} fieldsDefinition
 * @param {boolean=} enableScroll
 * @returns {Form}
 */
export function createForm(fieldsDefinition, enableScroll) {
    const container = gui.Container.create();
    container.setStyle({ flexDirection: 'column', padding: 10 });

    const fields = Object.values(fieldsDefinition)
        .filter((fieldsDefinition) => !fieldsDefinition.Disable)
        .map((fieldDefinition) => createFormField(fieldDefinition));

    fields.forEach((field) => container.addChildView(field.container));

    if (enableScroll) {
        const thescroll = gui.Scroll.create();
        thescroll.setContentView(container);
        thescroll.setContentSize(container.getPreferredSize());

        if (process.platform !== 'win32') {
            thescroll.setOverlayScrollbar(true);
        }

        // if (process.platform === 'darwin') {
        // macOS have different behaviour when have connected mouse
        container.onDraw = debounce(scrollRedraw);
        scrollRedraw(container);
        // }

        return {
            container: thescroll,
            getValues,
            getSize,
        };
    }

    return {
        container,
        getValues,
        getSize,
    };

    function getSize() {
        return container.getPreferredSize();
    }

    function getValues() {
        return Object.assign({}, ...fields.map((i) => i.getValue()));
    }
}

/**
 * @param {FieldDefinitionGroup[]} tabsDefinition
 * @returns {Form}
 */
export function createTabbedForm(tabsDefinition) {
    const tabsContainer = gui.Tab.create();
    tabsContainer.setStyle({ flex: 1 });

    const tabsForms = [];

    for (const tabInfo of tabsDefinition) {
        if (tabInfo.fields && tabInfo.fields.length > 0) {
            const form = createForm(tabInfo.fields, tabInfo.enableScroll);
            tabsContainer.addPage(tabInfo.label, form.container);
            tabsForms.push(form);
        }
    }

    return {
        getValues,
        getSize,
        container: tabsContainer,
    };

    /**
     * @returns {object}
     */
    function getValues() {
        return Object.assign({}, ...tabsForms.map((i) => i.getValues()));
    }

    /**
     * @returns {gui.SizeF}
     */
    function getSize() {
        return tabsForms[tabsContainer.getSelectedPageIndex()].getSize();
    }
}

/**
 * @param {FieldDefinition} fieldDefinition
 */
export function createFormField(fieldDefinition) {
    const labelText =
        (fieldDefinition.Required ? '*' : '') + (fieldDefinition.Title || formatTitle(fieldDefinition.Name));

    const wrapper = gui.Container.create();
    wrapper.setStyle({
        alignItems: 'flex-start',
        marginBottom: 20,
        flexDirection: 'row',
    });

    const labelField = gui.Label.create(labelText);
    labelField.setAlign('end');
    labelField.setVAlign('start');
    labelField.setStyle({
        width: 140,
        alignContent: 'center',
        marginRight: 20,
    });

    const fieldContainer = gui.Container.create();
    fieldContainer.setStyle({ flexGrow: 1, flexDirection: 'column' });

    wrapper.addChildView(labelField);
    wrapper.addChildView(fieldContainer);

    const [theField, getFieldValue] = createField(fieldDefinition);

    if (fieldDefinition.Readonly) {
        theField.setFocusable(false);
        theField.setEnabled(false);
    }

    fieldContainer.addChildView(theField);

    if (fieldDefinition.Help) {
        const hintAttributedLabel = gui.AttributedText.create(fieldDefinition.Help, {
            font: helpTextFont,
        });
        hintAttributedLabel.setFormat({
            ellipsis: true,
            wrap: true,
        });
        const hintLabelField = gui.Label.createWithAttributedText(hintAttributedLabel);
        hintLabelField.setAlign('start');
        hintLabelField.setStyle({ width: 280, marginTop: 4, marginBottom: 3 });
        fieldContainer.addChildView(hintLabelField);
    }

    if (fieldDefinition.Hide) {
        wrapper.setVisible(false);
        wrapper.setStyle({ height: 0 });
    }

    return {
        container: wrapper,
        getValue,
    };

    function getValue() {
        return {
            [fieldDefinition.Name]: getFieldValue(),
        };
    }
}

/**
 * @TODO separate in own functions
 * @param {FieldDefinition} fieldDefinition
 * @returns {[gui.View, () => boolean | string | number | null ]}
 */
function createField(fieldDefinition) {
    if (fieldDefinition.Examples) {
        const wrapper = gui.Container.create();

        const field = gui.ComboBox.create();
        for (const option of fieldDefinition.Examples) {
            field.addItem(option.Value.toString());
        }
        if (fieldDefinition.Value) {
            const selected = fieldDefinition.Examples.find((item) => item.Value == field.getText());
            if (!selected) {
                field.addItem(fieldDefinition.Value.toString());
            }
            field.setText(fieldDefinition.Value.toString());
        }

        const updateHelp = () => {
            const item = fieldDefinition.Examples.find((i) => i.Value == field.getText());
            if (item) {
                optionHelpLabel.setVisible(true);
                const optionHelpText = gui.AttributedText.create(item.Help, {
                    font: helpTextFont,
                });
                optionHelpText.setFormat({ ellipsis: true, wrap: true });
                optionHelpLabel.setAttributedText(optionHelpText);
            } else {
                optionHelpLabel.setVisible(false);
            }
        };

        const optionHelpLabel = gui.Label.create('\0');
        optionHelpLabel.setStyle({ width: 340, marginTop: 4, marginBottom: 3 });

        field.onTextChange = () => {
            if (fieldDefinition.OnChange) {
                fieldDefinition.OnChange(field.getText());
            }
            updateHelp();
        };

        updateHelp();
        wrapper.addChildView(field);
        wrapper.addChildView(optionHelpLabel);

        return [wrapper, () => field.getText()];
    }

    if (fieldDefinition.Enums) {
        const field = gui.Picker.create();
        fieldDefinition.Enums.forEach((item, index) => {
            field.addItem((item.Name || item.Value || '').toString());
            if (fieldDefinition.Value === item.Value) {
                field.selectItemAt(index);
            }
        });

        const getValue = () => {
            const v = fieldDefinition.Enums[field.getSelectedItemIndex()].Value;
            if (fieldDefinition.Type === 'int') {
                return parseInt(v.toString());
            } else if (fieldDefinition.Type === 'bool') {
                return !!v.toString();
            }
            return v;
        };

        if (fieldDefinition.OnChange) {
            field.onSelectionChange = () => fieldDefinition.OnChange(getValue(), field.getSelectedItemIndex());
        }

        return [field, getValue];
    }

    if (fieldDefinition.Type === 'string' && fieldDefinition.FileDialog) {
        const wrapper = gui.Container.create();
        wrapper.setStyle({ flexDirection: 'row' });

        const textField = gui.Entry.createType('normal');
        textField.setStyle({ flex: 1, flexGrow: 1 });
        if (fieldDefinition.Value) {
            textField.setText(fieldDefinition.Value.toString());
        }
        wrapper.addChildView(textField);

        const browseButton = gui.Button.create('Browse');
        wrapper.addChildView(browseButton);
        browseButton.setStyle({ flex: 1, flexGrow: 0, marginLeft: 10 });
        browseButton.onClick = fileDialogSetter.bind(null, fieldDefinition, textField, browseButton);
        if (fieldDefinition.OnChange) {
            textField.onTextChange = () => fieldDefinition.OnChange(textField.getText());
        }

        return [wrapper, () => textField.getText()];
    }

    if (fieldDefinition.Type === 'bool') {
        const field = gui.Button.create({ type: 'checkbox' });
        if (process.platform === 'win32') {
            // bug in libyue, it need height in windows
            field.setStyle({ height: 20 });
        }
        if (fieldDefinition.Value === true || fieldDefinition.Value === 'true') {
            field.setChecked(true);
        }
        if (fieldDefinition.OnChange) {
            field.onClick = () => fieldDefinition.OnChange(field.isChecked());
        }
        return [
            field,
            () => {
                if (fieldDefinition.Required && !field.isChecked()) {
                    throw Error(fieldDefinition.Name + ' is required');
                }
                return field.isChecked();
            },
        ];
    }

    if (fieldDefinition.Type === 'CommaSepList') {
        const field = gui.TextEdit.create();
        if (fieldDefinition.Value) {
            field.setText(fieldDefinition.Value.toString());
        }
        if (fieldDefinition.OnChange) {
            field.onTextChange = () => fieldDefinition.OnChange(field.getText());
        }
        return [field, () => field.getText()];
    }

    if (fieldDefinition.Type === 'int') {
        const field = gui.Entry.createType('normal');
        if (fieldDefinition.Value) {
            field.setText(fieldDefinition.Value.toString());
        }
        if (fieldDefinition.OnChange) {
            field.onTextChange = () => fieldDefinition.OnChange(field.getText());
        }
        return [
            field,
            () => {
                const v = parseInt(field.getText().trim());
                if (field.getText() && isNaN(v)) {
                    throw Error(fieldDefinition.Name + ' is not a number');
                }
                if (fieldDefinition.Required && !field.getText()) {
                    throw Error(fieldDefinition.Name + ' is required');
                }
                return v || 0;
            },
        ];
    }

    if (fieldDefinition.Type === 'Duration') {
        const field = gui.Entry.create();
        field.setText((fieldDefinition.Value || fieldDefinition.Default || '').toString());
        return [
            field,
            () => {
                const v = parse(field.getText(), 'millisecond');
                if (field.getText() && isNaN(v)) {
                    throw Error(fieldDefinition.Name + ' is not a number');
                }
                if (fieldDefinition.Required && !v) {
                    throw Error(fieldDefinition.Name + ' is required');
                }
                return v;
            },
        ];
    }

    if (fieldDefinition.Type === 'SizeSuffix') {
        const field = gui.Entry.createType('normal');
        return [
            field,
            () => {
                const v = sanitizeSizeSuffix(field.getText());
                if (!v && fieldDefinition.Required) {
                    throw Error(fieldDefinition.Name + ' is required');
                }
                return v;
            },
        ];
    }

    if (fieldDefinition.Type === 'string' && fieldDefinition.IsPassword) {
        const field = gui.Entry.createType('password');
        if (fieldDefinition.Value) {
            field.setText(fieldDefinition.Value.toString());
        }
        if (fieldDefinition.OnChange) {
            field.onTextChange = () => fieldDefinition.OnChange(field.getText());
        }
        return [field, () => field.getText()];
    }

    const field = gui.Entry.createType('normal');
    if (fieldDefinition.Value) {
        field.setText(fieldDefinition.Value.toString());
    }
    if (fieldDefinition.OnChange) {
        field.onTextChange = () => fieldDefinition.OnChange(field.getText());
    }
    return [
        field,
        () => {
            const v = field.getText();
            if (fieldDefinition.Required && !field.getText()) {
                throw Error(fieldDefinition.Name + ' is required');
            }
            return v;
        },
    ];
}

/**
 * @param {FieldDefinition} fieldDefinition
 * @param {gui.Entry} textField
 * @param {gui.Button} browseButton
 */
function fileDialogSetter(fieldDefinition, textField, browseButton) {
    const fileDialog = gui.FileOpenDialog.create();
    fileDialog.setTitle(formatTitle(fieldDefinition.Name));

    if (fieldDefinition.FileDialog === 'folder') {
        fileDialog.setOptions(1);
    }

    if (fieldDefinition.FileDialog === 'file') {
        fileDialog.setOptions(0);
    }

    if (fieldDefinition.FileDialog === 'files') {
        fileDialog.setOptions(2);
    }

    if (fieldDefinition.FileDialogFilter) {
        fileDialog.setFilters(fieldDefinition.FileDialogFilter);
    }

    if (fieldDefinition.Value) {
        fileDialog.setFilename(fieldDefinition.Value.toString());
    }

    // It seems that on libyue v0.9.6 it cannot get reference of parent window
    if (browseButton.getWindow()) {
        if (!fileDialog.runForWindow(browseButton.getWindow())) return;
    } else if (!fileDialog.run()) return;

    if (fieldDefinition.FileDialog === 'files') {
        textField.setText(fileDialog.getResults().join(':'));
    } else {
        textField.setText(fileDialog.getResult().toString());
    }
}
