import gui from 'gui';
import createAboutWindow, { openHomepage, openLicense, openRcloneHomepage, reportIssue } from './about.js';
import { appQuit } from './app-quit.js';
import createBookmarkWizardWindow from './bookmark-wizard.js';
import createPreferencesWindow from './preferences.js';
import packageJson from './utils/package-json.js';

const appMenu = gui.MenuBar.create([
    {
        label: 'File',
        submenu: [
            {
                label: 'Homepage',
                onClick: openHomepage,
            },
            {
                label: 'Rclone Homepage',
                onClick: openRcloneHomepage,
            },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hide-others' },
            { type: 'separator' },
            {
                label: `Quit ${packageJson.name}`,
                accelerator: 'CmdOrCtrl+Q',
                onClick: appQuit,
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
                label: 'New Bookmark',
                onClick: createBookmarkWizardWindow,
                accelerator: 'CmdOrCtrl+N',
            },
            {
                label: 'Preferences',
                onClick: createPreferencesWindow,
                accelerator: 'CmdOrCtrl+P',
            },
            {
                label: 'About',
                accelerator: 'CmdOrCtrl+A',
                onClick: createAboutWindow,
            },
        ],
    },
    {
        label: 'Help',
        role: 'help',
        submenu: [
            {
                label: 'Report issue',
                onClick: reportIssue,
            },
            {
                label: 'View License',
                onClick: openLicense,
            },
        ],
    },
]);

export default appMenu;
