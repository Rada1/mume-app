/**
 * @file shaper-sync-relay.js
 * @description Minimal WebSocket fanout relay for Shaper project events.
 */

import { WebSocketServer } from 'ws';

const port = Number(process.env.SHAPER_SYNC_PORT || 8092);
const server = new WebSocketServer({ port });

// --- Relay Section ---
server.on('connection', socket => {
    socket.on('message', message => {
        for (const client of server.clients) {
            if (client === socket || client.readyState !== client.OPEN) continue;
            client.send(message.toString());
        }
    });
});

server.on('listening', () => {
    console.log(`Shaper sync relay listening on ws://localhost:${port}`);
});
