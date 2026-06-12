import net from 'net';
import fs from 'fs';

const HOST = 'mume.org';
const PORT = 4242;
const CHARACTER = 'ellessar';
const PASSWORD = 'radagast';

// Telnet constants
const IAC = 255;
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const SE = 240;
const TELNET_ECHO = 1;
const TELNET_TTYPE = 24;
const TELNET_NAWS = 31;

class MumeScraper {
    constructor() {
        this.socket = null;
        this.buffer = '';
        this.state = 'CONNECTING'; // CONNECTING, LOGIN_NAME, LOGIN_PASSWORD, LOGGING_IN_CHARACTER, IN_GAME
        this.commandQueue = [];
        this.sentCommandsCount = 0;
        this.rawResponses = '';
        
        this.logFile = 'mume_scraper_info_stats.log';
        this.rawOutFile = 'mume_scraped_raw.txt';
        this.inactivityTimer = null;
        this.allCommandsSent = false;
        
        fs.writeFileSync(this.logFile, `=== Scraper Session Started at ${new Date().toISOString()} ===\n`);
        fs.writeFileSync(this.rawOutFile, '');
    }

    log(msg) {
        console.log(msg);
        fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ${msg}\n`);
    }

    start() {
        this.log(`Connecting to ${HOST}:${PORT}...`);
        this.socket = net.createConnection(PORT, HOST, () => {
            this.log('Connected to socket!');
        });

        let telnetState = 'DATA';
        let negotiationCmd = 0;
        let subBuffer = [];

        this.socket.on('data', (data) => {
            this.resetInactivityTimer();

            const textBytes = [];
            for (let i = 0; i < data.length; i++) {
                const byte = data[i];
                switch (telnetState) {
                    case 'DATA':
                        if (byte === IAC) {
                            telnetState = 'IAC';
                        } else {
                            if (byte !== 13) textBytes.push(byte);
                        }
                        break;
                    case 'IAC':
                        if (byte === SB) {
                            telnetState = 'SUB';
                            subBuffer = [];
                        } else if (byte === WILL || byte === WONT || byte === DO || byte === DONT) {
                            telnetState = 'NEGOTIATE';
                            negotiationCmd = byte;
                        } else {
                            telnetState = 'DATA';
                        }
                        break;
                    case 'NEGOTIATE':
                        this.handleNegotiation(negotiationCmd, byte);
                        telnetState = 'DATA';
                        break;
                    case 'SUB':
                        if (byte === IAC) telnetState = 'SUB_IAC';
                        else subBuffer.push(byte);
                        break;
                    case 'SUB_IAC':
                        if (byte === SE) {
                            telnetState = 'DATA';
                        } else if (byte === IAC) {
                            subBuffer.push(255);
                            telnetState = 'SUB';
                        } else {
                            subBuffer.push(byte);
                            telnetState = 'SUB';
                        }
                        break;
                }
            }

            if (textBytes.length > 0) {
                const text = Buffer.from(textBytes).toString('utf8');
                this.handleGameText(text);
            }
        });

        this.socket.on('close', () => {
            this.log('Connection closed.');
            this.parseAndSaveResults();
            process.exit(0);
        });

        this.socket.on('error', (err) => {
            this.log(`Socket Error: ${err.message}`);
            this.parseAndSaveResults();
            process.exit(1);
        });
    }

    resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        if (this.allCommandsSent) {
            this.inactivityTimer = setTimeout(() => {
                this.log('No data received for 15 seconds after all commands sent. Closing socket...');
                this.socket.destroy();
            }, 15000);
        }
    }

    handleNegotiation(cmd, option) {
        if (cmd === DO && option === TELNET_TTYPE) {
            this.socket.write(Buffer.from([IAC, WILL, TELNET_TTYPE]));
            this.socket.write(Buffer.from([IAC, SB, TELNET_TTYPE, 0, ...Buffer.from("xterm-256color"), IAC, SE]));
        } else if (cmd === DO && option === TELNET_NAWS) {
            this.socket.write(Buffer.from([IAC, WILL, TELNET_NAWS]));
            const w = 120;
            const h = 40;
            this.socket.write(Buffer.from([IAC, SB, TELNET_NAWS, (w >> 8) & 0xFF, w & 0xFF, (h >> 8) & 0xFF, h & 0xFF, IAC, SE]));
        } else if (cmd === WILL && option === TELNET_ECHO) {
            this.socket.write(Buffer.from([IAC, DO, TELNET_ECHO]));
        } else if (cmd === WONT && option === TELNET_ECHO) {
            this.socket.write(Buffer.from([IAC, DONT, TELNET_ECHO]));
        } else if (cmd === WILL) {
            this.socket.write(Buffer.from([IAC, DONT, option]));
        } else if (cmd === DO) {
            this.socket.write(Buffer.from([IAC, WONT, option]));
        }
    }

    send(text) {
        this.socket.write(text + '\r\n');
    }

    handleGameText(text) {
        this.buffer += text;
        this.rawResponses += text;
        fs.appendFileSync(this.rawOutFile, text);

        const cleanBuffer = this.buffer.replace(/\x1b\[[0-9;]*m/g, '');

        if (this.state === 'CONNECTING') {
            if (cleanBuffer.toLowerCase().includes('what name do you wish') || cleanBuffer.toLowerCase().includes('by what name')) {
                this.state = 'LOGIN_NAME';
                this.buffer = '';
                this.send(CHARACTER);
            }
        } else if (this.state === 'LOGIN_NAME') {
            if (cleanBuffer.toLowerCase().includes('password:')) {
                this.state = 'LOGIN_PASSWORD';
                this.buffer = '';
                this.send(PASSWORD);
            }
        } else if (this.state === 'LOGIN_PASSWORD') {
            if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
                this.buffer = '';
                this.send('');
            } else if (cleanBuffer.includes('play ellessar') || cleanBuffer.includes('Select one of the following:')) {
                this.send('play ellessar');
                this.state = 'LOGGING_IN_CHARACTER';
                this.buffer = '';
            } else if (this.isPrompt(cleanBuffer)) {
                this.log('Logged in directly!');
                this.state = 'IN_GAME';
                this.buffer = '';
                this.initScrape();
            }
        } else if (this.state === 'LOGGING_IN_CHARACTER') {
            if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
                this.buffer = '';
                this.send('');
            } else if (this.isPrompt(cleanBuffer)) {
                this.log('In Game!');
                this.state = 'IN_GAME';
                this.buffer = '';
                this.initScrape();
            }
        } else if (this.state === 'IN_GAME') {
            if (this.buffer.length > 20000) {
                this.buffer = this.buffer.substring(this.buffer.length - 10000);
            }
        }
    }

    isPrompt(cleanText) {
        const trimmed = cleanText.trim();
        return trimmed.endsWith('*') || trimmed.endsWith('>') || trimmed.endsWith('* >') || trimmed.endsWith('*)') || /[\d]+H\s+[\d]+M\s+[\d]+V\s+>$/.test(trimmed);
    }

    initScrape() {
        this.log('Loading usable entities list...');
        if (!fs.existsSync('mume_usable_entities.json')) {
            this.log('Error: mume_usable_entities.json not found!');
            this.socket.destroy();
            return;
        }

        const usableEntities = JSON.parse(fs.readFileSync('mume_usable_entities.json', 'utf8'));

        // Support command-line --limit flag for dry run/testing
        const limitArgIndex = process.argv.indexOf('--limit');
        const entityLimit = limitArgIndex !== -1 ? parseInt(process.argv[limitArgIndex + 1], 10) : Infinity;

        this.log(`Entity limit set to: ${entityLimit === Infinity ? 'ALL' : entityLimit}`);

        // Mobiles
        let mobCount = 0;
        for (const item of usableEntities.mobiles) {
            if (mobCount >= entityLimit) break;
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                this.commandQueue.push({ type: 'mobile', action: 'info', vnum, cmd: `/info m ${vnum} r` });
                this.commandQueue.push({ type: 'mobile', action: 'stat', vnum, cmd: `/stat m ${vnum} r` });
                mobCount++;
            }
        }

        // Objects
        let objCount = 0;
        for (const item of usableEntities.objects) {
            if (objCount >= entityLimit) break;
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                this.commandQueue.push({ type: 'object', action: 'info', vnum, cmd: `/info object ${vnum} r` });
                this.commandQueue.push({ type: 'object', action: 'stat', vnum, cmd: `/stat object ${vnum}` });
                objCount++;
            }
        }

        this.log(`Queue populated with ${this.commandQueue.length} commands.`);
        this.sendPacedCommands();
    }

    sendPacedCommands() {
        if (this.commandQueue.length === 0) {
            this.log('All commands sent. Waiting for responses to complete...');
            this.allCommandsSent = true;
            this.send('quit');
            this.resetInactivityTimer();
            return;
        }

        const next = this.commandQueue.shift();
        this.send(next.cmd);
        this.sentCommandsCount++;

        if (this.sentCommandsCount % 100 === 0) {
            this.log(`Sent ${this.sentCommandsCount} commands...`);
        }

        // Using 45ms spacing to prevent buffer overflow/disconnections on MUME's side
        setTimeout(() => this.sendPacedCommands(), 45);
    }

    parseAndSaveResults() {
        this.log('Starting parser on captured responses...');
        const cleanData = fs.readFileSync(this.rawOutFile, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
        
        // Split by command prompt
        const blocks = cleanData.split(/!\[\s*C\s+iMw[^>]*>/);

        const mobiles = {};
        const objects = {};

        for (const block of blocks) {
            const trimmed = block.trim();
            if (!trimmed) continue;

            // 1. Mobile Info Matcher
            // Notes on mobile 9901 ...
            let match = trimmed.match(/Notes on mobile\s+(\d+)\s*\(([^)]+)\)\s*\(lgit:[^)]+\):([\s\S]*)/i);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const desc = match[2];
                const content = match[3].trim();
                if (!mobiles[vnum]) mobiles[vnum] = {};
                mobiles[vnum].vnum = vnum;
                mobiles[vnum].name = desc;
                mobiles[vnum].info = content;
                continue;
            }

            // Also check for restricted/no notes mobiles to still capture their names if possible
            match = trimmed.match(/(?:You may not view the notes on|There are no notes on) mobile\s+(\d+)\s*\(([^)]+)\)/i);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const desc = match[2];
                if (!mobiles[vnum]) mobiles[vnum] = {};
                mobiles[vnum].vnum = vnum;
                mobiles[vnum].name = desc;
                mobiles[vnum].info = null;
                continue;
            }

            // 2. Mobile Stat Matcher
            // Id:[ 1 ], Instances:[ 1 ], Owner:[ Manwë ]
            match = trimmed.match(/Id:\s*\[\s*(\d+)\s*\][\s\S]*/i);
            if (match) {
                const vnum = parseInt(match[1], 10);
                if (!mobiles[vnum]) mobiles[vnum] = {};
                mobiles[vnum].vnum = vnum;
                mobiles[vnum].statRaw = trimmed;
                
                // Parse key fields from the stat text
                const keywordsMatch = trimmed.match(/Keywords:\s*\[\s*([^\]]+?)\s*\]/i);
                if (keywordsMatch) mobiles[vnum].keywords = keywordsMatch[1].trim();

                const shortDescMatch = trimmed.match(/Short desc:\s*\[\s*([^\]]+?)\s*\]/i);
                if (shortDescMatch) mobiles[vnum].shortDesc = shortDescMatch[1].trim();

                const levelMatch = trimmed.match(/Level:\s*\[\s*(\d+)\s*\]/i);
                if (levelMatch) mobiles[vnum].level = parseInt(levelMatch[1], 10);

                const alignMatch = trimmed.match(/Alignment:\s*\[\s*(-?\d+)\s*\]/i);
                if (alignMatch) mobiles[vnum].align = parseInt(alignMatch[1], 10);

                const typeMatch = trimmed.match(/Type:\s*\[\s*([^\]]+?)\s*\]/i);
                if (typeMatch) mobiles[vnum].type = typeMatch[1].trim();
                continue;
            }

            // 3. Object Info Matcher
            // Notes on object 9901 ...
            match = trimmed.match(/Notes on object\s+(\d+)\s*\(([^)]+)\)\s*\(lgit:[^)]+\):([\s\S]*)/i);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const desc = match[2];
                const content = match[3].trim();
                if (!objects[vnum]) objects[vnum] = {};
                objects[vnum].vnum = vnum;
                objects[vnum].name = desc;
                objects[vnum].info = content;
                continue;
            }

            match = trimmed.match(/(?:You may not view the notes on|There are no notes on) object\s+(\d+)\s*\(([^)]+)\)/i);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const desc = match[2];
                if (!objects[vnum]) objects[vnum] = {};
                objects[vnum].vnum = vnum;
                objects[vnum].name = desc;
                objects[vnum].info = null;
                continue;
            }

            // 4. Object Stat Matcher
            // Keywords: ( the ) [ Rules book ], V-number: [ 1 ]
            match = trimmed.match(/V-number:\s*\[\s*(\d+)\s*\]/i);
            if (match) {
                const vnum = parseInt(match[1], 10);
                if (!objects[vnum]) objects[vnum] = {};
                objects[vnum].vnum = vnum;
                objects[vnum].statRaw = trimmed;

                const keywordsMatch = trimmed.match(/Keywords:\s*(?:\([^)]+\)\s*)?\[\s*([^\]]+?)\s*\]/i);
                if (keywordsMatch) objects[vnum].keywords = keywordsMatch[1].trim();

                const shortDescMatch = trimmed.match(/Short description:\s*\[\s*([^\]]+?)\s*\]/i);
                if (shortDescMatch) objects[vnum].shortDesc = shortDescMatch[1].trim();

                const itemTypeMatch = trimmed.match(/Item type:\s*(\w+)/i);
                if (itemTypeMatch) objects[vnum].type = itemTypeMatch[1].trim();

                const weightMatch = trimmed.match(/Weight:\s*([\d.]+)\s*kg/i);
                if (weightMatch) objects[vnum].weight = parseFloat(weightMatch[1]);
                continue;
            }
        }

        // Parse usable entities to populate the full lists, preserving items not scraped yet
        const usableEntities = JSON.parse(fs.readFileSync('mume_usable_entities.json', 'utf8'));
        const finalObjects = [];
        const finalMobiles = [];

        for (const item of usableEntities.mobiles) {
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const defaultName = match[2];
                const scraped = mobiles[vnum] || {};

                finalMobiles.push({
                    vnum,
                    name: scraped.name || defaultName,
                    level: scraped.level ?? 0,
                    class: scraped.type ?? 'UNKNOWN',
                    align: scraped.align ?? 0,
                    info: scraped.info ?? null,
                    rawText: scraped.statRaw ?? 'No stats scraped yet.'
                });
            }
        }

        for (const item of usableEntities.objects) {
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const defaultName = match[2];
                const scraped = objects[vnum] || {};

                finalObjects.push({
                    vnum,
                    name: scraped.name || defaultName,
                    type: scraped.type ?? 'UNKNOWN',
                    weight: scraped.weight ?? 0,
                    value: scraped.value ?? 0,
                    extraFlags: scraped.extraFlags ?? [],
                    wearFlags: scraped.wearFlags ?? [],
                    info: scraped.info ?? null,
                    rawText: scraped.statRaw ?? 'No stats scraped yet.'
                });
            }
        }

        const dataOut = {
            mobiles: finalMobiles,
            objects: finalObjects,
            counts: {
                mobiles: finalMobiles.length,
                objects: finalObjects.length
            },
            timestamp: new Date().toISOString()
        };

        // Write directly to public/mume_entities_with_stats.json
        fs.writeFileSync('public/mume_entities_with_stats.json', JSON.stringify(dataOut, null, 4));
        this.log(`Successfully compiled and wrote ${finalMobiles.length} mobiles and ${finalObjects.length} objects to public/mume_entities_with_stats.json.`);
    }
}

const scraper = new MumeScraper();
scraper.start();
