import process from 'node:process';
import crypto from 'node:crypto';
import gui from 'gui';
import open from 'open';
import {winRef} from './utils/gui-winref.js';
import {packageJson} from './utils/package.js';
import {miscImages} from './services/images.js';

/**
 * @param {string} uri
 * @param {string} title
 * @param {gui.Window=} parentWindow
 * @returns {gui.Window}
 */
export function createWebViewWindow(uri, title, parentWindow) {
	const hash = crypto
		.createHash('sha1')
		.update(uri)
		.digest('hex')
		.slice(0, 8);

	const win = winRef(hash);
	if (win.value) {
		return win.value;
	}

	win.value = gui.Window.create({});
	win.value.setResizable(true);
	win.value.setMaximizable(false);
	win.value.setMinimizable(false);
	win.value.setTitle(title || packageJson.build.productName);

	if (process.platform !== 'darwin') {
		win.value.setIcon(miscImages.rcloneColor);
	}

	if (parentWindow) {
		const parentBounds = parentWindow.getBounds();
		win.value.setBounds({
			x: parentBounds.x - 60,
			y: parentBounds.y + 40,
			width: parentBounds.width + 120,
			height: parentBounds.height + 120,
		});
		parentWindow.addChildWindow(win.value);
	} else {
		win.value.setContentSize({width: 540, height: 380});
	}

	const contentView = gui.Container.create();
	win.value.setContentView(contentView);

	const webview = gui.Browser.create({
		allowFileAccessFromFiles: false,
		devtools: false,
		contextMenu: false,
		hardwareAcceleration: false,
		webview2Support: true,
	});
	webview.setStyle({flex: 1});
	webview.onFailNavigation = errorDocument;
	webview.onStartNavigation = handleExternals.bind(null, uri);

	webview.loadURL(uri);
	contentView.addChildView(webview);

	win.value.setVisible(true);
	win.value.activate();

	return win.value;
}

/**
 * @param {string} baseUrl
 * @param {gui.Browser} self
 * @param {string} nextUrl
 */
function handleExternals(baseUrl, self, nextUrl) {
	if (!nextUrl || nextUrl === baseUrl) {
		return;
	}

	open(nextUrl);
	self.getWindow().close();
}

/**
 * @param {gui.Browser} self
 */
function errorDocument(self) {
	self.loadHTML('Failed to load document.', 'default');
}
