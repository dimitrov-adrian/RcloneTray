const AdmZip = require('adm-zip');
const path = require('path');
const { default: fetch } = require('node-fetch');

const targetPlatform = process.env.npm_config_platform || process.platform;
const targetArch = process.env.npm_config_arch || process.arch;
const rcloneUrl = process.env[`npm_package_config_rcloneDownloadURL_${targetPlatform}_${targetArch}`];

if (!rcloneUrl) {
    console.log('No rclone for target platform:', targetPlatform);
    process.exit(1);
}

if (!process.env.npm_package_json) {
    console.log('Must run from NPM script');
    process.exit(1);
}

const destDirectory = path.join(path.dirname(process.env.npm_package_json), 'vendor', 'rclone');

console.log('Downloading', rcloneUrl);

fetch(rcloneUrl)
    .then(async (response) => {
        console.log('Fetch', response.statusText);
        const body = await response.buffer();
        console.log('Read', body.length + 'b');
        const zip = new AdmZip(body);
        const entry = zip.getEntries().find((entry) => {
            if (targetPlatform === 'darwin' || targetPlatform === 'linux') {
                return /\/rclone$/.test(entry.entryName);
            } else if (targetPlatform === 'win32') {
                return /\/rclone\.exe$/.test(entry.entryName);
            }
        });

        if (entry) {
            console.log('Extract', entry.entryName);
            if (zip.extractEntryTo(entry, destDirectory, false, true)) {
                return path.join(destDirectory, '/', 'rclone');
            } else {
                throw 'Cannot extract';
            }
        } else {
            throw 'No rclone inside the archive';
        }
    })
    .then((file) => {
        console.log('Installed', file);
    })
    .catch((error) => {
        console.log(error.toString());
        process.exit(1);
    });
