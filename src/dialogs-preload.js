'use strict'

const remote = require('electron').remote
const remoteElectron = remote.require('electron')
const appPath = remote.app.getAppPath()

window.$main = {
  app: {
    name: remote.app.getName(),
    version: remote.app.getVersion()
  },
  refreshTray: remote.require('./tray').refresh,
  rclone: remote.require('./rclone'),
  settings: remote.require('./settings')
}

window.$main.currentWindow = remote.getCurrentWindow() // @TODO remove before release
window.$main.process = process // @TODO remove before release
window.$main.r = remote // @TODO remove before release
window.$main.re = remoteElectron // @TODO remove before release

/**
 * Set autostart
 */
window.$main.setAutostart = function (state) {
  remoteElectron.app.setLoginItemSettings({
    openAtLogin: !!state
  })
}

/**
 * Check if the app is set to autostart
 * @returns {boolean}
 */
window.$main.isAutostart = function () {
  return remoteElectron.app.getLoginItemSettings().openAtLogin
}

/**
 * Popup context menu from given template
 * @param {Array}
 */
window.popupContextMenu = function (menuTemplate) {
  remote.Menu.buildFromTemplate(menuTemplate).popup()
}

/**
 * Get assigned window props
 * @returns {{}}
 */
window.$main.getProps = function () {
  return remote.getCurrentWindow().$props
}

/**
 * Show node's message box
 * @param {string} message
 * @returns {number}
 */
window.messageBox = function (message) {
  return remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      message: message
    })
}

/**
 * Override the standard confirm dialog
 * @param {string} message
 * @returns {boolean}
 */
window.confirm = function (message) {
  let choice = remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      buttons: ['Yes', 'No'],
      message: message
    })
  return choice === 0
}

/**
 * Show error box
 * @param {string} message
 */
window.errorBox = function (message) {
  remoteElectron.dialog.showMessageBox(
    remote.getCurrentWindow(), {
      message: message.toString()
    })
}

/**
 * Show OS notification shorthand
 * @param {string} message
 */
window.notification = function (message) {
  new remoteElectron.Notification({
    body: message.toString()
  }).show()
}

/**
 * Resize current window to conent
 */
window.resizeToContent = function () {
  let newHeight = document.body.scrollHeight + (window.outerHeight - window.innerHeight)
  if (newHeight > window.screen.height * 0.8) {
    newHeight = Math.ceil(window.screen.height * 0.8)
    document.body.style.overflow = 'auto'
  } else {
    document.body.style.overflow = 'hidden'
  }

  if (process.platform === 'darwin') {
    remote.getCurrentWindow().setSize(window.outerWidth, newHeight, true)
  } else {
    window.resizeTo(window.outerWidth, newHeight)
  }
}
window.addEventListener('load', window.resizeToContent)

/**
 * Directory selector dialog
 * @param {string} defaultDirectory
 * @param {callback} callback
 */
window.selectDirectory = function (defaultDirectory, callback) {
  remoteElectron.dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select Directory',
    defaultPath: defaultDirectory || remote.app.getPath('home'),
    properties: [
      'openDirectory',
      'createDirectory'
    ]
  }, callback)
}

/**
 * File selector dialog
 * @param {string} defaultFile
 * @param {callback} callback
 */
window.selectFile = function (defaultFile, callback) {
  remoteElectron.dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select File',
    defaultPath: defaultFile || remote.app.getPath('home'),
    properties: [
      'openFile',
      'showHiddenFiles'
    ]
  }, callback)
}

/**
 * Simple form JSON serializator
 */
window.getTheFormData = function (form) {
  let values = {}
  for (let i = 0; i < form.elements.length; i++) {
    if (!form.elements[i].name ||
      form.elements[i].disabled ||
      form.elements[i].tagName === 'BUTTON' ||
      (form.elements[i].type === 'radio' && !form.elements[i].checked)
    ) {
      continue
    }

    let name = form.elements[i].name.split('.')
    let namespace = null
    if (name.length > 1) {
      namespace = name.shift()
    }
    name = name.join('.')
    let value = form.elements[i].value
    if (form.elements[i].type === 'checkbox' && !form.elements[i].checked) {
      value = ''
    }
    if (form.elements[i].tagName === 'SELECT' && form.elements[i].multiple) {
      value = Array.from(document.forms[0][2].selectedOptions).map(option => option.value)
    }

    if (namespace) {
      if (!values.hasOwnProperty(namespace)) {
        values[namespace] = {}
      }
      values[namespace][name] = value
    } else {
      values[name] = value
    }
  }
  return values
}

