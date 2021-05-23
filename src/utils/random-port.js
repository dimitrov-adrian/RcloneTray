import net from 'node:net';

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

export default function randomPort() {
    return new Promise(findRandomPort);
}