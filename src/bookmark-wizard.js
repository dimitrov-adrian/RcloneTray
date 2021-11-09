import process from 'node:process';
import gui from 'gui';
import { miscImages, providerIcons } from './services/images.js';
import { getProviders, getProvider } from './services/rclone.js';
import { winRef } from './utils/gui-winref.js';
import { helpTextFont } from './utils/gui-form-builder.js';
import { formatTitle } from './utils/formatter.js';
import { packageJson } from './utils/package.js';
import { promptError } from './utils/prompt.js';
import { createBookmarkWindow } from './bookmark-edit.js';

export async function createBookmarkWizardWindow() {
	const win = winRef('createwizard');

	if (win.value) {
		return win.value;
	}

	win.value = gui.Window.create({});
	win.value.setResizable(false);
	win.value.setMaximizable(false);
	win.value.setTitle(`Create new bookmark - ${packageJson.build.productName}`);
	if (process.platform !== 'darwin') {
		win.value.setIcon(miscImages.rcloneColor);
	}

	win.value.setContentSize({ width: 400, height: 160 });

	const contentView = gui.Container.create();
	contentView.setStyle({ flexDirection: 'column', padding: 10 });
	win.value.setContentView(contentView);

	const pickerWrapper = gui.Container.create();
	pickerWrapper.setStyle({ flexDirection: 'row', marginTop: 10 });
	contentView.addChildView(pickerWrapper);

	const providerIcon = gui.GifPlayer.create();
	providerIcon.setScale('none');
	pickerWrapper.addChildView(providerIcon);

	const picker = gui.Picker.create();
	picker.setStyle({ flex: 1, marginLeft: 10 });
	picker.onSelectionChange = (self) =>
		updateProviderInfoFromSelection({
			providers,
			providerIcon,
			providerDescription,
			picker: self,
		});
	pickerWrapper.addChildView(picker);

	const providerDescription = gui.Label.create('\0');
	providerDescription.setAlign('start');
	providerDescription.setVAlign('start');
	providerDescription.setStyle({ flex: 1, flexGrow: 1, marginTop: 10, marginLeft: 40 });
	contentView.addChildView(providerDescription);

	const actionButtonsWrapper = gui.Container.create();
	actionButtonsWrapper.setStyle({ flexGrow: 0, alignSelf: 'flex-end', flexDirection: 'row' });
	contentView.addChildView(actionButtonsWrapper);

	const actionButtonNext = gui.Button.create('Next');
	actionButtonNext.onClick = (self) => actionNext({ providers, picker, self });
	actionButtonsWrapper.addChildView(actionButtonNext);

	win.value.setVisible(true);
	win.value.activate();

	// Init data
	const providers = await getProviders();
	for (const provider of providers) {
		picker.addItem(formatTitle(provider.Name));
	}

	updateProviderInfoFromSelection({ providers, providerIcon, providerDescription, picker });
	picker.setEnabled(true);

	return win.value;
}

/**
 * @param {{
 *  providers: object[],
 *  providerIcon: gui.GifPlayer,
 *  providerDescription: gui.Label,
 *  picker: gui.Picker
 * }} _
 */
function updateProviderInfoFromSelection({ providers, providerIcon, providerDescription, picker }) {
	const selected = providers[picker.getSelectedItemIndex()];
	const providerDescriptionText = gui.AttributedText.create(selected.Description, { font: helpTextFont });
	providerDescription.setAttributedText(providerDescriptionText);
	providerIcon.setImage(providerIcons[selected.Prefix] || providerIcons.$unknown);
	picker.getWindow().setTitle(`Create new ${selected.Name} bookmark`);
}

/**
 * @param {{
 *  providers: object[],
 *  picker: gui.Picker,
 *  self: gui.Button,
 * }} _
 */
async function actionNext({ providers, picker, self }) {
	const selected = providers[picker.getSelectedItemIndex()];

	const providerConfig = await getProvider(selected.Prefix);
	if (!providerConfig) {
		promptError({
			title: 'Create new bookmark',
			message: `The remote type: ${selected.Name} is not supported by Rclone.`,
		});

		return;
	}

	createBookmarkWindow(
		true,
		{
			name: `Unnamed-${selected.Prefix}`,
			providerConfig,
			type: selected.Prefix,
		},
		self.getWindow()
	);

	self.getWindow().close();
}
