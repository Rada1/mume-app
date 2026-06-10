import { WebSocketServer } from 'ws';

/**
 * @file mume-sim.js
 * @description A standalone WebSocket server that simulates MUME's login sequence 
 * and GMCP data to facilitate local client testing while mume.org is down.
 */

const PORT = 8081;
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
        '\x1b[33m*   \x1b[33mWelcome to MUME! (LOCAL TEST)\x1b[33m                                         *\x1b[0m',
        '\x1b[33m*                                                                             *\x1b[0m',
        '\x1b[33m*******************************************************************************\x1b[0m',
        '',
        '\x1b[33mBy what name do you wish to be known? \x1b[0m'
    ].join('\n');

    setTimeout(() => {
        console.log('[Sim] Sending banner...');
        ws.send(banner);
    }, 500);

    ws.on('message', (data) => {
        const input = data.toString().trim();
        console.log(`[Sim] RX: "${input}"`);

        if (stage === 'NAME') {
            characterName = input || 'Tester';
            stage = 'PASSWORD';
            ws.send('\x1b[32mAccount Password: \x1b[0m');
        } else if (stage === 'PASSWORD') {
            stage = 'PLAYING';
            ws.send('\n\x1b[36mWelcome back to Middle-earth!\x1b[0m\n');
            ws.send(`Now entering the game as ${characterName}...\n\n`);
            
            // Send initial Room & Vitals via GMCP
            ws.send(createGmcpBuffer('Char.Name', { name: characterName }));
            ws.send(createGmcpBuffer('Char.Vitals', { hp: 450, maxhp: 450, mana: 120, maxmana: 120, move: 100, maxmove: 100, race: 'Beorning' }));
            ws.send(createGmcpBuffer('Room.Info', { 
                name: 'The Simulator Void', 
                desc: 'You are standing in a digital construct designed for testing.', 
                zone: 'Testing Grounds',
                map: 'https://mume.org/download/mapper/arda-base.xml' 
            }));
            
            ws.send('\x1b[1;32mThe Simulator Void\x1b[0m\nIt is cold and quiet here.\x1b[33m\nExits: North South East West\x1b[0m\n\n> ');
        } else {
            // Automated Testing Commands
            if (input.toLowerCase() === 'who' || input.toLowerCase() === 'allies') {
                ws.send('\x1b[32mPlayers\x1b[0m\n');
                ws.send('\x1b[32m-------\x1b[0m\n');
                ws.send('*[Mw] Ellessar (iMw)\n');
                ws.send('*[ A] Rogon Rogoff (Idle) (iM)\n');
                ws.send('<E> Hoplite the Hobbit Adventurer, Elf-friend\n');
                ws.send('    Sirgrög the Man Soldier\n');
                ws.send('28 players on.\n\n> ');
            } else if (input.toLowerCase() === 'minions') {
                ws.send('\x1b[32mMinions\x1b[0m\n');
                ws.send('\x1b[32m-------\x1b[0m\n');
                ws.send('Mozgus the Inhuman, the Butcher of Barad-dûr (Idle)\n');
                ws.send('1 player on.\n\n> ');
            } else if (input.toLowerCase() === 'test_highlights') {
                // Send GMCP data first
                ws.send(createGmcpBuffer('Room.Occupants', [
                    { name: 'a green orc', id: 101, isNpc: true },
                    { name: 'Ciltor', id: 102, isNpc: false }
                ]));
                ws.send(createGmcpBuffer('Room.Items', [
                    { name: 'a heavy sword', id: 201 }
                ]));
                
                // Send matching text
                ws.send('\x1b[32mThe Simulator Void\x1b[0m\n');
                ws.send('A green orc is standing here, glaring at you.\n');
                ws.send('Ciltor is resting by the fire.\n');
                ws.send('[ 5] a heavy sword is lying on the ground.\n\n> ');
            } else if (input.toLowerCase() === 'look board' || input.toLowerCase() === 'look at board' || input.toLowerCase() === 'look b') {
                ws.send('* Yavanna board - 4 messages (out of 4)\n' +
                        '1103#: Buggy boards (Manwë)\n' +
                        '25508#: A few comments on Mume7 (Fëanor)\n' +
                        '32023 : [147:92] emote to the team (Gindil)\n' +
                        '38315 : Maia rooms in zone 150 (Yavanna)\n\n> ');
            } else if (/^read\s+(\d+)$/i.test(input)) {
                const match = input.match(/^read\s+(\d+)$/i);
                const msgId = match[1];
                if (msgId === '38315') {
                    ws.send('Message 38315 on Yavanna:\n' +
                            'Subject: Maia rooms in zone 150\n' +
                            'Author: Yavanna\n' +
                            'Date: Tue Jun  9 14:00:00 2026\n' +
                            '\n' +
                            'Maia rooms body line 1.\n' +
                            'Maia rooms body line 2.\n\n> ');
                } else if (msgId === '25508') {
                    ws.send('Message 25508 on Yavanna Board:\n' +
                            'Subject: A few comments on Mume7\n' +
                            'Author: Fëanor\n' +
                            'Date: Tue Jun  9 14:00:00 2026\n' +
                            '\n' +
                            'This is the first line of the body.\n' +
                            'And the second line.\n\n> ');
                } else {
                    ws.send(`Message ${msgId} not found.\n\n> `);
                }
            } else if (input.toLowerCase() === 'look') {
                ws.send('\x1b[32mThe Simulator Void\x1b[0m\nYou see a console output floating in the air.\n> ');
            } else if (input.toLowerCase() === 'metamorph') {
                ws.send('\x1b[33mYou grow claws and morph into a giant bear!\x1b[0m\n> ');
                ws.send(createGmcpBuffer('Char.Vitals', { hp: 550, maxhp: 550, mana: 120, maxmana: 120, move: 120, maxmove: 120, race: 'Bear' }));
            } else if (input.toLowerCase() === 'return') {
                ws.send('\x1b[33mYou return to your human form.\x1b[0m\n> ');
                ws.send(createGmcpBuffer('Char.Vitals', { hp: 450, maxhp: 450, mana: 120, maxmana: 120, move: 100, maxmove: 100, race: 'Beorning' }));
            } else if (/^(?:cast|c)\s+['"]?bless['"]?$/i.test(input)) {
                ws.send('You feel righteous.\n\n> ');
            } else if (/^(?:cast|c)\s+['"]?armou?r['"]?$/i.test(input)) {
                ws.send('A blue transparent wall slowly appears.\n\n> ');
            } else if (/^(?:cast|c)\s+['"]?shield['"]?$/i.test(input)) {
                ws.send('You feel protected.\n\n> ');
            } else if (input.toLowerCase() === 'fail bless') {
                ws.send('You lost your concentration!\n\n> ');
            } else if (input.toLowerCase() === 'wear bless') {
                ws.send('Your blessing wears off.\n\n> ');
            } else {
                ws.send(`Unknown command: ${input}\n> `);
            }
        }
    });

    ws.on('close', () => {
        console.log('[Sim] Client disconnected');
    });
});
