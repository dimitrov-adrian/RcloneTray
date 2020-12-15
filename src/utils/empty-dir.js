import { existsSync, mkdirSync, promises as fsp } from 'fs'

export async function isEmptyDirectory(path) {
    if (!existsSync(path)) {
        return true
    }
    try {
        const iterator = await fsp.opendir(path)
        const { value, fail } = await iterator[Symbol.asyncIterator]().next()
        await iterator.close()
        return !fail
    } catch (error) {
        return false
    }
}

export async function getEmptyDirectory(path) {
    if (!existsSync(path)) {
        try {
            mkdirSync(path, { recursive: true })
            return true
        } catch (error) {
            return false
        }
    }
    try {
        const iterator = await fsp.opendir(path)
        const { value, fail } = await iterator[Symbol.asyncIterator]().next()
        await iterator.close()
        return !fail
    } catch (error) {
        return false
    }
}
