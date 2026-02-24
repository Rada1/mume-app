import { WebSocketServer } from 'ws';
import net from 'net';

const WS_PORT = 8080;
// Port 900 is confirmed as your mMapper listener
const PORTS = [900, 4242];
const HOSTS = ['127.0.0.1', 'localhost'];

console.log('--- MUME App mMapper Bridge (v2.3) ---');
console.log(`Bridge active on ws://localhost:${WS_PORT}`);
console.log('--------------------------------------');

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('[Bridge] Web client connected. Searching for mMapper...');

    let mmapper = null;
    let connected = false;

    const tryConnect = (portIdx, hostIdx) => {
        if (connected) return;

        if (hostIdx >= HOSTS.length) {
            hostIdx = 0;
            portIdx++;
        }

        if (portIdx >= PORTS.length) {
            console.error('[Bridge] Could not find mMapper. Is it running?');
            ws.close();
            return;
        }

        const host = HOSTS[hostIdx];
        const port = PORTS[portIdx];
        const socket = new net.Socket();

        // Only use timeout for the INITIAL connection attempt
        socket.setTimeout(2000);

        socket.connect(port, host, () => {
            socket.setTimeout(0); // DISABLE timeout once connected!
            connected = true;
            mmapper = socket;
            console.log(`[Bridge] SUCCESS: Connected to mMapper on ${host}:${port}`);

            socket.on('data', (data) => {
                if (ws.readyState === ws.OPEN) ws.send(data);
            });

            ws.on('message', (message) => {
                if (socket.writable) socket.write(message);
            });
        });

        socket.on('error', () => {
            socket.destroy();
            if (!connected) tryConnect(portIdx, hostIdx + 1);
        });

        socket.on('timeout', () => {
            socket.destroy();
            if (!connected) tryConnect(portIdx, hostIdx + 1);
        });

        socket.on('close', (hadError) => {
            if (connected) {
                console.log(`[Bridge] mMapper closed the connection ${hadError ? '(with error)' : ''}`);
                ws.close();
            }
        });
    };

    tryConnect(0, 0);

    ws.on('close', () => {
        console.log('[Bridge] Web client disconnected.');
        if (mmapper) mmapper.destroy();
    });
});
