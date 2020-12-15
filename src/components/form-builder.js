import formatTitle from '@directus/format-title'
import gui from 'gui'
import createField from './form-builder-field.js'

export function createFieldContainer(fieldDefinition, initialValues) {
    const labelText =
        (fieldDefinition.Required ? '*' : '') + formatTitle(fieldDefinition.$Label || fieldDefinition.Name)

    const id = fieldDefinition.Name

    const wrapper = gui.Container.create()
    wrapper.setStyle({
        alignItems: 'flex-start',
        marginBottom: 20,
        flexDirection: 'row',
    })

    const labelField = gui.Label.create(labelText)
    labelField.setAlign('end')
    labelField.setVAlign('start')
    labelField.setStyle({
        width: 140,
        alignContent: 'center',
        marginRight: 20,
    })

    const fieldContainer = gui.Container.create()
    fieldContainer.setStyle({
        flexGrow: 1,
        flexDirection: 'column',
    })

    wrapper.addChildView(labelField)
    wrapper.addChildView(fieldContainer)

    const value = initialValues && id in initialValues ? initialValues[id] : undefined
    const [theField, getValue] = createField(fieldDefinition, value)
    fieldContainer.addChildView(theField)

    if (fieldDefinition.Help) {
        const hintAttributedLabel = gui.AttributedText.create(fieldDefinition.Help, {})
        hintAttributedLabel.setFormat({
            ellipsis: true,
            wrap: true,
        })
        hintAttributedLabel.setFont(gui.Font.create('', 11, 'normal', 'normal'))
        const hintLabelField = gui.Label.createWithAttributedText(hintAttributedLabel)
        hintLabelField.setAlign('start')
        hintLabelField.setStyle({ width: 240, marginTop: 4, marginBottom: 3 })
        fieldContainer.addChildView(hintLabelField)
    }

    return {
        container: wrapper,
        getValue,
        id,
    }
}

export default function formBuilder(fieldsDefinition, initialValues) {
    const container = gui.Container.create()
    container.setStyle({
        flexDirection: 'column',
        padding: 10,
    })

    const fields = Object.values(fieldsDefinition).map((fieldDefinition) =>
        createFieldContainer(fieldDefinition, initialValues)
    )

    fields.forEach((field) => {
        container.addChildView(field.container)
    })

    const thescroll = gui.Scroll.create()
    thescroll.setContentView(container)
    thescroll.setOverlayScrollbar(true)
    thescroll.setContentSize(container.getPreferredSize())

    container.onDraw = () => {
        const isSmaller = container.getParent().getBounds().height < container.getPreferredSize().height
        thescroll.setScrollbarPolicy('never', isSmaller ? 'automatic' : 'never')
        if (isSmaller) {
            thescroll.setStyle({
                width: thescroll.getContentSize().width,
                height: container.getPreferredSize().height,
            })
        }
    }

    return {
        container: thescroll,
        getValues,
        getSize,
    }

    function getSize() {
        return container.getPreferredSize()
    }

    function getValues() {
        const value = {}
        for (const field of fields) {
            value[field.id] = field.getValue()
        }
        return value
    }
}

export function createTabs(tabsDefinition) {
    const tabsContainer = gui.Tab.create()
    tabsContainer.setStyle({
        flex: 1,
    })

    const tabsForms = []

    for (const tabInfo of tabsDefinition) {
        const form = formBuilder(tabInfo.fields, tabInfo.values)
        tabsForms.push(form)
        tabsContainer.addPage(tabInfo.label, form.container)
    }

    return [
        tabsContainer,
        function getValues() {
            let result = {}
            for (const tabForm of tabsForms) {
                result = {
                    ...result,
                    ...tabForm.getValues(),
                }
            }
            return result
        },
        function getSize() {
            return tabsForms[tabsContainer.getSelectedPageIndex()].getSize()
        },
    ]
}
