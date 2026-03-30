import { WebSocketServer } from 'ws';
import net from 'net';
import os from 'os';

const WS_PORT = 8081;
const TARGET_HOST = 'mume.org';
const TARGET_PORT = 4242;

console.log('--- MUME Direct TCP Bridge ---');
console.log(`Listening on WS port: ${WS_PORT} (All interfaces)`);
console.log(`Local Access: ws://localhost:${WS_PORT}`);
console.log(`Network Access: ws://${Object.values(os.networkInterfaces()).flat().find(i => i?.family === 'IPv4' && !i?.internal)?.address || 'your-ip'}:${WS_PORT}`);
console.log(`Proxying to ${TARGET_HOST}:${TARGET_PORT}`);
console.log('------------------------------');

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('[Direct-Bridge] Web client connected. Routing to MUME...');

    const socket = new net.Socket();
    let connected = false;

    socket.connect(TARGET_PORT, TARGET_HOST, () => {
        connected = true;
        console.log(`[Direct-Bridge] SUCCESS: Connected to MUME natively!`);

        socket.on('data', (data) => {
            if (ws.readyState === ws.OPEN) ws.send(data);
        });

        ws.on('message', (message) => {
            if (socket.writable) socket.write(message);
        });
    });

    socket.on('error', (err) => {
        console.error('[Direct-Bridge] MUME connection error:', err.message);
        socket.destroy();
        ws.close();
    });

    socket.on('close', (hadError) => {
        if (connected) {
            console.log(`[Direct-Bridge] MUME closed the connection ${hadError ? '(with error)' : ''}`);
            ws.close();
        }
    });

    ws.on('close', () => {
        console.log('[Direct-Bridge] Web client disconnected.');
        socket.destroy();
    });
});
