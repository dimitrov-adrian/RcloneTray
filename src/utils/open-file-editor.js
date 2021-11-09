// https://www.npmjs.com/package/env-editor
// seems to not works on my tests or at least on macOS
// until then, we go with some zero-near custom implementation

import process from 'node:process';
import { spawn } from 'node:child_process';
import which from 'which';

/**
 * @param {string} file
 */
export function openFileEditor(file) {
	const cmd = getEditorCommandline(file);
	spawn(cmd[0], cmd[1], { detached: true, windowsHide: true }).unref();
}

/**
 * @param {string} file Text file to open
 * @returns {[string,string[]]}
 */
function getEditorCommandline(file) {
	if (process.platform === 'darwin') {
		return ['open', ['-a', 'TextEdit', file]];
	}

	if (process.platform === 'win32') {
		return ['start', ['notepad', `"${file}"`]];
	}

	if (process.platform === 'linux') {
		const editorGui = findAvailableLinuxEditor([
			'code',
			'sublime',
			'geany',
			'gedit',
			'leafpad',
			'mousepad',
			'kate',
			'deepin-editor',
		]);
		if (editorGui) {
			return [editorGui, [file]];
		}

		// CLI editors
		const editorCli = findAvailableLinuxEditor([
			process.env.EDITOR,
			process.env.VISUAL,
			'mcedit',
			'nano',
			'pico',
			'vi',
			'emacs',
		]);
		if (editorCli) {
			return ['x-terminal-emulator', ['-e', editorCli, file]];
		}
	}

	throw new Error('Cannot detect editor');
}

/**
 * @param {string[]} editors
 * @returns {string|null}
 */
function findAvailableLinuxEditor(editors) {
	for (const ed of editors) {
		if (!ed) {
			continue;
		}

		const editor = which.sync(ed, { nothrow: true });
		if (editor) {
			return editor;
		}
	}

	return null;
}
