import console from 'node:console';

/**
 * @type {{
 *  log: (message?: any, ...optionalParams: any[]) => void,
 *  warn: (message?: any, ...optionalParams: any[]) => void,
 *  debug: (message?: any, ...optionalParams: any[]) => void,
 *  error: (message?: any, ...optionalParams: any[]) => void,
 * }}
 */
const logger = console;

export default logger;
