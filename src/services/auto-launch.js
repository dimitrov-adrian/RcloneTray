import AutoLaunch from 'easy-auto-launch';
import packageJson from '../utils/package-json.js';
import { promptError } from '../utils/prompt.js';

/**
 * Autolaunch service
 */
export const autoLaunch = new AutoLaunch({
    name: packageJson.displayName,
    path: process.execPath,
    isHidden: false,
    mac: false,
});

export default autoLaunch;

/**
 * @param {import('gui').Window=} parentWindow
 */
export function autoLaunchError(parentWindow) {
    promptError({
        title: `Auto launch error`,
        message: `${packageJson.displayName} cannot access system auto launch service`,
        parentWindow,
    });
}
