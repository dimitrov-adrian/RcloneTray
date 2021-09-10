import Conf from 'conf';
import { packageJson } from '../utils/package.js';

/* eslint-disable camelcase */
const defaults = {
    rclone_config_file: '',
    rclone_options: {
        sftp: {
            AuthorizedKeys: '',
        },
        vfs: {
            CacheMode: 1,
            DirCacheTime: 360_000,
        },
        mount: {
            AllowRoot: true,
            AllowOther: false,
        },
    },
    mount_pattern: '',
    show_type: 'icon',
    show_host: true,
    show_status: true,
    bookmarks_order: 'auto',
    connected_first: true,
    show_config_shortcut: true,
    show_config_refresh: false,
    tray_icon_theme: 'color',
    enable_ncdu: true,
    enable_dlna_serve: true,
    push_on_change_delay: 2000,
    use_system_rclone: false,
};
/* eslint-enable camelcase */

/**
 * Configuration handler instance
 */
export const config = new Conf({
    projectVersion: packageJson.version,
    projectName: packageJson.build.appId,
    projectSuffix: '',
    configName: 'preferences',
    accessPropertiesByDotNotation: true,
    migrations: {},
    defaults,
});
