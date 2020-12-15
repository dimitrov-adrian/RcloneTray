import Conf from 'conf'
import appInfo from './utils/app-info.js'

export default new Conf({
    projectVersion: appInfo.version,
    projectName: appInfo.productName,
    projectSuffix: '',
    configName: 'settings',
    useDotNotation: false,
    defaults: {
        rclone_binary_path: '',
        rclone_instance: '',
        tray_menu_show_type: true,
        rclone_use_bundled: true,
        custom_args: '',
        rclone_config: '',
        rclone_cache_files: 3,
        rclone_cache_directories: 10,
        rclone_sync_enable: true,
        rclone_sync_autoupload_delay: 5,
        rclone_ncdu_enable: false,
        rclone_serving_http_enable: false,
        rclone_serving_ftp_enable: false,
        rclone_serving_restic_enable: false,
        rclone_serving_webdav_enable: false,
        rclone_serving_username: '',
        rclone_serving_password: '',
    },
})
