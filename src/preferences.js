import process from 'node:process';
import gui from 'gui';
import { config } from './services/config.js';
import { winRef } from './utils/gui-winref.js';
import { assignFieldsValues, createTabbedForm } from './utils/gui-form-builder.js';
import { miscImages } from './services/images.js';
import { promptError } from './utils/prompt.js';
import { autoLaunch, autoLaunchError } from './services/auto-launch.js';
import { packageJson } from './utils/package.js';
import { openFileEditor } from './utils/open-file-editor.js';
import { getConfigFile, getDefaultMountPoint } from './services/rclone.js';
import logger from './services/logger.js';

/**
 * @type {import('./utils/gui-form-builder.js').FieldDefinitionGroup[]}
 */
const preferencesDefinition = [
	{
		label: 'Tray Menu',
		enableScroll: true,
		fields: [
			{
				// The context menus on linux seems to not supports custom icons.
				Name: 'show_type',
				...(process.platform === 'linux'
					? {
							Type: 'bool',
					  }
					: {
							Type: 'string',
							Enums: [
								{
									Name: 'None',
									Value: '',
								},
								{
									Name: 'Text',
									Value: 'text',
								},
								{
									Name: 'Icon',
									Value: 'icon',
								},
							],
					  }),
			},
			{
				Name: 'show_host',
				Type: 'bool',
			},
			{
				Name: 'show_status',
				Type: 'bool',
			},
			{
				Type: 'string',
				Name: 'bookmarks_order',
				Enums: [
					{
						Name: 'Auto',
						Value: 'auto',
					},
					{
						Name: 'Name',
						Value: 'name',
					},
					{
						Name: 'Type',
						Value: 'type',
					},
				],
			},
			{
				Type: 'bool',
				Name: 'connected_first',
			},
			{
				Type: 'bool',
				Name: 'show_config_shortcut',
			},
			{
				Type: 'bool',
				Name: 'show_config_refresh',
			},
			{
				Type: 'string',
				Name: 'tray_icon_theme',
				Enums: [
					{
						Name: 'Light',
						Value: 'light',
					},
					{
						Name: 'Dark',
						Value: 'dark',
					},
					{
						Name: 'Color',
						Value: 'color',
					},
				],
				// On macOS doesn't need this because it supports templates.
				Hide: process.platform === 'darwin',
			},
			{
				Type: 'bool',
				Name: 'enable_ncdu',
				Title: 'Enable NCDU',
				Default: false,
			},
			{
				Type: 'bool',
				Name: 'enable_dlna_serve',
				Title: 'Enable DLNA serve',
				Default: false,
			},
		],
	},
	{
		label: 'Advanced',
		enableScroll: true,
		fields: [
			{
				Type: 'Duration',
				Name: 'push_on_change_delay',
				Default: 2000,
			},
			{
				Type: 'string',
				FileDialog: 'file',
				Name: 'rclone_config_file',
				Help: 'Path to Rclone config file, leave empty to use default rclone.conf.\n\nChanging this option requires restart.',
			},
			{
				Name: 'use_system_rclone',
				Type: 'bool',
				Help: 'Use system wide Rclone executable (it should be available in the system paths). Leave unchecked to use bundled Rclone version.\n\nChanging this option requires restart.',
			},
			{
				Name: 'mount_pattern',
				Type: 'string',
				Help:
					'Path pattern when mounting. Use %s token for bookmark name or leave empty for defaults:\n' +
					getDefaultMountPoint('%s'),
				// On windows this has no meaning as it only supports mount by letters like C: D: ... etc.
				Hide: process.platform === 'win32',
			},
			{
				Name: 'logs_history_limit',
				Type: 'int',
			},
		],
	},
	{
		label: 'Rclone Daemon Settings',
		enableScroll: true,
		fields: [
			{
				Name: 'rclone_options.sftp.AuthorizedKeys',
				Title: 'sFTP Authorized keys',
				Type: 'string',
				FileDialog: 'folder',
			},
			{
				Name: 'rclone_options.vfs.CacheMode',
				Title: 'Cache Mode',
				Type: 'int',
				Enums: [
					{
						Name: 'Off',
						Value: 0,
					},
					{
						Name: 'Minimal',
						Value: 1,
					},
					{
						Name: 'Writes',
						Value: 2,
					},
					{
						Name: 'Full',
						Value: 3,
					},
				],
			},
			{
				Name: 'rclone_options.vfs.DirCacheTime',
				Title: 'Directory Cache Time',
				Type: 'Duration',
			},
			{
				Name: 'rclone_options.mount.AllowRoot',
				Title: 'Mount allow root',
				Type: 'bool',
			},
			{
				Name: 'rclone_options.mount.AllowOther',
				Title: 'Mount allow others',
				Type: 'bool',
			},
		],
	},
];

