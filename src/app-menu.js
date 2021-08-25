import gui from 'gui';
import { packageJson } from './utils/package.js';
import { createAboutWindow, openHomepage, openLicense, openRcloneHomepage, reportIssue } from './about.js';
import { appQuit } from './app-quit.js';
import { createBookmarkWizardWindow } from './bookmark-wizard.js';
import { createPreferencesWindow } from './preferences.js';
import { closeActive } from './utils/gui-winref.js';

export const appMenu = gui.MenuBar.create([
    {
        submenu: [
            {
                label: 'About',
                accelerator: 'CmdOrCtrl+A',
                onClick: createAboutWindow,
            },
            { type: 'separator' },
            {
                label: 'New Bookmark',
                onClick: createBookmarkWizardWindow,
                accelerator: 'CmdOrCtrl+N',
            },
            { type: 'separator' },
            {
                label: 'Preferences',
                onClick: createPreferencesWindow,
                accelerator: 'CmdOrCtrl+P',
            },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hide-others' },
            {
                label: `Close Window`,
                accelerator: 'CmdOrCtrl+W',
                onClick: closeActive,
            },
            { type: 'separator' },
            {
                label: `Quit ${packageJson.build.productName}`,
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
        submenu: [{ type: 'separator' }],
    },
    {
        label: 'Help',
        role: 'help',
        submenu: [
            {
                label: 'RcloneTray Homepage',
                onClick: openHomepage,
            },
            {
                label: 'Report issue',
                onClick: reportIssue,
            },
            {
                label: 'View License',
                onClick: openLicense,
            },
            { type: 'separator' },
            {
                label: 'Rclone Homepage',
                onClick: openRcloneHomepage,
            },
        ],
    },
]);
