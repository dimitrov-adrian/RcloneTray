import path from 'path'

const isPacked = ['yode', 'qode', 'node'].indexOf(path.basename(process.argv0, '.exe').toLowerCase()) === -1

/**
 * @type {Boolean}
 */
export default isPacked
