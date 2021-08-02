import { spawn } from 'child_process';
import which from './which.js';

// https://www.npmjs.com/package/env-editor
// seems to not works on my tests or at least on macOS
// until then, we go with some zero-near custom implementation

/**
 * @param {string} file
 */
export function openFileEditor(file) {
    const cmd = [];

    if (process.platform === 'darwin') {
        cmd.push('open', ['-a', 'TextEdit', file]);
    } else if (process.platform === 'win32') {
        cmd.push('start', ['notepad', `"${file}"`]);
    } else if (process.platform === 'linux') {
        const editor = findAvailableLinuxEditor(['code', 'gedit', 'mousepad', 'kate', 'deepin-editor']);
        if (editor) {
            cmd.push(editor, [file]);
        } else {
            // CLI editors
            const editor = findAvailableLinuxEditor([
                process.env.EDITOR,
                process.env.VISUAL,
                'mcedit',
                'nano',
                'pico',
                'vi',
                'emacs',
            ]);
            if (editor) {
                cmd.push('x-terminal-emulator', ['-e', process.env.EDITOR, file]);
            } else {
                throw Error('Cannot detect editor');
            }
        }
    }

    if (!cmd[0]) return;

    // @ts-ignore
    spawn(cmd[0], cmd[1], {
        detached: true,
        windowsHide: true,
    }).unref();
}

function findAvailableLinuxEditor(editors) {
    for (let ed of editors) {
        if (!ed) continue;
        const editor = which(ed);
        if (editor) return editor;
    }
    return null;
}