/**
 * Scripts loader
 * @param {string} script
 */
window.$main.loadStyles = function () {
  document.write('<link rel="stylesheet" href="' + appPath + '/src/ui/styles/ui.css" />')
  document.write('<link rel="stylesheet" href="' + appPath + '/src/ui/styles/ui-' + process.platform + '.css" />')
}

/**
 * Create tabs dom structure
 */
window.createTabsElement = function () {
  let container = document.createElement('div')
  let containerButtons = document.createElement('div')
  let containerContents = document.createElement('div')
  container.className = 'tabs'
  container.appendChild(containerButtons)
  container.appendChild(containerContents)
  containerButtons.className = 'tab-buttons'
  containerContents.className = 'tab-contents'

  container.addTab = function (label, content) {
    let tabsTabIndex = containerButtons.childNodes.length
    let button = document.createElement('div')
    button.tabsTabIndex = tabsTabIndex
    button.className = 'tab-button' + (tabsTabIndex > 0 ? '' : ' active')
    button.innerText = label
    button.addEventListener('click', function () {
      let thisTabsTabIndex = this.tabsTabIndex
      containerButtons.childNodes.forEach(function (item) {
        item.className = (item.tabsTabIndex === thisTabsTabIndex) ? 'tab-button active' : 'tab-button'
      })
      containerContents.childNodes.forEach(function (item) {
        item.style.display = (item.tabsTabIndex === thisTabsTabIndex) ? null : 'none'
      })
      window.resizeToContent()
    })

    let contentWrapper = document.createElement('div')
    contentWrapper.tabsTabIndex = tabsTabIndex
    contentWrapper.className = 'tab-content'
    if (tabsTabIndex > 0) {
      contentWrapper.style.display = 'none'
    }

    contentWrapper.appendChild(content)
    containerContents.appendChild(contentWrapper)
    containerButtons.appendChild(button)
  }

  return container
}

/**
 * @returns {{}}
 */
