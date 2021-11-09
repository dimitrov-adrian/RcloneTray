import process from 'node:process';
import { spawn } from 'node:child_process';

/**
 * Run command in OS terminal application
 * @param {string[]} command
 */
export function execInOSTerminal(command) {
	const enquotedCommand = command.map((i) => optionEnquote(i));
	if (process.platform === 'darwin') {
		const darwinCommand = enquotedCommand.join(' ').replace(/"/g, '\\"');
		spawn('/usr/bin/osascript', ['-e', `tell application "Terminal" to do script "${darwinCommand}" activate`]).unref();
	} else if (process.platform === 'linux') {
		spawn('x-terminal-emulator', ['-e', ...enquotedCommand]).unref();
	} else if (process.platform === 'win32') {
		spawn('start', ['cmd.exe', '/K', `"${enquotedCommand.join(' ')}"`]).unref();
	}
}

/**
 * @param {string} option
 */
function optionEnquote(option) {
	return option.slice(0, 2) === '--' ? option : JSON.stringify(option);
}
