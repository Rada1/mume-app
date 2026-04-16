import { WebSocketServer } from 'ws';

/**
 * @file mume-sim.js
 * @description A standalone WebSocket server that simulates MUME's login sequence 
 * and GMCP data to facilitate local client testing while mume.org is down.
 */

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`\x1b[32m[MUME Sim]\x1b[0m Server running on \x1b[36mws://localhost:${PORT}\x1b[0m`);

// Helper to wrap GMCP payloads in Telnet IAC sequences
function createGmcpBuffer(pkg, data) {
    const payload = pkg + (data ? ' ' + JSON.stringify(data) : '');
    return Buffer.concat([
        Buffer.from([0xFF, 0xFA, 0xC9]), // IAC SB TELNET_GMCP (201)
        Buffer.from(payload),
        Buffer.from([0xFF, 0xF0])        // IAC SE
    ]);
}

wss.on('connection', (ws) => {
    console.log('[Sim] Client connected');
    let stage = 'NAME';
    let characterName = '';

    // Simulate the initial Telnet handshake / Banner
    const banner = [
        '',
        '\x1b[33m*******************************************************************************\x1b[0m',
        '\x1b[33m*                                                                             *\x1b[0m',
        '\x1b[33m*   \x1b[36mWelcome to the MUME Simulator (LOCAL TEST)\x1b[33m                                *\x1b[0m',
        '\x1b[33m*                                                                             *\x1b[0m',
        '\x1b[33m*******************************************************************************\x1b[0m',
        '',
        'By what name do you wish to be known? '
    ].join('\n');

    ws.send(banner);

    ws.on('message', (data) => {
        const input = data.toString().trim();
        console.log(`[Sim] RX: "${input}"`);

        if (stage === 'NAME') {
            characterName = input || 'Tester';
            stage = 'PASSWORD';
            ws.send('\x1b[32mPassword: \x1b[0m');
        } else if (stage === 'PASSWORD') {
            stage = 'PLAYING';
            ws.send('\n\x1b[36mWelcome back to Middle-earth!\x1b[0m\n');
            ws.send(`Now entering the game as ${characterName}...\n\n`);
            
            // Send initial Room & Vitals via GMCP
            ws.send(createGmcpBuffer('Char.Name', { name: characterName }));
            ws.send(createGmcpBuffer('Char.Vitals', { hp: 450, maxhp: 450, mana: 120, maxmana: 120, move: 100, maxmove: 100 }));
            ws.send(createGmcpBuffer('Room.Info', { 
                name: 'The Simulator Void', 
                desc: 'You are standing in a digital construct designed for testing.', 
                zone: 'Testing Grounds',
                map: 'https://mume.org/download/mapper/arda-base.xml' 
            }));
            
            ws.send('\x1b[32mThe Simulator Void\x1b[0m\nIt is cold and quiet here.\x1b[33m\nExits: North South East West\x1b[0m\n\n> ');
        } else {
            // Simple echo for gameplay testing
            if (input.toLowerCase() === 'look') {
                ws.send('\x1b[32mThe Simulator Void\x1b[0m\nYou see a console output floating in the air.\n> ');
            } else {
                ws.send(`Unknown command: ${input}\n> `);
            }
        }
    });

    ws.on('close', () => {
        console.log('[Sim] Client disconnected');
    });
});
