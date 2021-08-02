import { resolve } from 'path';
import { readFileSync } from 'fs';
import isPacked from './is-packaged.js';

/**
 * @type {Record<string, any>}
 */
export const packageJson = JSON.parse(
    readFileSync(
        // If packed it's under asar/
        isPacked ? process.execPath + '/asar/package.json' : resolve('package.json'),
        { encoding: 'utf-8' }
    )
);

export default packageJson;
