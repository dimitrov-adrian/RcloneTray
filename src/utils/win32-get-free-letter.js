import { execSync } from 'child_process'

/**
 * On windows find free drive letter.
 * @returns {string|null}
 */
export default function win32GetFreeLetter() {
    if (process.platform !== 'win32') {
        return null
    }
    // First letters are reserved, floppy, system drives etc.
    const allLetters = [
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
    ]

    const usedDriveLetters = execSync('wmic logicaldisk get name')
        .toString()
        .split(/\n/)
        .map((line) => {
            let letter = line.trim().match(/^([A-Z]):/)
            if (letter) {
                return letter[1]
            }
            return null
        })
        .filter((letter) => !!letter)

    const freeLetter = allLetters.find((letter) => usedDriveLetters.indexOf(letter) === -1)

    if (!freeLetter) {
        return null
    }

    return freeLetter + ':'
}
