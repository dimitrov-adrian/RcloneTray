import process from 'node:process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';

/**
 * @param {string} id
 * @returns {Promise<string>}
 */
export function singleInstanceLock(id) {
    // Calculate hash depending on version, runtime, user... So we won't
    // accidentally prevent launch when there are multiple users running program,
    // if by some reason they use same temporary directory.
    const hash = crypto.createHash('sha1').update(id).update(os.userInfo().username.toString()).digest('hex');

    // Socket filename.
    const socketName =
        `${id}-${hash}`
            .toString()
            .toLowerCase()
            .replace(/[^a-z\d-.]/g, '') + '.lock';

    // Socket filepath.
    const socketPath =
        process.platform === 'win32'
            ? `\\\\.\\pipe\\${socketName}`
            : process.platform === 'darwin'
            ? `${os.tmpdir()}/.${id}.${socketName}`
            : `${os.homedir()}/.${id}.${socketName}`;

    return new Promise((resolve, reject) => {
        if (fs.existsSync(socketPath)) {
            connectToInstance(socketPath, () => createInstanceSock(socketPath, resolve, reject), reject);
        } else {
            createInstanceSock(socketPath, resolve, reject);
        }
    });
}

/**
 * @param {string} socketPath
 * @param {(value: any) => void} resolve
 * @param {(reason?: string) => void} reject
 */
function createInstanceSock(socketPath, resolve, reject) {
    const sock = net.createServer();

    sock.listen(socketPath, () => {
        process.on('exit', () => {
            if (process.platform !== 'win32' && fs.existsSync(socketPath)) {
                fs.unlinkSync(socketPath);
            }
        });
        resolve(socketPath);
    });

    sock.on('error', () => {
        reject('CANNOT_INSTANTINATE');
    });
}

/**
 * @param {string} socketPath
 * @param {(value: any) => void} resolve
 * @param {(reason?: string) => void} reject
 */
function connectToInstance(socketPath, resolve, reject) {
    const socketServer = net.createConnection(socketPath);

    socketServer.on('connect', () => {
        reject('ALREADY_RUNNING');
    });

    socketServer.on('error', () => {
        if (process.platform !== 'win32' && fs.existsSync(socketPath)) {
            fs.unlinkSync(socketPath);
        }

        resolve(socketPath);
    });
}
