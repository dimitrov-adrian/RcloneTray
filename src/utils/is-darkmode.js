import { execSync } from 'child_process'

/**
 * @returns {Boolean}
 */
export default function isDarkMode() {
    // In new Windows the taskbar is dark by default.
    if (process.platform === 'win32') {
        return true
    } else if (process.platform === 'darwin') {
        return execSync('defaults read -g AppleInterfaceStyle').toString().trim() === 'Dark'
    } else {
        if (proces.env.XDG_CURRENT_DESKTOP === 'gnome') {
            const theme = execSync('gsettings get org.gnome.desktop.interface gtk-theme')
                .toString()
                .trim()
                .toLowerCase()
            const gnomeDarkThemes = [
                'ambiance',
                'adwaita',
                'adwaita-dark',
                'arc',
                'arc-ambiance',
                'adapta',
                'ant',
                'paper',
                'pop',
            ]

            return gnomeDarkThemes.indexOf(theme) !== -1
        }
    }

    // And set default to light.
    return false
}
