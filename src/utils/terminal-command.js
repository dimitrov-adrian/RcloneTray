import { spawn } from 'node:child_process';

/**
 * Run command in OS terminal application
 * @param {string[]} command
 */
export default function execInOSTerminal(command) {
    const enquotedCommand = command.map(optionEnquote);
    if (process.platform === 'darwin') {
        spawn('/usr/bin/osascript', [
            '-e',
            `tell application "Terminal" to do script "${enquotedCommand.join(' ').replace(/\"/g, '\\"')}" activate`,
        ]).unref();
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
    return option.substr(0, 2) !== '--' ? JSON.stringify(option) : option;
}
