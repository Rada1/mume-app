/**
 * @file import_live_zone.ts
 * @description Headlessly logs into MUME, performs a zone scan, and updates the local active project.
 */

import net from 'net';
import fs from 'fs';
import { join } from 'path';
import { applyShaperLiveTranscript } from '../src/shaper/import/shaperLiveImport';
import { createDefaultShaperDocument } from '../src/shaper/model/shaperDocument';

// --- Argument Section ---
const args = process.argv.slice(2);
const zoneArg = args.find(a => !a.startsWith('--'));
const zoneNumber = zoneArg ? Number(zoneArg) : 31;
const projectPath = 'projects/active.shaper.json';

// --- Configuration Section ---
let config = { account: 'ellessar', password: 'radagast', character: 'ellessar' };
if (fs.existsSync('config.agent.json')) {
  config = JSON.parse(fs.readFileSync('config.agent.json', 'utf8'));
}

const HOST = 'mume.org';
const PORT = 4242;

// Telnet negotiation bytes
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

class ZoneImporter {
  private socket: net.Socket | null = null;
  private buffer = '';
  private state: 'CONNECTING' | 'LOGIN_NAME' | 'LOGIN_PASSWORD' | 'LOGGING_IN_CHARACTER' | 'IN_GAME' = 'CONNECTING';
  private commandQueue: string[] = [];
  private currentCommand: string | null = null;
  private commandOutput = '';
  private transcript = '';
  private roomNumbers: string[] = [];

  constructor() {
    console.log(`Starting headless live read for Zone ${zoneNumber}...`);
  }

  public start() {
    this.socket = net.createConnection(PORT, HOST, () => {
      console.log('Socket connected.');
    });

    let telnetState = 'DATA';
    let negotiationCmd = 0;
    let subBuffer = [];

    this.socket.on('data', (data) => {
      const textBytes: number[] = [];
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
      console.log('Connection closed.');
      this.saveTranscriptAndExit();
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
      process.exit(1);
    });
  }

  private handleNegotiation(cmd: number, option: number) {
    if (!this.socket) return;
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

  private send(text: string) {
    if (this.socket) {
      this.socket.write(text + '\r\n');
    }
  }

  private isPrompt(cleanText: string): boolean {
    const trimmed = cleanText.trim();
    return trimmed.endsWith('*') || trimmed.endsWith('>') || trimmed.endsWith('* >') || trimmed.endsWith('*)') || /[\d]+H\s+[\d]+M\s+[\d]+V\s+>$/.test(trimmed);
  }

  private handleGameText(text: string) {
    this.buffer += text;
    const cleanBuffer = this.buffer.replace(/\x1b\[[0-9;]*m/g, '');

    if (this.state === 'CONNECTING') {
      if (cleanBuffer.toLowerCase().includes('what name do you wish') || cleanBuffer.toLowerCase().includes('by what name')) {
        this.state = 'LOGIN_NAME';
        this.buffer = '';
        this.send(config.account);
      }
    } else if (this.state === 'LOGIN_NAME') {
      if (cleanBuffer.toLowerCase().includes('password:')) {
        this.state = 'LOGIN_PASSWORD';
        this.buffer = '';
        this.send(config.password);
      }
    } else if (this.state === 'LOGIN_PASSWORD') {
      if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
        this.buffer = '';
        this.send('');
      } else if (cleanBuffer.includes('Select one of the following:') || cleanBuffer.includes('play ' + config.character) || cleanBuffer.includes('character name')) {
        this.send(`play ${config.character}`);
        this.state = 'LOGGING_IN_CHARACTER';
        this.buffer = '';
      } else if (this.isPrompt(cleanBuffer)) {
        this.state = 'IN_GAME';
        this.buffer = '';
        this.initImport();
      }
    } else if (this.state === 'LOGGING_IN_CHARACTER') {
      if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
        this.buffer = '';
        this.send('');
      } else if (this.isPrompt(cleanBuffer)) {
        this.state = 'IN_GAME';
        this.buffer = '';
        this.initImport();
      }
    } else if (this.state === 'IN_GAME') {
      if (this.currentCommand) {
        this.commandOutput += text;
        const cleanOutput = this.commandOutput.replace(/\x1b\[[0-9;]*m/g, '');
        if (this.isPrompt(cleanOutput)) {
          this.parseCommandOutput(this.currentCommand, cleanOutput);
          this.currentCommand = null;
          this.commandOutput = '';
          this.buffer = '';
          this.runNextCommand();
        }
      }
    }
  }

  private initImport() {
    // Add command to fetch the rooms in the zone
    this.commandQueue.push(`/misc build ${zoneNumber} list`);
    this.runNextCommand();
  }

  private runNextCommand() {
    if (this.commandQueue.length === 0) {
      if (this.socket) {
        this.send('quit');
        this.socket.end();
      }
      return;
    }
    const next = this.commandQueue.shift()!;
    this.currentCommand = next;
    this.send(next);
  }

  private parseCommandOutput(command: string, cleanOutput: string) {
    this.transcript += `\n${command}\n${cleanOutput}\n`;

    if (command.startsWith('/misc build')) {
      const lines = cleanOutput.split('\n');
      const prefix = `${zoneNumber}:`;
      lines.forEach(line => {
        // Matches [31:15] bracket format from /misc build list output
        const match = line.match(/^\s*\[(\d+:\d+)\]/);
        if (match) {
          const roomNum = match[1];
          if (roomNum.startsWith(prefix) && !this.roomNumbers.includes(roomNum)) {
            this.roomNumbers.push(roomNum);
          }
        }
      });
      console.log(`Discovered ${this.roomNumbers.length} rooms in Zone ${zoneNumber}. Queueing details...`);
      
      // Queue detailed queries for each discovered room
      this.roomNumbers.forEach(roomNum => {
        this.commandQueue.push(`/at ${roomNum} /stat room full`);
        this.commandQueue.push(`/at ${roomNum} /com list -commands`);
        this.commandQueue.push(`/lib room ${roomNum} list -commands`);
      });
    }
  }

  private saveTranscriptAndExit() {
    try {
      console.log('Parsing transcript and updating project JSON...');
      let doc = createDefaultShaperDocument({ zoneNumber });
      if (fs.existsSync(projectPath)) {
        doc = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
      }

      const result = applyShaperLiveTranscript(doc, this.transcript, Date.now());
      fs.writeFileSync(projectPath, JSON.stringify(result.doc, null, 2) + '\n');
      console.log(`Success! Updated ${result.summary.roomsTouched} rooms in ${projectPath}.`);
    } catch (err) {
      console.error('Error compiling transcript:', err);
    }
  }
}

const importer = new ZoneImporter();
importer.start();
