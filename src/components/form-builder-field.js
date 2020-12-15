import gui from 'gui'

export default function createField(fieldDefinition, value) {
    const theField = gui.Entry.create()

    theField.setStyle({
        // width: 200,
        marginRight: 20,
    })

    if (value) {
        theField.setText(value.toString())
    }

    if (fieldDefinition.$Disabled) {
        theField.setEnabled(false)
    }

    return [theField, getValue]

    function getValue() {
        return theField.getText()
    }
}
