import gui from 'gui';

// Check the OS and arch.
if (process.arch !== 'x64' || ['win32', 'linux', 'darwin'].indexOf(process.platform) === -1) {
    console.error('Unsupported platform. RcloneTray requires 64bit platform (macOS, Windows or Linux)');
    process.exit();
}

// Check for yode.
if (!process.versions.yode) {
    console.error('App must be run under Yode engine.');
    process.exit(1);
}

async function bootstrap(command) {
    if (command === 'ask-pass') {
        const factory = await import('./ask-pass.js');
        factory.default().onClose = () => process.exit();
    } else if (command === 'about') {
        const factory = await import('./about.js');
        (await factory.default()).onClose = () => process.exit();
    } else if (command === 'preferences') {
        const factory = await import('./preferences.js');
        (await factory.default()).onClose = () => process.exit();
    } else {
        (await import('./app.js')).default();
    }
}

if (0 && process.platform === 'darwin') {
    gui.lifetime.onReady = () => bootstrap(process.argv.slice(-1)[0]);
} else {
    bootstrap(process.argv.slice(-1)[0]);
}
