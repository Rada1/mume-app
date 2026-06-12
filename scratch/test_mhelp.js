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
    const clean = buffer.replace(/\x1b\[[0-9;]*m/g, '');

    console.log(text); // Print raw output to console

    if (state === 'CONNECTING') {
        if (clean.toLowerCase().includes('what name do you wish') || clean.toLowerCase().includes('by what name')) {
            state = 'LOGIN_NAME';
            buffer = '';
            socket.write(CHARACTER + '\r\n');
        }
    } else if (state === 'LOGIN_NAME') {
        if (clean.toLowerCase().includes('password:')) {
            state = 'LOGIN_PASSWORD';
            buffer = '';
            socket.write(PASSWORD + '\r\n');
        }
    } else if (state === 'LOGIN_PASSWORD') {
        if (clean.includes('[Return to continue]') || clean.includes('return: continue')) {
            buffer = '';
            socket.write('\r\n');
        } else if (clean.includes('play ellessar') || clean.includes('Select one of the following:')) {
            socket.write('play ellessar\r\n');
            state = 'LOGGING_IN';
            buffer = '';
        } else if (clean.trim().endsWith('>')) {
            state = 'IN_GAME';
            buffer = '';
            runCommands();
        }
    } else if (state === 'LOGGING_IN') {
        if (clean.includes('[Return to continue]') || clean.includes('return: continue')) {
            buffer = '';
            socket.write('\r\n');
        } else if (clean.trim().endsWith('>')) {
            state = 'IN_GAME';
            buffer = '';
            runCommands();
        }
    }
});

function runCommands() {
    console.log('Running diagnostic commands...');
    // We send /mhelp /mhelp to see if there is any option, or we try sending q to exit the viewer
    socket.write('pag length 0\r\n');
    setTimeout(() => {
        socket.write('/mhelp /mhelp\r\n');
    }, 1000);
    setTimeout(() => {
        socket.write('q\r\n'); // Send q in case it's in the text viewer
    }, 2000);
    setTimeout(() => {
        socket.write('quit\r\n');
    }, 4000);
}
