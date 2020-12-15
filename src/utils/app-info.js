import { existsSync, readFileSync } from 'fs'
const packageJson = getJsonFile('./package.json')

const appInfo = {
    version: packageJson.version,
    name: packageJson.name,
    author: packageJson.author,
    appId: packageJson.build.appId,
    productName: packageJson.build.productName,
    homepage: packageJson.homepage,
    issuesLink: packageJson.bugs.url,
    releaseUpdateURI: packageJson.releaseUpdate,
    generateReportLink,
}

function getJsonFile(file) {
    if (existsSync(file)) {
        const content = readFileSync(file, {
            encoding: 'utf-8',
        })

        if (content) {
            try {
                return JSON.parse(content)
            } catch (error) {}
        }
    }
    return null
}

function generateReportLink(title, message) {
    return appInfo.issuesLink + '/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(message)
}

export default appInfo
