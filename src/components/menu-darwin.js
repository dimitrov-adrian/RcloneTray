import gui from 'gui'
import appInfo from '../utils/app-info.js'
import events from '../utils/event-emitter.js'

export default function createAppMenu() {
    return gui.MenuBar.create([
        {
            label: 'File',
            submenu: [
                {
                    label: 'Homepage',
                    onClick: events.createEmitter('app/about/homepage'),
                },
                {
                    label: 'Rclone Homepage',
                    onClick: events.createEmitter('app/about/homepage_rclone'),
                },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hide-others' },
                { role: 'unhide' },
                { type: 'separator' },
                {
                    label: `Quit ${appInfo.name}`,
                    accelerator: 'CmdOrCtrl+Q',
                    onClick: events.createEmitter('app/quit'),
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'copy' },
                { role: 'cut' },
                { role: 'paste' },
                { role: 'select-all' },
                { type: 'separator' },
                { role: 'undo' },
                { role: 'redo' },
            ],
        },
        {
            label: 'Window',
            role: 'window',
            submenu: [
                { type: 'separator' },
                {
                    label: 'New Bookmark Wizard',
                    onClick: events.createEmitter('app/wizard'),
                },
                {
                    label: 'Preferences',
                    onClick: events.createEmitter('app/preferences'),
                },
                {
                    label: 'About',
                    onClick: events.createEmitter('app/about'),
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Report an issue...',
                    onClick: events.createEmitter('app/about/issues'),
                },
                {
                    label: 'View License',
                    onClick: events.createEmitter('app/about/issues'),
                },
            ],
        },
    ])
}
