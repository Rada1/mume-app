import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const username = 'ellessar';
const password = 'radagast';
const wsUrl = 'wss://mume.org/ws-play/';

const ws = new WebSocket(wsUrl);
let collectedText = '';
let commandTimeout = null;
let state = 'CONNECTING';

function cleanOutput(raw) {
    let text = '';
    let i = 0;
    while (i < raw.length) {
        const byte = raw[i];
        if (byte === 255) { // IAC
            const cmd = raw[i + 1];
            if (cmd === 251 || cmd === 252 || cmd === 253 || cmd === 254) {
                i += 3;
            } else {
                i += 2;
            }
        } else {
            text += String.fromCharCode(byte);
            i++;
        }
    }
    // Strip ANSI color codes
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function sendCommand(text) {
    console.log(`Sending: ${text}`);
    const buffer = Buffer.from(text + '\n', 'utf8');
    ws.send(buffer);
}

ws.on('open', () => {
    console.log('Connected to MUME WebSocket.');
    state = 'LOGIN_NAME';
});

ws.on('message', (data) => {
    const rawBuffer = Buffer.from(data);
    const cleaned = cleanOutput(rawBuffer);
    
    // Log output to console in real-time
    process.stdout.write(cleaned);

    const lower = cleaned.toLowerCase();

    if (state === 'LOGIN_NAME') {
        if (lower.includes('by what name') || lower.includes('wish to be known') || lower.includes('name?')) {
            sendCommand(username);
            state = 'LOGIN_PASS';
        }
    } else if (state === 'LOGIN_PASS') {
        if (lower.includes('password:')) {
            sendCommand(password);
            state = 'MOTD';
        }
    } else if (state === 'MOTD') {
        if (lower.includes('ellessar') || lower.includes('>') || lower.includes('[150:') || lower.includes('obvious exits')) {
            console.log('\nSuccessfully logged in. Disabling paging and fetching guide...');
            sendCommand('paging 0');
            state = 'FETCHING';
            setTimeout(() => {
                sendCommand('read guide all');
            }, 1000);
        } else if (lower.includes('type play') || lower.includes('play <char>') || lower.includes('what is your choice') || lower.includes('choice?')) {
            sendCommand(`play ${username}`);
            state = 'ENTER_GAME';
        } else if (lower.includes('press return') || lower.includes('[return]')) {
            sendCommand('');
        }
    } else if (state === 'ENTER_GAME') {
        if (lower.includes('ellessar') || lower.includes('>') || lower.includes('welcome to') || lower.includes('[150:')) {
            console.log('\nSuccessfully entered game. Disabling paging and fetching guide...');
            sendCommand('paging 0');
            state = 'FETCHING';
            setTimeout(() => {
                sendCommand('read guide all');
            }, 1000);
        }
    } else if (state === 'FETCHING') {
        collectedText += cleaned;

        // If we see a paging prompt, handle it just in case
        if (lower.includes('[return to continue') || lower.includes('return to continue') || lower.includes('[return]')) {
            sendCommand('');
        }

        if (commandTimeout) clearTimeout(commandTimeout);
        // Wait 4 seconds of inactivity to assume the output has finished
        commandTimeout = setTimeout(() => {
            finish();
        }, 4000);
    }
});

function finish() {
    console.log('\nNo activity for 4 seconds. Saving guide to markdown...');

    // Clean up prompts and headers from the final output
    const lines = collectedText.split('\n')
        .map(line => line.replace(/\r/g, '').trimEnd());

    // Filter out command prompts and echoes
    const cleanLines = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('ellessar>') || lowerLine.includes('read guide all')) return false;
        return true;
    });

    const outputFilePath = path.join('c:/Users/pwetz/Downloads/mume app/docs', 'builders_guide.md');
    fs.writeFileSync(outputFilePath, cleanLines.join('\n').trim(), 'utf8');
    console.log(`Saved builder's guide successfully to: ${outputFilePath}`);
    ws.close();
    process.exit(0);
}

ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
});

ws.on('close', () => {
    console.log('Connection closed.');
});
