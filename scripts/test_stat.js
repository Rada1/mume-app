import net from 'net';
import fs from 'fs';

const HOST = 'mume.org';
const PORT = 4242;
const CHARACTER = 'ellessar';
const PASSWORD = 'radagast';

const socket = net.createConnection(PORT, HOST, () => {
    console.log('Connected!');
});

let buffer = '';
let state = 'CONNECTING';

socket.on('data', (data) => {
    const text = data.toString('utf8');
    buffer += text;
    const cleanBuffer = buffer.replace(/\x1b\[[0-9;]*m/g, '');

    if (state === 'CONNECTING') {
        if (cleanBuffer.toLowerCase().includes('what name do you wish') || cleanBuffer.toLowerCase().includes('by what name')) {
            state = 'LOGIN_NAME';
            buffer = '';
            socket.write(CHARACTER + '\r\n');
        }
    } else if (state === 'LOGIN_NAME') {
        if (cleanBuffer.toLowerCase().includes('password:')) {
            state = 'LOGIN_PASSWORD';
            buffer = '';
            socket.write(PASSWORD + '\r\n');
        }
    } else if (state === 'LOGIN_PASSWORD') {
        if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
            buffer = '';
            socket.write('\r\n');
        } else if (cleanBuffer.includes('play ellessar') || cleanBuffer.includes('Select one of the following:')) {
            socket.write('play ellessar\r\n');
            state = 'LOGGING_IN';
            buffer = '';
        } else if (cleanBuffer.trim().endsWith('*') || cleanBuffer.trim().endsWith('>')) {
            state = 'IN_GAME';
            buffer = '';
            runTest();
        }
    } else if (state === 'LOGGING_IN') {
        if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
            buffer = '';
            socket.write('\r\n');
        } else if (cleanBuffer.trim().endsWith('*') || cleanBuffer.trim().endsWith('>')) {
            state = 'IN_GAME';
            buffer = '';
            runTest();
        }
    } else if (state === 'IN_GAME') {
        // Just print output
        console.log(text);
    }
});

function runTest() {
    console.log('Running stat commands...');
    socket.write('/stat object 1000\r\n');
    setTimeout(() => {
        socket.write('/stat mobile 1000\r\n');
    }, 2000);
    setTimeout(() => {
        socket.write('quit\r\n');
    }, 4000);
}
