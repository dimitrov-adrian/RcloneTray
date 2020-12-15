import net from 'net'

/**
 * @param {CallableFunction} success
 * @param {CallableFunction} fail
 */
export function findRandomPort(success, fail) {
    const server = net.createServer()
    server.unref()
    server.on('error', fail)
    server.listen(0, () => {
        const port = server.address().port
        server.close(() => success(port))
    })
}

export default function randomPort() {
    return new Promise(findRandomPort)
}
