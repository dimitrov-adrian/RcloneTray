'use strict'

const { app, Menu } = require('electron')

// Exports
module.exports = {

  init: function () {
    let template = [
      {
        label: 'Edit',
        submenu: [
          { role: 'redo' },
          { role: 'undo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteandmatchstyle' },
          { role: 'delete' },
          { role: 'selectall' }
        ]
      },
      {
        role: 'window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ]

    if (process.platform === 'darwin') {
      // First "Application" menu on macOS
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'quit' }
        ]
      })

      // Edit menu
      template[1].submenu.push(
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startspeaking' },
            { role: 'stopspeaking' }
          ]
        }
      )

      // Window menu
      template[2].submenu = [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }
}