export function openRcloneConfigFile() {
	try {
		openFileEditor(getConfigFile());
	} catch (error) {
		logger.error(error);
	}
}

/**
 * @returns {gui.Window}
 */
export function createPreferencesWindow() {
	const win = winRef('preferences');

	if (win.value) {
		return win.value;
	}

	win.value = gui.Window.create({});
	if (process.platform !== 'darwin') {
		win.value.setIcon(miscImages.rcloneColor);
	}

	win.value.setResizable(true);
	win.value.setMaximizable(false);
	win.value.setContentSize({ width: 540, height: 520 });
	win.value.setContentSizeConstraints({ width: 520, height: 280 }, { width: 860, height: 800 });
	win.value.setTitle(`${packageJson.build.productName} Preferences`);

	const contentView = gui.Container.create();
	contentView.setStyle({ flex: 1, flexDirection: 'column', padding: 10 });
	win.value.setContentView(contentView);

	const preferencesTabs = createTabbedForm(preferenceDefinitionWithValues());
	contentView.addChildView(preferencesTabs.container);

	const actionButtonsWrapper = gui.Container.create();
	actionButtonsWrapper.setStyle({
		flexGrow: 0,
		flexShrink: 1,
		alignSelf: 'flex-end',
		flexDirection: 'row',
		margin: 10,
	});
	contentView.addChildView(actionButtonsWrapper);

	const autoLaunchButton = gui.Button.create({ title: 'Auto Launch', type: 'checkbox' });
	autoLaunchButton.setStyle({ marginLeft: 0, marginRight: 40, justifySelf: 'flex-start' });
	autoLaunchButton.setEnabled(false);
	autoLaunchButton.onClick = autolaunchSaveAction;
	actionButtonsWrapper.addChildView(autoLaunchButton);

	const actionButtonSave = gui.Button.create('Save');
	actionButtonSave.onClick = (self) => saveAction({ self, form: preferencesTabs });
	actionButtonsWrapper.addChildView(actionButtonSave);

	win.value.activate();
	win.restorePosition();

	autoLaunchInitValue(autoLaunchButton);

	return win.value;
}

/**
 * @returns {import('./utils/gui-form-builder.js').FieldDefinitionGroup[]}
 */
function preferenceDefinitionWithValues() {
	return preferencesDefinition.map((group) => ({
		...group,
		fields: assignFieldsValues(group.fields, config.store),
	}));
}

/**
 * @param {gui.Button} button
 */
async function autoLaunchInitValue(button) {
	try {
		const currentState = await autoLaunch.isEnabled();
		if (!button) return;

		button.setEnabled(true);
		button.setChecked(currentState);
	} catch (error) {
		logger.warn(error.toString());
		if (button) {
			autoLaunchError(button.getWindow());
		}
	}
}

/**
 * @param {gui.Button} checkbox
 */
async function autolaunchSaveAction(checkbox) {
	checkbox.setEnabled(false);
	try {
		await (checkbox.isChecked() ? autoLaunch.enable() : autoLaunch.disable());
		checkbox.setEnabled(true);
	} catch (error) {
		checkbox.setChecked(false);
		logger.warn(error.toString());
		autoLaunchError(checkbox.getWindow());
	}
}

/**
 * @param {{
 *  self: gui.Button,
 *  form: import('./utils/gui-form-builder.js').Form
 * }} _
 */
function saveAction({ self, form }) {
	try {
		config.set(form.getValues());
		self.getWindow().close();
	} catch (error) {
		promptError({
			title: 'Invalid values',
			message: error,
			parentWindow: self.getWindow(),
		});
	}
}
