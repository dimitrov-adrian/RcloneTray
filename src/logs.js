import process from 'node:process';
import gui from 'gui';
import { packageJson } from './utils/package.js';
import { winRef } from './utils/gui-winref.js';
import { miscImages } from './services/images.js';
import { config } from './services/config.js';

const MAX_LOG_MESSAGES = config.get('logs_history_limit', 10);

export const tableModel = gui.SimpleTableModel.create(3);

/**
 * @returns {gui.Window}
 */
export function createLogWindow() {
	const win = winRef('log');

	if (win.value) {
		return win.value;
	}

	win.value = gui.Window.create({});
	win.value.setResizable(true);
	win.value.setMaximizable(true);
	win.value.setMinimizable(true);
	win.value.setTitle(`${packageJson.build.productName} logs`);
	win.value.setContentSize({ width: 680, height: 380 });
	win.value.setContentSizeConstraints({ width: 320, height: 180 }, { width: -1, height: -1 });
	if (process.platform !== 'darwin') {
		win.value.setIcon(miscImages.rcloneColor);
	}

	const contentView = gui.Container.create();
	win.value.setContentView(contentView);

	win.value.getContentView().setStyle({
		flexDirection: 'column',
		justifyContent: 'space-between',
		padding: 0,
	});

	const table = gui.Table.create();
	table.setStyle({ flexGrow: 1 });
	table.setModel(tableModel);
	table.addColumnWithOptions('Time', { column: 0, width: 190 });
	table.addColumnWithOptions('Type', { column: 1, width: 70 });
	table.addColumnWithOptions('Message', { column: 2, width: -1 });
	contentView.addChildView(table);

	const actionButtonsWrapper = gui.Container.create();
	actionButtonsWrapper.setStyle({
		flexGrow: 0,
		alignSelf: 'flex-end',
		justifyContent: 'flex-end',
		flexDirection: 'row',
		padding: 10,
	});

	contentView.addChildView(actionButtonsWrapper);

	const actionButtonClear = gui.Button.create('Clear All');
	actionButtonClear.setStyle({ marginLeft: 10 });
	actionButtonsWrapper.addChildView(actionButtonClear);
	actionButtonClear.onClick = () => clearAll();

	win.value.center();
	win.value.setVisible(true);
	win.value.activate();

	return win.value;
}

/**
 * @param {{
 *  time?: string,
 *  level?: 'error' | 'warning' | 'debug' | 'info',
 *  msg: string
 * }} entry
 */
export function insert(entry) {
	const time = (entry.time ? new Date(entry.time) : new Date()).toLocaleString();
	tableModel.addRow([time, entry.level.toUpperCase(), entry.msg]);
	if (tableModel.getRowCount() > MAX_LOG_MESSAGES) {
		tableModel.removeRowAt(0);
	}
}

function clearAll() {
	while (tableModel.getRowCount() > 0) {
		tableModel.removeRowAt(0);
	}
}
