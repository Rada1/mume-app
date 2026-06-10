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

class OneStatTester {
    constructor() {
        this.socket = null;
        this.buffer = '';
        this.state = 'CONNECTING';
        this.rawResponses = '';
    }

    start() {
        this.socket = net.createConnection(PORT, HOST, () => {
            console.log('Connected!');
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
                this.state = 'LOGGING_IN';
                this.buffer = '';
            } else if (this.isPrompt(cleanBuffer)) {
                this.state = 'IN_GAME';
                this.buffer = '';
                this.runTest();
            }
        } else if (this.state === 'LOGGING_IN') {
            if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
                this.buffer = '';
                this.send('');
            } else if (this.isPrompt(cleanBuffer)) {
                this.state = 'IN_GAME';
                this.buffer = '';
                this.runTest();
            }
        }
    }

    isPrompt(cleanText) {
        const trimmed = cleanText.trim();
        return trimmed.endsWith('*') || trimmed.endsWith('>') || trimmed.endsWith('* >') || trimmed.endsWith('*)') || /[\d]+H\s+[\d]+M\s+[\d]+V\s+>$/.test(trimmed);
    }

    runTest() {
        console.log('Sending stat commands...');
        this.send('/stat object 1000');
        setTimeout(() => {
            this.send('/stat mobile 1000');
        }, 1000);
        setTimeout(() => {
            fs.writeFileSync('raw_stat_test.txt', this.rawResponses);
            console.log('Stats captured to raw_stat_test.txt');
            this.send('quit');
            process.exit(0);
        }, 3000);
    }
}

const tester = new OneStatTester();
tester.start();
