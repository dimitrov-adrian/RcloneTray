import gui from 'gui';
import getResourcePath from '../utils/get-resource-path.js';

/**
 * Some miscelaneous images
 * @tyope {object}
 */
export const miscImages = {
    rcloneColor: gui.Image.createFromPath(getResourcePath('icons', 'rclone-icon-color-64@2x.png')),
};

/**
 * Tray theme icon definition
 * @type {object}
 */
export const trayIcons = {
    light: gui.Image.createFromPath(getResourcePath('icons', `rclone-icon-normal-lightTemplate@4x.png`)),
    lightConnected: gui.Image.createFromPath(getResourcePath('icons', `rclone-icon-connected-lightTemplate@4x.png`)),
    dark: gui.Image.createFromPath(getResourcePath('icons', `rclone-icon-normal-darkTemplate@4x.png`)),
    darkConnected: gui.Image.createFromPath(getResourcePath('icons', `rclone-icon-connected-darkTemplate@4x.png`)),
    color: gui.Image.createFromPath(getResourcePath('icons', `rclone-icon-normal-color@4x.png`)),
    colorConnected: gui.Image.createFromPath(getResourcePath('icons', `rclone-icon-connected-color@4x.png`)),
};

/**
 * Cloud providers icons definition
 * @type {object}
 */
export const providerIcons = {
    _unknown: gui.Image.createFromPath(getResourcePath('icons', 'providers', '_cloud-provider-template@3x.png')),
    acd: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'acd@3x.png')),
    alias: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'alias@3x.png')),
    azureblob: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'azureblob@3x.png')),
    b2: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'b2@3x.png')),
    box: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'box@3x.png')),
    drive: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'drive@3x.png')),
    dropbox: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'dropbox@3x.png')),
    fichier: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'fichier@3x.png')),
    filefabric: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'filefabric@3x.png')),
    ftp: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'ftp@3x.png')),
    gcs: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'gcs@3x.png')),
    gphotos: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'gphotos@3x.png')),
    hdfs: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'hdfs@3x.png')),
    hubic: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'hubic@3x.png')),
    jottacloud: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'jottacloud@3x.png')),
    koofr: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'koofr@3x.png')),
    mailru: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'mailru@3x.png')),
    mega: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'mega@3x.png')),
    onedrive: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'onedrive@3x.png')),
    opendrive: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'opendrive@3x.png')),
    pcloud: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'pcloud@3x.png')),
    premiumizeme: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'premiumizeme@3x.png')),
    putio: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'putio@3x.png')),
    qingstor: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'qingstor@3x.png')),
    s3: gui.Image.createFromPath(getResourcePath('icons', 'providers', 's3@3x.png')),
    seafile: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'seafile@3x.png')),
    sftp: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'sftp@3x.png')),
    sharefile: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'sharefile@3x.png')),
    sugarsync: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'sugarsync@3x.png')),
    swift: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'swift@3x.png')),
    tardigrade: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'tardigrade@3x.png')),
    webdav: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'webdav@3x.png')),
    yandex: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'yandex@3x.png')),
    zoho: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'zoho@3x.png')),
    crypt: gui.Image.createFromPath(getResourcePath('icons', 'providers', 'crypt@3x.png')),
};
