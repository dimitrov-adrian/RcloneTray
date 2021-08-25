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

(async function bootstrap(command) {
    if (command === 'ask-pass-config') {
        const factory = await import('./ask-pass.js');
        factory.askPass({
            title: 'Rclone Config Password',
            help: 'Rclone config file is encrypted, need to enter password to unlock.',
        });
    } else if (command === 'ask-pass-remote') {
        const factory = await import('./ask-pass.js');
        factory.askPass({
            title: 'Enter Password',
            help: 'Password is required to authenticate by remote.',
        });
    } else if (command === 'about') {
        const factory = await import('./about.js');
        (await factory.createAboutWindow()).onClose = () => process.exit();
    } else if (command === 'preferences') {
        const factory = await import('./preferences.js');
        (await factory.createPreferencesWindow()).onClose = () => process.exit();
    } else {
        (await import('./app.js')).app();
    }
})(process.argv.slice(-1)[0]);
