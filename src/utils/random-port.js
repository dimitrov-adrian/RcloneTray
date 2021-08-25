import net from 'net';

/**
 * @param {(value: any) => void} success
 * @param {(reason?: any) => void} fail
 */
export function findRandomPort(success, fail) {
    const server = net.createServer();
    server.unref();
    server.on('error', fail);
    server.listen(() => {
        // @ts-ignore
        const port = server.address().port;
        server.close(() => success(port));
    });
}

/**
 * Locate random free network port
 * @returns {Promise<number, Error>}
 */
export function randomPort() {
    return new Promise(findRandomPort);
}
