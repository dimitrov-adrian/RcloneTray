import gui from 'gui';
import open from 'open';
import { packageJson } from './utils/package-json.js';
import { winRef } from './utils/gui-winref.js';
import { miscImages } from './services/images.js';
import { getLatestRelaseInfo } from './services/update-checker.js';
import { promptYesNo } from './utils/prompt.js';
import { createWebViewWindow } from './webview.js';

function createAboutWindowContainer() {
    if (process.platform === 'darwin') {
        const contentView = gui.Vibrant.create();
        contentView.setMaterial('appearance-based');
        contentView.setBlendingMode('behind-window');
        return contentView;
    } else {
        return gui.Container.create();
    }
}

/**
 * @returns {Promise<gui.Window>}
 */
export default async function createAboutWindow() {
    const win = winRef('about');

    if (win.value) return win.value;

    win.value = gui.Window.create(process.platform === 'darwin' ? { frame: false, showTrafficLights: true } : {});
    win.value.setResizable(false);
    win.value.setMaximizable(false);
    win.value.setMinimizable(false);
    win.value.setHasShadow(true);
    win.value.setTitle(`About ${packageJson.displayName}`);
    win.value.setContentSize({ width: 540, height: 380 });
    process.platform !== 'darwin' && win.value.setIcon(miscImages.rcloneColor);

    win.value.setContentView(createAboutWindowContainer());

    win.value.getContentView().setStyle({
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
    });

    const appContainer = gui.Container.create();
    win.value.getContentView().addChildView(appContainer);

    const logo = gui.GifPlayer.create();
    logo.setStyle({ marginBottom: 20 });
    logo.setImage(miscImages.rcloneColor);
    appContainer.addChildView(logo);

    const appLines = [
        packageJson.displayName,
        packageJson.version,
        `by ${packageJson.author.replace(/(<.*>)/gm, '')}`,
        '\0',
        'Credits',
        '\0',
        `Rclone from Nick Craig-Wood`,
        'Yue from zcbenz',
        'Node.js from Joyent, Inc',
    ];

    for (const appLine of appLines) {
        if (appLine === undefined || appLine === null) continue;
        const line = gui.Label.create(appLine);
        line.setAlign('center');
        appContainer.addChildView(line);
    }

    const actionButtonsWrapper = gui.Container.create();
    actionButtonsWrapper.setStyle({ marginTop: '40px', flexDirection: 'row' });
    win.value.getContentView().addChildView(actionButtonsWrapper);

    const actionButtonWebsite = gui.Button.create('Homepage');
    actionButtonWebsite.setStyle({ flex: 1, marginRight: 10 });
    actionButtonWebsite.onClick = openHomepage;
    actionButtonsWrapper.addChildView(actionButtonWebsite);

    const actionButtonIssue = gui.Button.create('Issues');
    actionButtonIssue.setStyle({ flex: 1, marginRight: 10 });
    actionButtonIssue.onClick = openIssues;
    actionButtonsWrapper.addChildView(actionButtonIssue);

    const actionButtonLicense = gui.Button.create('License Notes');
    actionButtonLicense.setStyle({ flex: 1, marginRight: 10 });
    actionButtonLicense.onClick = openLicense;
    actionButtonsWrapper.addChildView(actionButtonLicense);

    const actionButtonRcloneWebsite = gui.Button.create('About Rclone');
    actionButtonRcloneWebsite.setStyle({ flex: 1 });
    actionButtonRcloneWebsite.onClick = openRcloneHomepage;
    actionButtonsWrapper.addChildView(actionButtonRcloneWebsite);

    win.value.center();
    win.value.setVisible(true);
    win.value.activate();

    checkForUpdate(win.value);
    return win.value;
}

export function openHomepage() {
    open(packageJson.homepage);
}

export function openRcloneHomepage() {
    open('https://rclone.org');
}

/**
 * @param {gui.Button=} initiatorButton
 */
export function openLicense(initiatorButton) {
    createWebViewWindow(
        'https://raw.githubusercontent.com/dimitrov-adrian/RcloneTray/master/LICENSE.dist.txt',
        packageJson.displayName + ' LICENSE',
        initiatorButton ? initiatorButton.getWindow() : null
    );
}

export function openIssues() {
    open(packageJson.bugs.url);
}

/**
 * @param {{ title: string, message: string }} _
 */
export function reportIssue({ title, message }) {
    const reportUrl =
        packageJson.bugs.url +
        '/new?title=' +
        encodeURIComponent(title || 'Issue subject') +
        '&body=' +
        encodeURIComponent(message || 'Issue description');
    open(reportUrl);
}

/**
 * @param {gui.Window=} parentWindow
 */
export async function checkForUpdate(parentWindow) {
    /** @type {import('./services/update-checker.js').UpdateInfo|null}  */
    const updateResult = await (async () => {
        try {
            return await getLatestRelaseInfo();
        } catch (error) {
            console.warn('Cannot check for new release', error.toString());
            return null;
        }
    })();

    if (!updateResult || !updateResult.hasUpdate) return;

    promptYesNo(
        {
            title: 'Update Available',
            message: `There is new ${updateResult.version} version of ${packageJson.displayName} available, do you want to go and download it?`,
            parentWindow,
        },
        (result) => {
            if (!result) return;
            open(updateResult.url);
        }
    );
}
