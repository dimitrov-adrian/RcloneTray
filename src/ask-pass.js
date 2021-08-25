import { promptInput } from './utils/prompt.js';

/**
 * @param {{
 *  title?: string,
 *  button?: string,
 *  help?: string,
 * }} _
 * @returns {import('gui').Window}
 */
export function askPass({ title, button, help }) {
    return promptInput({
        buttonText: button || 'Authenticate',
        helpText: help || 'Password is required',
        label: title || 'Password is required',
        required: true,
        type: 'password',
        resolve: (password) => {
            process.stdout.write(password.toString());
            process.exit(0);
        },
    });
}
