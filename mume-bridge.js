/**
 * @file mume-bridge.js
 * @description Persistent WebSocket-to-telnet bridge for MUME.
 */

import { WebSocketServer } from 'ws';
import net from 'net';
import os from 'os';

// --- Configuration Section ---
const WS_PORT = Number(process.env.MUME_BRIDGE_PORT || 8081);
const TARGET_HOST = process.env.MUME_HOST || 'mume.org';
const TARGET_PORT = Number(process.env.MUME_PORT || 4242);
const DETACH_GRACE_MS = Number(process.env.MUME_BRIDGE_GRACE_MS || 10 * 60 * 1000);
const OFFLINE_BUFFER_LIMIT = Number(process.env.MUME_BRIDGE_BUFFER_LIMIT || 256 * 1024);

// --- State Section ---
const wss = new WebSocketServer({ port: WS_PORT });
let mumeSocket = null;
let activeClient = null;
let isMumeConnected = false;
let isMumeConnecting = false;
let offlineBuffer = [];
let offlineBufferBytes = 0;
let detachTimer = null;

// --- Network Info Section ---
const getNetworkAddress = () => {
    const interfaces = Object.values(os.networkInterfaces()).flat();
    return interfaces.find(i => i?.family === 'IPv4' && !i?.internal)?.address || 'your-ip';
};

console.log('--- MUME Persistent TCP Bridge ---');
console.log(`Listening on WS port: ${WS_PORT} (All interfaces)`);
console.log(`Local Access: ws://localhost:${WS_PORT}`);
console.log(`Network Access: ws://${getNetworkAddress()}:${WS_PORT}`);
console.log(`Proxying to ${TARGET_HOST}:${TARGET_PORT}`);
console.log(`Detach grace: ${Math.round(DETACH_GRACE_MS / 1000)}s`);
console.log('-----------------------------------');

// --- Buffer Section ---
const rememberOfflineData = (data) => {
    const chunk = Buffer.from(data);
    offlineBuffer.push(chunk);
    offlineBufferBytes += chunk.byteLength;

    while (offlineBufferBytes > OFFLINE_BUFFER_LIMIT && offlineBuffer.length > 0) {
        const removed = offlineBuffer.shift();
        offlineBufferBytes -= removed?.byteLength || 0;
    }
};

const flushOfflineData = (ws) => {
    if (offlineBuffer.length === 0 || ws.readyState !== ws.OPEN) return;
    for (const chunk of offlineBuffer) ws.send(chunk);
    console.log(`[Bridge] Replayed ${offlineBufferBytes} buffered bytes to browser.`);
    offlineBuffer = [];
    offlineBufferBytes = 0;
};

// --- Session Section ---
const clearDetachTimer = () => {
    if (!detachTimer) return;
    clearTimeout(detachTimer);
    detachTimer = null;
};

const closeMumeSession = (reason) => {
    clearDetachTimer();
    isMumeConnected = false;
    isMumeConnecting = false;
    offlineBuffer = [];
    offlineBufferBytes = 0;

    if (mumeSocket) {
        console.log(`[Bridge] Closing MUME session: ${reason}`);
        mumeSocket.destroy();
        mumeSocket = null;
    }
};

const scheduleDetachedClose = () => {
    clearDetachTimer();
    detachTimer = setTimeout(() => {
        if (!activeClient) closeMumeSession('browser detached past grace window');
    }, DETACH_GRACE_MS);
};

const ensureMumeSession = () => {
    if (mumeSocket || isMumeConnecting) return;

    mumeSocket = new net.Socket();
    isMumeConnecting = true;
    console.log('[Bridge] Opening MUME telnet session...');

    mumeSocket.connect(TARGET_PORT, TARGET_HOST, () => {
        isMumeConnected = true;
        isMumeConnecting = false;
        console.log('[Bridge] Connected to MUME.');
    });

    mumeSocket.on('data', (data) => {
        if (activeClient?.readyState === activeClient.OPEN) {
            activeClient.send(data);
        } else {
            rememberOfflineData(data);
        }
    });

    mumeSocket.on('error', (err) => {
        console.error('[Bridge] MUME connection error:', err.message);
        activeClient?.close();
        closeMumeSession('MUME socket error');
    });

    mumeSocket.on('close', (hadError) => {
        console.log(`[Bridge] MUME closed the connection ${hadError ? '(with error)' : ''}`);
        isMumeConnected = false;
        isMumeConnecting = false;
        mumeSocket = null;
        activeClient?.close();
    });
};

// --- WebSocket Section ---
wss.on('connection', (ws) => {
    console.log('[Bridge] Browser attached.');
    clearDetachTimer();

    if (activeClient && activeClient.readyState === activeClient.OPEN) {
        console.log('[Bridge] Replacing previous browser client.');
        activeClient.close(1012, 'New browser client attached');
    }

    activeClient = ws;
    ensureMumeSession();
    flushOfflineData(ws);

    ws.on('message', (message) => {
        if (mumeSocket?.writable && (isMumeConnected || isMumeConnecting)) {
            mumeSocket.write(message);
        }
    });

    ws.on('close', () => {
        if (activeClient !== ws) return;
        console.log('[Bridge] Browser detached; preserving MUME session.');
        activeClient = null;
        scheduleDetachedClose();
    });

    ws.on('error', (err) => {
        console.error('[Bridge] Browser WebSocket error:', err.message);
    });
});
