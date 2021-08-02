import crypto from 'crypto';
import gui from 'gui';
import open from 'open';
import { winRef } from './utils/gui-winref.js';
import packageJson from './utils/package-json.js';
import { miscImages } from './services/images.js';

/**
 * @param {string} uri
 * @param {string} title
 * @param {gui.Window=} parentWindow
 * @returns {gui.Window}
 */
export function createWebViewWindow(uri, title, parentWindow) {
    const hash = crypto.createHash('sha1').update(uri).digest('base64').substr(2, 16);

    const win = winRef(hash);
    if (win.value) return win.value;

    win.value = gui.Window.create({});
    win.value.setResizable(true);
    win.value.setMaximizable(false);
    win.value.setMinimizable(false);
    win.value.setTitle(title || packageJson.build.productName);
    process.platform !== 'darwin' && win.value.setIcon(miscImages.rcloneColor);
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
        win.value.setContentSize({ width: 540, height: 380 });
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
    webview.setStyle({ flex: 1 });
    webview.onFailNavigation = (self) => self.loadHTML('Failed to load document.', 'default');
    webview.onStartNavigation = (self, url) => {
        if (!url || url === uri) return;
        open(url);
        self.getWindow().close();
    };
    webview.loadURL(uri);
    contentView.addChildView(webview);

    win.value.setVisible(true);
    win.value.activate();

    return win.value;
}
