import { basename } from 'path';
const isPacked = ['yode', 'qode', 'node'].indexOf(basename(process.title).toLowerCase()) === -1;

/**
 * @type {boolean}
 */
export default isPacked;
