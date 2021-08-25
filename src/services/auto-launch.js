import AutoLaunch from 'easy-auto-launch';
import { packageJson } from '../utils/package.js';
import { promptError } from '../utils/prompt.js';

/**
 * Autolaunch service
 */
export const autoLaunch = new AutoLaunch({
    name: packageJson.build.productName,
    path: process.execPath,
    isHidden: false,
    mac: false,
});

/**
 * @param {import('gui').Window=} parentWindow
 */
export function autoLaunchError(parentWindow) {
    promptError({
        title: `Auto launch error`,
        message: `${packageJson.build.productName} cannot access system auto launch service`,
        parentWindow,
    });
}