window.optionFieldDepenencies = {
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
* @param {{}} optionFieldDefinition
* @param {string} optionFieldNamespace
* @param {string} value
* @returns {HTMLElement}
*/
window.createOptionField = function (optionFieldDefinition, optionFieldNamespace, value) {
  if (value === undefined || value === null) {
    value = optionFieldDefinition.Value
  }

  let row = document.createElement('div')
  let th = document.createElement('div')
  let td = document.createElement('div')

  let inputField = document.createElement('input')
  if ('$Type' in optionFieldDefinition && optionFieldDefinition.$Type === 'text') {
    inputField = document.createElement('textarea')
  } else if ('$Type' in optionFieldDefinition && optionFieldDefinition.$Type === 'select') {
    inputField = document.createElement('select')
  }

  let fieldHelpText = document.createElement('div')
  row.className = 'row'
  th.className = 'cell-left'
  td.className = 'cell-right'

  // Setup row.
  row.appendChild(th)
  row.appendChild(td)

  if (optionFieldDefinition.Provider) {
    window.optionFieldDepenencies.add({
      rule: optionFieldDefinition.Provider,
      row: row
    })
  }

  // Setup the input field.
  if (optionFieldNamespace) {
    inputField.name = optionFieldNamespace + '.' + optionFieldDefinition.Name
  } else {
    inputField.name = optionFieldDefinition.Name
  }
  inputField.id = 'field_' + optionFieldDefinition.Name
  inputField.placeholder = optionFieldDefinition.Default || ''
  inputField.value = ''

  // Assign values.
  if (optionFieldDefinition.$Type === 'boolean') {
    if ([true, 1, 'true'].indexOf(value) > -1) {
      inputField.checked = 'checked'
    }
  } else {
    inputField.value = (value || '').toString()
  }

  td.appendChild(inputField)

  if ('$Type' in optionFieldDefinition) {
    if (optionFieldDefinition.$Type === 'boolean') {
      inputField.type = 'checkbox'
      inputField.value = 'true'
    } else if (optionFieldDefinition.$Type === 'numeric') {
      inputField.type = 'number'
    } else if (optionFieldDefinition.$Type === 'password') {
      inputField.type = 'password'
    } else if (optionFieldDefinition.$Type === 'directory') {
      let browseButton = document.createElement('button')
      browseButton.style.margin = '.3rem 0'
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
    } else if (optionFieldDefinition.$Type === 'file') {
      let browseButton = document.createElement('button')
      browseButton.style.margin = '.3rem 0'
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
    } else if (optionFieldDefinition.$Type === 'select') {
      optionFieldDefinition.Examples.forEach(function (item) {
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
  if (optionFieldDefinition.Examples && optionFieldDefinition.$Type !== 'boolean' && optionFieldDefinition.$Type !== 'select') {
    let inputFieldOptions = document.createElement('datalist')
    inputFieldOptions.id = inputField.id + '_datalist'
    inputField.setAttribute('list', inputFieldOptions.id)
    td.appendChild(inputFieldOptions)
    optionFieldDefinition.Examples.forEach(function (item) {
      if (item.Value) {
        let datalistOption = document.createElement('option')
        datalistOption.value = item.Value
        datalistOption.innerText = item.Value
        inputFieldOptions.appendChild(datalistOption)
      }
    })

    // Until Electron fixes the datalist, we are stuck with next solution.
    inputField.addEventListener('click', function (event) {
      const { width, height } = event.target.getBoundingClientRect()
      if (event.offsetX < width - height) {
        return
      }
      event.preventDefault()
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

  // Trigger provider's show/hide
  inputField.addEventListener('change', function () {
    window.optionFieldDepenencies.select(this.value)
  })
  window.optionFieldDepenencies.select(this.value)

  // Setup field label.
  th.innerText = optionFieldDefinition.$Label || optionFieldDefinition.Name

  // Setup helping text.
  // It's not very reliable to convert urls to links with pattern, but don't want to include some full bloated
  // library just to show few links.
  if ('Help' in optionFieldDefinition && optionFieldDefinition.Help) {
    fieldHelpText.innerHTML = optionFieldDefinition.Help
      .replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig, '<a target="_blank" href="$1">$1</a>')
      .replace(/\n/g, '<br />')
    td.appendChild(fieldHelpText)
    if (optionFieldDefinition.$Type === 'boolean') {
      fieldHelpText.className = 'label-help-inline'
    } else {
      fieldHelpText.className = 'label-help'
    }
  }

  // Make some fields required.
  if ('Required' in optionFieldDefinition && optionFieldDefinition.Required) {
    row.className += ' required'
    let requiredHelpText = document.createElement('div')
    requiredHelpText.innerText = 'required'
    requiredHelpText.className += ' label-required'
    th.appendChild(requiredHelpText)
  }

  return row
}

/**
 * Construct option fields by definition array
 * @returns {DocumentFragment}
 */
window.createOptionsFields = function (optionFields, optionFieldsNamespace, optionValues) {
  optionValues = optionValues || {}
  let container = document.createDocumentFragment()
  optionFields.forEach(function (fieldDefinition) {
    container.appendChild(
      window.createOptionField(
        fieldDefinition,
        optionFieldsNamespace,
        optionValues.hasOwnProperty(fieldDefinition.Name) ? optionValues[fieldDefinition.Name] : null
      ))
  })
  return container
}

/**
 * Render bookmark settings
 * @TODO refactor
 */
window.renderBookmarkSettings = function (placeholder, providerName, values) {
  let provider = window.$main.rclone.getProvider(providerName)
  values = values || {}

  let connectionFields = provider.Options.filter(function (item) {
    return item.Name !== '_rclonetray_local_path_map' && item.Advanced !== true
  })

  let advancedFields = provider.Options.filter(function (item) {
    return item.Name !== '_rclonetray_local_path_map' && item.Advanced === true
  })

  let mappingFields = provider.Options.filter(function (item) {
    return item.Name === '_rclonetray_local_path_map'
  })

  let tabs = window.createTabsElement()

  if (connectionFields.length) {
    tabs.addTab('Connection', window.createOptionsFields(connectionFields, 'options', values.options))
  }

  if (advancedFields.length) {
    tabs.addTab('Advanced', window.createOptionsFields(advancedFields, 'options', values.options))
  }

  if (mappingFields.length) {
    tabs.addTab('Mappings', window.createOptionsFields(mappingFields, 'options', values.options))
  }

  let range = document.createRange()
  range.selectNodeContents(placeholder)
  range.deleteContents()
  placeholder.appendChild(tabs)
}
