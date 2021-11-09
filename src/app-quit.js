import process from 'node:process';
import logger from './services/logger.js';
import { closeAll } from './utils/gui-winref.js';

export async function appQuit() {
	logger.debug('Quit');
	try {
		closeAll();
		// Do await rclone.stopDaemon();
	} catch (error) {
		logger.warn('Exit with errors.', error.toString());
	}

	process.exit(0);
}
