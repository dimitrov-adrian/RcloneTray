import { promptInput } from './utils/prompt.js';

/**
 * @returns {import('gui').Window}
 */
export default function askPass() {
    return promptInput({
        buttonText: 'Unlock',
        helpText: 'Rclone config file is encrypted, need to enter password to unlock.',
        label: 'Config Password',
        required: true,
        type: 'password',
        resolve: (password) => {
            process.stdout.write(password.toString());
            process.exit(0);
        },
    });
}
