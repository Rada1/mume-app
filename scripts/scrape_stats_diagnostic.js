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

class MumeStatScraper {
    constructor() {
        this.socket = null;
        this.buffer = '';
        this.state = 'CONNECTING'; // CONNECTING, LOGIN_NAME, LOGIN_PASSWORD, LOGGING_IN_CHARACTER, IN_GAME
        this.commandQueue = [];
        this.sentCommandsCount = 0;
        this.rawResponses = '';
        this.entitiesMap = {
            objects: {},
            mobiles: {}
        };
        this.logFile = 'scrape_stats_session.log';
        this.inactivityTimer = null;
        this.allCommandsSent = false;
        
        fs.writeFileSync(this.logFile, `=== Scraper Session Started at ${new Date().toISOString()} ===\n`);
        
        // Diagnostic logger
        setInterval(() => {
            if (this.state === 'IN_GAME') {
                this.log(`Diagnostic: Received ${this.rawResponses.length} bytes so far. Queue size remaining: ${this.commandQueue.length}.`);
            }
        }, 5000);
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

        this.socket.on('end', () => {
            this.log('Connection ended (FIN).');
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
                this.log('No data received for 10 seconds after all commands sent. Closing socket...');
                this.socket.destroy();
            }, 10000);
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
        this.log('Loading usable entities...');
        const usableEntities = JSON.parse(fs.readFileSync('mume_usable_entities.json', 'utf8'));

        // Load objects Vnums
        for (const item of usableEntities.objects) {
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const desc = match[2];
                this.commandQueue.push({ type: 'object', vnum, desc, cmd: `/stat object ${vnum}` });
            }
        }

