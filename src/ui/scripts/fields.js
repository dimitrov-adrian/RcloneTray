'use strict'

/**
 * @returns {{}}
 */
window.fieldRowProviderDepenencies = {
  registry: [],

  add: function (item) {
    this.registry.push(item)
  },

  select: function (value) {
    this.registry.forEach(function (item) {
      let invert = item.rule.substr(0, 1) === '!'
      let rule = (invert ? item.rule.substr(1) : item.rule).split(',')
      let match = rule.indexOf(value) > -1
      match = invert ? !match : match
      if (match) {
        item.row.style.display = null
        item.row.querySelectorAll('input,textarea,select').forEach(function (input) {
          input.disabled = null
        })
      } else {
        item.row.style.display = 'none'
        item.row.querySelectorAll('input,textarea,select').forEach(function (input) {
          input.disabled = 'disabled'
        })
      }
    })
  }
}

/**
* Create new row
* @param {{}} fieldDefinition
* @param {string} value
* @param {string} fieldName
* @returns {HTMLElement}
*/
window.createFieldRow = function (fieldDefinition, value, fieldName) {
  let row = document.createElement('div')
  let th = document.createElement('div')
  let td = document.createElement('div')

  let inputField = document.createElement('input')
  if ('$type' in fieldDefinition && fieldDefinition.$type === 'text') {
    inputField = document.createElement('textarea')
  } else if ('$type' in fieldDefinition && fieldDefinition.$type === 'select') {
    inputField = document.createElement('select')
  }

  let fieldHelpText = document.createElement('div')
  row.className = 'row'
  th.className = 'cell-left'
  td.className = 'cell-right'

  // Setup row.
  row.appendChild(th)
  row.appendChild(td)

  if (fieldDefinition.Provider) {
    window.fieldRowProviderDepenencies.add({
      rule: fieldDefinition.Provider,
      row: row
    })
  }

  // Setup the input field.
  inputField.name = fieldName || 'options[' + fieldDefinition.Name + ']'
  inputField.id = 'field_' + fieldDefinition.Name
  inputField.placeholder = fieldDefinition.Default || ''
  inputField.value = ''

  // Assign values.
  if (fieldDefinition.$type === 'boolean') {
    if ([true, 1, 'true'].indexOf(value) > -1) {
      inputField.checked = 'checked'
    }
  } else if (fieldDefinition.$type !== 'password') {
    inputField.value = (value || '').toString()
  }

  td.appendChild(inputField)

  if ('$type' in fieldDefinition) {
    if (fieldDefinition.$type === 'boolean') {
      inputField.type = 'checkbox'
      inputField.value = 'true'
    } else if (fieldDefinition.$type === 'numeric') {
      inputField.type = 'number'
    } else if (fieldDefinition.$type === 'password') {
      inputField.type = 'password'
    } else if (fieldDefinition.$type === 'directory') {
      let browseButton = document.createElement('button')
      browseButton.className = 'margin-v'
      browseButton.innerText = 'Browse'
      browseButton.addEventListener('click', function (event) {
        event.preventDefault()
        window.selectDirectory(inputField.value, function (selectedDirectory) {
          if (selectedDirectory) {
            inputField.value = selectedDirectory[0]
          }
        })
      })
      inputField.parentNode.insertBefore(browseButton, inputField.nextSibling)
    } else if (fieldDefinition.$type === 'file') {
      let browseButton = document.createElement('button')
      browseButton.className = 'margin-v'
      browseButton.innerText = 'Browse'
      browseButton.addEventListener('click', function (event) {
        event.preventDefault()
        window.selectFile(inputField.value, function (selectedFile) {
          if (selectedFile) {
            inputField.value = selectedFile[0]
          }
        })
      })
      inputField.parentNode.insertBefore(browseButton, inputField.nextSibling)
    } else if (fieldDefinition.$type === 'select') {
      fieldDefinition.Examples.forEach(function (item) {
        if (item.Value) {
          let selectOption = document.createElement('option')
          selectOption.value = item.Value
          selectOption.innerText = item.Value
          if (value === item.Value) {
            selectOption.selected = 'selected'
          }
          inputField.appendChild(selectOption)
        }
      })
    }
  }

  // Set examples
  if (fieldDefinition.Examples && fieldDefinition.$type !== 'boolean' && fieldDefinition.$type !== 'select') {
    let inputFieldOptions = document.createElement('datalist')
    inputFieldOptions.id = inputField.id + '_datalist'
    inputField.setAttribute('list', inputFieldOptions.id)
    td.appendChild(inputFieldOptions)
    fieldDefinition.Examples.forEach(function (item) {
      if (item.Value) {
        let datalistOption = document.createElement('option')
        datalistOption.value = item.Value
        datalistOption.innerText = item.Value
        inputFieldOptions.appendChild(datalistOption)
      }
    })

    // datalist macOS workaround
    // seems the native way doesn't works.
    if (window.$main.platform === 'darwin') {
      inputField.addEventListener('click', function (event) {
        // const { left, bottom, width, height } = event.target.getBoundingClientRect()
        const { width, height } = event.target.getBoundingClientRect()
        if (event.offsetX < width - height) {
          return
        }
        let menuTemplate = []
        inputFieldOptions.childNodes.forEach(function (childNode) {
          if (childNode.value) {
            menuTemplate.push({
              label: childNode.value,
              click: function () {
                inputField.value = childNode.value
                inputField.dispatchEvent(new window.Event('change'))
              }
            })
          }
        })
        window.popupContextMenu(menuTemplate)
      })
    }
  }

  // Trigger provider's show/hide
  inputField.addEventListener('change', function () {
    window.fieldRowProviderDepenencies.select(this.value)
  })

  // Setup field label.
  if (fieldDefinition.$Label) {
    th.innerText = fieldDefinition.$Label
  } else {
    th.innerText = fieldDefinition.Name
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, function (string) {
        return string.charAt(0).toUpperCase() + string.substr(1)
      })
      .trim()
  }

  // Setup helping text.
  // It's not very reliable to convert urls to links with pattern, but don't want to include some full bloated
  // library just to show few links.
  if ('Help' in fieldDefinition && fieldDefinition.Help) {
    fieldHelpText.innerHTML = fieldDefinition.Help
      .replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig, '<a target="_blank" href="$1">$1</a>')
      .replace('\n', '<br />')
    td.appendChild(fieldHelpText)
    fieldHelpText.className = 'label-help'
  }

  // Make some fields required.
  if ('Required' in fieldDefinition && fieldDefinition.Required) {
    row.className += ' required'
    let requiredHelpText = document.createElement('div')
    requiredHelpText.innerText = 'required'
    requiredHelpText.className += ' label-required'
    th.appendChild(requiredHelpText)
  }

  return row
}
