#!/usr/bin/env node

const fs = require('fs')
const https = require('https')
const os = require('os')
const path = require('path')
const yauzl = require('yauzl')

const RCLONE_PATH = path.resolve(path.join('rclone'))

const RCLONE_BINARIES_DEFINITION = {
    darwin: {
        url: 'https://downloads.rclone.org/rclone-current-osx-amd64.zip',
        binaryName: 'rclone',
    },
    linux: {
        url: 'https://downloads.rclone.org/rclone-current-linux-amd64.zip',
        binaryName: 'rclone',
    },
    win32: {
        url: 'https://downloads.rclone.org/rclone-current-windows-amd64.zip',
        binaryName: 'rclone.exe',
    },
}

const ARGV = process.argv.slice(2)
const PLATFORM = ARGV.pop() || process.platform

if (!RCLONE_BINARIES_DEFINITION[PLATFORM]) {
    console.warn('Unsupported platform')
    process.exit()
}

const OUTPUT_FILE_PATH = path.join('rclone', RCLONE_BINARIES_DEFINITION[PLATFORM].binaryName)

if (!process.env.npm_config_force && fs.existsSync(OUTPUT_FILE_PATH)) {
    console.log('Rclone already exists in', OUTPUT_FILE_PATH)
    process.exit()
}

console.log('Update Rclone for', PLATFORM)

fs.mkdirSync(RCLONE_PATH, {
    recursive: true,
})

downloadFile('Rclone', RCLONE_BINARIES_DEFINITION[PLATFORM].url)
    .then(function (archivePath) {
        const binaryName = RCLONE_BINARIES_DEFINITION[PLATFORM].binaryName
        const binaryNamePattern = new RegExp('/' + binaryName + '$', 'i')
        return extractFilesFromArchive(archivePath, binaryNamePattern, OUTPUT_FILE_PATH).then((out) => {
            if (['linux', 'darwin'].indexOf(PLATFORM) !== -1) {
                fs.chmod(out, 0o755, () => {
                    console.log(' - Fix permission on', out)
                })
            }
            return out
        })
    })
    .catch((error) => {
        console.log(error.toString())
    })

function cWriteLN(line) {
    process.stdout.cursorTo(0)
    process.stdout.write(' - ' + line)
}

function downloadFile(label, url) {
    return new Promise(function (resolve) {
        const basename = path.basename(url)
        const tmpFilePath = path.join(os.tmpdir(), basename)
        const tmpFileStream = fs.createWriteStream(tmpFilePath)

        https.get(url, function (response) {
            response.pipe(tmpFileStream)
            let cur = 0
            const total = parseInt(response.headers['content-length'])
            console.log(`${label} from ${url}`)
            response.on('data', (data) => {
                cur += data.length
                const progress = total ? Math.round((cur / total) * 100) + '% ' : cur
                cWriteLN(`${label} ${progress}`)
            })
            response.on('end', () => {
                cWriteLN(`Got ${label} from ${url}`)
                console.log()
                resolve(tmpFilePath)
            })
        })
    })
}

function extractFilesFromArchive(zipFilePath, unzipFilePattern, destinationPath) {
    return new Promise(function (resolve) {
        yauzl.open(zipFilePath, null, function extractFile(err, zipfile) {
            if (err) throw err

            zipfile.on('error', (err) => {
                throw err
            })

            zipfile.on('entry', function (entry) {
                if (!unzipFilePattern.test(entry.fileName)) return

                if (!fs.existsSync(destinationPath)) {
                    fs.mkdirSync(path.dirname(destinationPath), {
                        recursive: true,
                    })
                }

                const destinationStream = fs.createWriteStream(destinationPath)
                zipfile.openReadStream(entry, function (err, readStream) {
                    if (err) throw err
                    readStream.on('end', () => resolve(destinationPath))
                    readStream.pipe(destinationStream)
                })
            })
        })
    })
}
