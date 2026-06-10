import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const username = 'ellessar';
const password = 'radagast';
const wsUrl = 'wss://mume.org/ws-play/';

const helpCommands = [
    '/help info',
    '/help zone',
    '/help stat',
    '/help stat room',
    '/help stat mobile',
    '/help stat object'
];

const ws = new WebSocket(wsUrl);
let currentCommandIndex = -1;
let commandTimeout = null;
let collectedText = '';
let results = {};

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
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function sendCommand(text) {
    console.log(`Sending: ${text}`);
    const buffer = Buffer.from(text + '\n', 'utf8');
    ws.send(buffer);
}

let state = 'CONNECTING';

ws.on('open', () => {
    console.log('Connected to MUME WebSocket.');
    state = 'LOGIN_NAME';
});

ws.on('message', (data) => {
    const rawBuffer = Buffer.from(data);
    const cleaned = cleanOutput(rawBuffer);
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
            console.log('Successfully entered game directly. Starting help gathering...');
            state = 'GATHERING';
            nextCommand();
        } else if (lower.includes('type play') || lower.includes('play <char>') || lower.includes('what is your choice') || lower.includes('choice?')) {
            sendCommand(`play ${username}`);
            state = 'ENTER_GAME';
        } else if (lower.includes('press return') || lower.includes('[return]')) {
            sendCommand('');
        }
    } else if (state === 'ENTER_GAME') {
        if (lower.includes('ellessar') || lower.includes('>') || lower.includes('welcome to') || lower.includes('[150:')) {
            console.log('Successfully entered game. Starting help gathering...');
            state = 'GATHERING';
            nextCommand();
        }
    } else if (state === 'GATHERING') {
        collectedText += cleaned;
        
        if (commandTimeout) clearTimeout(commandTimeout);
        commandTimeout = setTimeout(() => {
            const cmd = helpCommands[currentCommandIndex];
            results[cmd] = collectedText;
            console.log(`Finished gathering for: ${cmd}`);
            nextCommand();
        }, 1500);
    }
});

function nextCommand() {
    currentCommandIndex++;
    if (currentCommandIndex < helpCommands.length) {
        collectedText = '';
        sendCommand(helpCommands[currentCommandIndex]);
    } else {
        finish();
    }
}

function finish() {
    console.log('Finished gathering all help pages. Saving to markdown...');
    let mdContent = '# MUME Building Guide: Info, Zone, and Stat Guides\n\n';
    mdContent += 'This guide contains locally stored MUME building help pages for `/help info`, `/help zone`, and `/help stat` retrieved directly from the live game server.\n\n';

    for (const cmd of helpCommands) {
        let text = results[cmd] || 'No content retrieved.';
        
        const lines = text.split('\n')
            .map(line => line.replace(/\r/g, '').trimEnd())
            .filter(line => !line.includes('ellessar>') && !line.includes('15019[') && !line.includes('/help'));

        const cleanText = lines.join('\n').trim();

        mdContent += `## ${cmd}\n\n\`\`\`text\n${cleanText}\n\`\`\`\n\n`;
    }

    const outputFilePath = path.join('c:/Users/pwetz/Downloads/mume app/docs', 'info_zone_stat_help.md');
    fs.writeFileSync(outputFilePath, mdContent, 'utf8');
    console.log(`Saved help guides successfully to: ${outputFilePath}`);
    ws.close();
    process.exit(0);
}

ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
});

ws.on('close', () => {
    console.log('Connection closed.');
});