        // Load mobiles Vnums
        for (const item of usableEntities.mobiles) {
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const desc = match[2];
                this.commandQueue.push({ type: 'mobile', vnum, desc, cmd: `/stat mobile ${vnum}` });
            }
        }

        this.log(`Queue populated with ${this.commandQueue.length} commands.`);
        this.sendPacedCommands();
    }

    sendPacedCommands() {
        if (this.commandQueue.length === 0) {
            this.log('All commands sent. Activating inactivity watch...');
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

        setTimeout(() => this.sendPacedCommands(), 40);
    }

    parseAndSaveResults() {
        this.log('Starting parser on captured responses...');
        const cleanData = this.rawResponses.replace(/\x1b\[[0-9;]*m/g, '');
        const lines = cleanData.split('\n');
        
        let currentBlock = [];
        let currentType = null;
        let currentVnum = null;
        let currentName = null;

        const finalizeBlock = () => {
            if (currentVnum !== null && currentBlock.length > 0) {
                const blockText = currentBlock.join('\n').trim();
                const entityData = this.parseEntityText(currentType, currentVnum, currentName, blockText);
                
                if (currentType === 'object') {
                    this.entitiesMap.objects[currentVnum] = entityData;
                } else if (currentType === 'mobile') {
                    this.entitiesMap.mobiles[currentVnum] = entityData;
                }
            }
            currentBlock = [];
            currentVnum = null;
            currentName = null;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const objMatch = line.match(/V-number:\s*\[\s*(\d+)\s*\]/i);
            const mobMatch = line.match(/Id:\s*\[\s*(\d+)\s*\]/i);

            if (objMatch) {
                finalizeBlock();
                currentType = 'object';
                currentVnum = parseInt(objMatch[1], 10);
                currentName = '';
                currentBlock.push(line);
            } else if (mobMatch && line.includes('Instances:')) {
                finalizeBlock();
                currentType = 'mobile';
                currentVnum = parseInt(mobMatch[1], 10);
                currentName = '';
                currentBlock.push(line);
            } else {
                if (currentVnum !== null) {
                    currentBlock.push(line);
                }
            }
        }
        finalizeBlock();

        const usableEntities = JSON.parse(fs.readFileSync('mume_usable_entities.json', 'utf8'));
        const finalObjectsList = [];
        const finalMobilesList = [];

        for (const item of usableEntities.objects) {
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const defaultDesc = match[2];
                const stats = this.entitiesMap.objects[vnum] || {
                    vnum,
                    name: defaultDesc,
                    type: 'UNKNOWN',
                    weight: 0,
                    value: 0,
                    extraFlags: [],
                    wearFlags: [],
                    rawText: 'No stat details retrieved.'
                };
                finalObjectsList.push(stats);
            }
        }

        for (const item of usableEntities.mobiles) {
            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
            if (match) {
                const vnum = parseInt(match[1], 10);
                const defaultDesc = match[2];
                const stats = this.entitiesMap.mobiles[vnum] || {
                    vnum,
                    name: defaultDesc,
                    level: 0,
                    class: 'UNKNOWN',
                    align: 0,
                    rawText: 'No stat details retrieved.'
                };
                finalMobilesList.push(stats);
            }
        }

        const dataOut = {
            objects: finalObjectsList,
            mobiles: finalMobilesList,
            counts: {
                objects: finalObjectsList.length,
                mobiles: finalMobilesList.length
            }
        };

        fs.writeFileSync('public/mume_entities_with_stats.json', JSON.stringify(dataOut, null, 4));
        this.log(`Parsing complete! Wrote stats for ${finalObjectsList.length} objects and ${finalMobilesList.length} mobiles to public/mume_entities_with_stats.json.`);
    }

    parseEntityText(type, vnum, name, text) {
        const lines = text.split('\n');
        
        if (type === 'object') {
            let objType = 'OTHER';
            let weight = 0;
            let value = 0;
            let extraFlags = [];
            let wearFlags = [];

            for (const line of lines) {
                const shortMatch = line.match(/Short description:\s*(.*)$/i);
                if (shortMatch) name = shortMatch[1].trim();

                const typeMatch = line.match(/Item type:\s*([A-Za-z0-9_-]+)/i);
                if (typeMatch) objType = typeMatch[1].trim();

                const weightMatch = line.match(/Weight:\s*\[?\s*(\d+)\s*\]?/i);
                if (weightMatch) weight = parseInt(weightMatch[1], 10);

                const valueMatch = line.match(/Value:\s*\[?\s*(\d+)\s*\]?/i);
                if (valueMatch) value = parseInt(valueMatch[1], 10);

                const wearMatch = line.match(/Wear flags:\s*\[?\s*([^\]\n]+)\s*\]?/i);
                if (wearMatch) wearFlags = wearMatch[1].split(/\s+/).map(f => f.trim()).filter(Boolean);

                const extraMatch = line.match(/Extra flags:\s*\[?\s*([^\]\n]+)\s*\]?/i);
                if (extraMatch) extraFlags = extraMatch[1].split(/\s+/).map(f => f.trim()).filter(Boolean);
            }

            return {
                vnum,
                name: name || `Object ${vnum}`,
                type: objType,
                weight,
                value,
                extraFlags,
                wearFlags,
                rawText: text
            };
        } else if (type === 'mobile') {
            let level = 0;
            let mobClass = 'UNKNOWN';
            let align = 0;

            for (const line of lines) {
                const shortMatch = line.match(/Short desc:\[\s*([^\]]+)\s*\]/i);
                if (shortMatch) name = shortMatch[1].trim();

                const lvlMatch = line.match(/Level:\[\s*(\d+)\s*\]/i);
                if (lvlMatch) level = parseInt(lvlMatch[1], 10);

                const classMatch = line.match(/Type:\[\s*([^\]]+)\s*\]/i);
                if (classMatch) mobClass = classMatch[1].trim();

                const alignMatch = line.match(/Alignment:\[\s*(-?\d+)\s*\]/i);
                if (alignMatch) align = parseInt(alignMatch[1], 10);
            }

            return {
                vnum,
                name: name || `Mobile ${vnum}`,
                level,
                class: mobClass,
                align,
                rawText: text
            };
        }
    }
}

const scraper = new MumeStatScraper();
scraper.start();

