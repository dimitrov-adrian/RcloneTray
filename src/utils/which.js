import { spawnSync } from 'node:child_process';

/**
 * Check if specific command exists and returns path
 * @param {string} command
 * @returns {string}
 */
export default function which(command) {
    try {
        return spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
            stdio: ['ignore', 'pipe', 'ignore'],
        })
            .output[1].toString()
            .trim();
    } catch (err) {
        return null;
    }
}
