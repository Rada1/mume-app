import net from 'net';
import fs from 'fs';
import path from 'path';

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
const TELNET_GMCP = 201;

class MumeScraper {
    constructor() {
        this.socket = null;
        this.buffer = '';
        this.state = 'CONNECTING'; // CONNECTING, LOGIN_NAME, LOGIN_PASSWORD, LOGGED_IN, IN_GAME
        this.commandQueue = [];
        this.currentCommand = null;
        this.commandOutput = '';
        this.results = {
            objects: new Set(),
            mobiles: new Set()
        };
        this.logFile = 'scraper_session.log';
        fs.writeFileSync(this.logFile, `=== Scraper Session Started at ${new Date().toISOString()} ===\n`);
    }

    log(msg) {
        console.log(msg);
        fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ${msg}\n`);
    }

    logGameText(text) {
        fs.appendFileSync(this.logFile, text);
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
            this.log('Connection closed by server.');
            this.processAndSaveResults();
            process.exit(0);
        });

        this.socket.on('error', (err) => {
            this.log(`Socket Error: ${err.message}`);
            this.processAndSaveResults();
            process.exit(1);
        });
    }

    handleNegotiation(cmd, option) {
        if (cmd === DO && option === TELNET_TTYPE) {
            this.socket.write(Buffer.from([IAC, WILL, TELNET_TTYPE]));
            // Send client name
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
        this.log(`Sending: ${text}`);
        this.socket.write(text + '\r\n');
    }

    handleGameText(text) {
        this.logGameText(text);
        this.buffer += text;

        // Clean ANSI escape codes from buffer for checks
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
            // Check for return to continue or play prompt
            if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
                this.buffer = '';
                this.send('');
            } else if (cleanBuffer.includes('play ellessar') || cleanBuffer.includes('enter character name') || cleanBuffer.includes('Select one of the following:')) {
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
            if (this.currentCommand) {
                this.commandOutput += text;
                const cleanOutput = this.commandOutput.replace(/\x1b\[[0-9;]*m/g, '');
                
                // Check if the prompt has appeared at the end of the output, meaning command finished
                if (this.isPrompt(cleanOutput)) {
                    this.log(`Finished command: ${this.currentCommand}`);
                    this.parseCommandOutput(this.currentCommand, cleanOutput);
                    this.currentCommand = null;
                    this.commandOutput = '';
                    this.buffer = '';
                    this.runNextCommand();
                }
            } else {
                if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
                    this.buffer = '';
                    this.send('');
                }
            }
        }
    }

    isPrompt(cleanText) {
        const trimmed = cleanText.trim();
        // A God/player prompt usually ends with '*' or '>' or standard H/M/V prompts.
        // E.g. "ellessar *" or similar
        return trimmed.endsWith('*') || trimmed.endsWith('>') || trimmed.endsWith('* >') || trimmed.endsWith('*)') || /[\d]+H\s+[\d]+M\s+[\d]+V\s+>$/.test(trimmed);
    }

    initScrape() {
        this.log('Initializing scrape queue...');
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
        
        // Push objects first
        for (const letter of alphabet) {
            this.commandQueue.push({ type: 'object', letter, cmd: `/num object ${letter}` });
        }
        
        // Push mobiles
        for (const letter of alphabet) {
            this.commandQueue.push({ type: 'mobile', letter, cmd: `/num mobile ${letter}` });
        }

        // Add a clean exit command at the end
        this.commandQueue.push({ type: 'exit', cmd: 'quit' });

        this.runNextCommand();
    }

    runNextCommand() {
        if (this.commandQueue.length === 0) {
            this.log('No more commands in queue.');
            this.processAndSaveResults();
            this.socket.end();
            return;
        }

        const next = this.commandQueue.shift();
        this.currentCommand = next.cmd;
        this.currentCommandObj = next;
        this.commandOutput = '';
        this.send(next.cmd);
    }

    parseCommandOutput(command, cleanOutput) {
        // Strip the echoed command at the beginning and the prompt at the end
        const lines = cleanOutput.split('\n');
        this.log(`Parsing output for command: ${command}. Lines: ${lines.length}`);
        
        for (let line of lines) {
            line = line.trim();
            // Skip the command echo itself, prompt lines, and headers/footers
            if (!line || line.startsWith('/') || this.isPrompt(line)) continue;
            
            // Typical line format of /num:
            // E.g. [Vnum] Name (other info)
            // Or maybe: 1234. A rusty longsword
            // Let's print out what we see to the log, but let's capture potential name/vnums.
            // Let's look for things containing a dot, bracket, or general patterns.
            // We can match any lines that look like:
            // "   1234. rusty sword"
            // "   [ 1234] a red dragon"
            const match = line.match(/^\s*(?:\[?\s*(\d+)\s*\]?\.?\s+)?(.*)$/);
            if (match) {
                const name = match[2].trim();
                if (name && !name.toLowerCase().includes('no match') && !name.toLowerCase().includes('matching objects') && !name.toLowerCase().includes('matching mobiles')) {
                    if (this.currentCommandObj.type === 'object') {
                        this.results.objects.add(name);
                    } else if (this.currentCommandObj.type === 'mobile') {
                        this.results.mobiles.add(name);
                    }
                }
            }
        }
    }

    processAndSaveResults() {
        this.log('Processing and saving results...');
        
        const objectsArr = Array.from(this.results.objects).sort();
        const mobilesArr = Array.from(this.results.mobiles).sort();
        
        const data = {
            objects: objectsArr,
            mobiles: mobilesArr,
            counts: {
                objects: objectsArr.length,
                mobiles: mobilesArr.length
            }
        };

        fs.writeFileSync('mume_usable_entities.json', JSON.stringify(data, null, 4));
        this.log(`Scrape complete! Found ${objectsArr.length} objects and ${mobilesArr.length} mobiles.`);
        this.log('Results written to mume_usable_entities.json');
    }
}

const scraper = new MumeScraper();
scraper.start();
