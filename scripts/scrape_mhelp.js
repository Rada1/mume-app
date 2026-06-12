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

class MhelpScraper {
    constructor() {
        this.socket = null;
        this.buffer = '';
        this.state = 'CONNECTING'; // CONNECTING, LOGIN_NAME, LOGIN_PASSWORD, LOGGING_IN_CHARACTER, IN_GAME
        this.subState = 'INIT'; // INIT, SETTING_PAGINATION, GETTING_SUBJECTS, FETCHING_HELPS
        
        this.subjects = [];
        this.currentSubjectIndex = -1;
        this.currentSubjectText = '';
        this.results = {};
        
        this.logFile = 'mhelp_scraper.log';
        fs.writeFileSync(this.logFile, `=== Mhelp Scraper Started at ${new Date().toISOString()} ===\n`);
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
            this.saveResults();
            process.exit(0);
        });

        this.socket.on('error', (err) => {
            this.log(`Socket Error: ${err.message}`);
            process.exit(1);
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
                this.state = 'IN_GAME';
                this.buffer = '';
                this.initScrape();
            }
        } else if (this.state === 'LOGGING_IN_CHARACTER') {
            if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
                this.buffer = '';
                this.send('');
            } else if (this.isPrompt(cleanBuffer)) {
                this.state = 'IN_GAME';
                this.buffer = '';
                this.initScrape();
            }
        } else if (this.state === 'IN_GAME') {
            // Append incoming clean text to current accumulator if fetching help pages
            if (this.subState === 'GETTING_SUBJECTS' || this.subState === 'FETCHING_HELPS') {
                this.currentSubjectText += text.replace(/\x1b\[[0-9;]*m/g, '');
            }

            if (this.subState === 'FETCHING_HELPS') {
                if (/\*\*\*\s*(Return|Ret:).*?\*\*\*/i.test(cleanBuffer)) {
                    // Strip the intermediate prompt from currentSubjectText to avoid saving it
                    this.currentSubjectText = this.currentSubjectText.replace(/\*\*\*\s*(Return|Ret:).*?\*\*\*\s*$/gi, '');
                    this.buffer = '';
                    this.send(''); // Page down
                    return;
                } else if (this.currentSubjectText.includes('(p)rev, (n)ext, (q)uit, or return:')) {
                    // Exit text viewer
                    this.currentSubjectText = this.currentSubjectText.replace(/\(p\)rev, \(n\)ext, \(q\)uit, or return:\s*$/i, '').trim();
                    this.buffer = '';
                    this.send('q');
                    return;
                }
            }
            
            if (this.isPrompt(cleanBuffer)) {
                this.buffer = '';
                this.handlePrompt();
            }
        }
    }

    isPrompt(cleanText) {
        const trimmed = cleanText.trim();
        return /!\[\s*C\s+iMw[^>]*>\s*$/.test(trimmed);
    }

    initScrape() {
        this.log('Logged in! Setting pagination to 0...');
        this.subState = 'SETTING_PAGINATION';
        this.send('pag length 0');
    }

    handlePrompt() {
        if (this.subState === 'SETTING_PAGINATION') {
            this.log('Pagination disabled. Requesting available subjects list...');
            this.subState = 'GETTING_SUBJECTS';
            this.currentSubjectText = '';
            this.send('/mhelp');
        } else if (this.subState === 'GETTING_SUBJECTS') {
            this.parseSubjects();
            this.log(`Extracted ${this.subjects.length} subjects to scrape.`);
            this.subState = 'FETCHING_HELPS';
            this.currentSubjectIndex = -1;
            this.currentSubjectText = '';
            this.nextHelp();
        } else if (this.subState === 'FETCHING_HELPS') {
            if (this.currentSubjectIndex >= 0 && this.currentSubjectIndex < this.subjects.length) {
                const subject = this.subjects[this.currentSubjectIndex];
                // Clean the captured text
                let cleanText = this.currentSubjectText;
                
                // Remove the command echoes
                const cmdEchoRegex = new RegExp(`^\\s*\\/mhelp\\s+${this.escapeRegex(subject)}`, 'i');
                cleanText = cleanText.replace(cmdEchoRegex, '').trim();

                // Strip the final prompt
                cleanText = this.stripPrompt(cleanText).trim();

                // Strip any remaining intermediate paginator lines
                cleanText = cleanText.replace(/\*\*\*\s*(Return|Ret:).*?\*\*\*/gi, '').trim();

                this.results[subject] = cleanText;
            }

            this.currentSubjectIndex++;
            if (this.currentSubjectIndex < this.subjects.length) {
                this.currentSubjectText = '';
                const percent = ((this.currentSubjectIndex / this.subjects.length) * 100).toFixed(1);
                this.log(`[${percent}%] Fetching help for: ${this.subjects[this.currentSubjectIndex]}`);
                this.send(`/mhelp ${this.subjects[this.currentSubjectIndex]}`);
            } else {
                this.log('All subjects scraped. Exiting game...');
                this.send('quit');
            }
        }
    }

    nextHelp() {
        this.currentSubjectIndex = 0;
        if (this.subjects.length > 0) {
            this.log(`[0.0%] Fetching help for: ${this.subjects[0]}`);
            this.send(`/mhelp ${this.subjects[0]}`);
        } else {
            this.send('quit');
        }
    }

    parseSubjects() {
        const lines = this.currentSubjectText.split(/\r?\n/);
        const subjectsSet = new Set();

        let startParsing = false;
        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.toLowerCase().includes('available subjects:')) {
                startParsing = true;
                continue;
            }
            if (!startParsing) continue;

            // Stop if we hit return prompts or options (though pag 0 should prevent it)
            if (cleanLine.includes('*** Return:') || this.isPrompt(cleanLine)) {
                continue;
            }

            // Split by double spaces or tabs
            const parts = cleanLine.split(/\s{2,}/);
            for (const part of parts) {
                const trimmedPart = part.trim();
                if (trimmedPart && !trimmedPart.includes('Available subjects:') && !trimmedPart.startsWith('/mhelp')) {
                    subjectsSet.add(trimmedPart);
                }
            }
        }

        this.subjects = Array.from(subjectsSet).sort();
    }

    escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    stripPrompt(text) {
        const lines = text.split(/\r?\n/);
        while (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim();
            if (this.isPrompt(lastLine) || lastLine === '') {
                lines.pop();
            } else {
                break;
            }
        }
        return lines.join('\n');
    }

    saveResults() {
        this.log('Saving results...');
        
        // 1. Save to JSON
        const dataOut = {
            subjectsCount: Object.keys(this.results).length,
            timestamp: new Date().toISOString(),
            helpPages: this.results
        };
        fs.writeFileSync('public/mume_mhelp.json', JSON.stringify(dataOut, null, 4));
        this.log('Wrote public/mume_mhelp.json');

        // 2. Save to Markdown
        let mdContent = `# MUME Shaper Mode Mudlle /mhelp Reference\n\n`;
        mdContent += `This guide contains locally stored MUME building help pages for Mudlle, retrieved directly from the live game server.\n\n`;
        
        // Add table of contents
        mdContent += `## Table of Contents\n\n`;
        for (const subject of Object.keys(this.results).sort()) {
            const anchor = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            mdContent += `- [${subject}](#${anchor})\n`;
        }
        mdContent += `\n---\n\n`;

        // Add help contents
        for (const [subject, content] of Object.entries(this.results).sort()) {
            mdContent += `## ${subject}\n\n`;
            mdContent += `\`\`\`text\n${content}\n\`\`\`\n\n`;
        }

        // Ensure directories exist
        const docsDir = 'docs';
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir);
        }
        fs.writeFileSync(path.join(docsDir, 'mhelp_guide.md'), mdContent);
        this.log('Wrote docs/mhelp_guide.md');
    }
}

const scraper = new MhelpScraper();
scraper.start();
