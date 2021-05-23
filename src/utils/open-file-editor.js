import { spawn } from 'node:child_process';

// https://www.npmjs.com/package/env-editor
// seems to not works on my tests or at least on macOS
// until then, we go with some zero-near custom implementation

const de = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase();

/**
 * @param {string} file
 */
export function openFileEditor(file) {
    const cmd = [];

    if (process.platform === 'darwin') {
        cmd.push('open', ['-a', 'TextEdit', file]);
    } else if (process.platform === 'linux') {
        if (de === 'gnome' || de === 'ubuntu:gnome') {
            cmd.push('gedit', [file]);
        } else if (de === 'kde' || de === 'ubuntu:kde' || de === 'kubuntu:kde') {
            cmd.push('kate', [file]);
        } else if (de === 'xfce' || de === 'xubuntu:xfce') {
            cmd.push('mousepad', [file]);
        } else if (de === 'dde') {
            cmd.push('deepin-editor', [file]);
        } else if (process.env.VISUAL) {
            cmd.push('x-terminal-emulator', ['-e', process.env.VISUAL, file]);
        } else {
            cmd.push('x-terminal-emulator', ['-e', 'vi', file]);
        }
    } else if (process.platform === 'win32') {
        cmd.push('start', ['notepad', `${file}`]);
    }

    if (!cmd[0]) return;

    // @ts-ignore
    spawn(cmd[0], cmd[1], {
        detached: true,
        windowsHide: true,
    }).unref();
}
