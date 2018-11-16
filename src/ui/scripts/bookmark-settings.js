'use strict'

/**
 *
 * @param {HTMLElement} placeholder
 * @param {{}} providerObject
 * @param {{}} values
 * @param {{}} values
 */
window.renderBookmarkSettings = function (placeholder, providerObject, values, external) {
  // Seems no provider object is passed, so clear the placeholder
  if (!providerObject) {
    let range = document.createRange()
    range.selectNodeContents(placeholder)
    range.deleteContents()
  }

  values = values || {}
  let settingsContainer = document.createDocumentFragment()

  let tabs = {
    'connection': {
      label: 'Connection',
      tag: 'section'
    },
    'connection-advanced': {
      label: 'Advanced Connection Settings',
      tag: 'section'
    },
    'local-path': {
      label: 'Local Directory Mapping',
      tag: 'section'
    },
    'custom-args': {
      label: 'Custom Rclone Args',
      tag: 'div'
    }
  }

  for (let tabName in tabs) {
    tabs[tabName].element = document.createElement('details')
    if (tabName === 'connection') {
      tabs[tabName].element.open = true
    }
    tabs[tabName].element.addEventListener('toggle', function () {
      window.resizeToContent()
    })
    tabs[tabName].element.id = tabName

    let tabButton = document.createElement('summary')
    tabButton.innerText = tabs[tabName].label
    tabs[tabName].content = document.createElement(tabs[tabName].tag)

    settingsContainer.appendChild(tabs[tabName].element)
    tabs[tabName].element.appendChild(tabButton)
    tabs[tabName].element.appendChild(tabs[tabName].content)
  }

  // Populate connection and connection - advanced.
  providerObject.Options.forEach(function (field) {
    if (!field.Hide) {
      if (field.Name === '_rclonetray_local_path_map') {
        tabs['local-path'].content.appendChild(window.createFieldRow(field, values[field.Name] || null))
      } else if (field.Advanced) {
        tabs['connection-advanced'].content.appendChild(window.createFieldRow(field, values[field.Name] || null))
      } else {
        tabs['connection'].content.appendChild(window.createFieldRow(field, values[field.Name] || null))
      }
    }
  })

  if (tabs['connection-advanced'].content.childNodes.length < 1) {
    tabs['connection-advanced'].element.style.display = 'none'
  }

  tabs['custom-args'].content.appendChild(window.createFieldRow({
    Name: 'custom_args',
    $type: 'text',
    Required: false,
    Hide: false,
    Advanced: false,
    Help: `
      Custom arguments separated by space or new-line. Check the list
      on https://rclone.org/${providerObject.Name}/#standard-options #rclone.org documentation
      `
  }, external && external.custom_args ? external.custom_args : null), 'custom_args')

  // Override
  let range = document.createRange()
  range.selectNodeContents(placeholder)
  range.deleteContents()
  window.fieldRowProviderDepenencies.select('')
  placeholder.appendChild(settingsContainer)
}
