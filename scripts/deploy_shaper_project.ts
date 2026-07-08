/**
 * @file deploy_shaper_project.ts
 * @description Headlessly logs into MUME and deploys all commands from the active project.
 */

import net from 'net';
import fs from 'fs';
import { join } from 'path';
import type { ShaperWorkspaceDoc } from '../src/shaper/model/shaperTypes';

// --- Helper Preview Functions ---
const directions = ['n', 'e', 's', 'w', 'u', 'd'];
const clean = (value: any) => String(value ?? '').trim();
const normalizeText = (value: any) => String(value ?? '').replace(/\r\n/g, '\n').trim();

const wrapAt = (roomNumber: string, command: string) => `/at ${roomNumber} ${command}`;
const editorBlock = (roomNumber: string, command: string, text: string) => {
  const body = normalizeText(text);
  return body ? [wrapAt(roomNumber, command), ...body.split('\n').map(line => `  ${line}`), '  [save editor]'] : [];
};
const formatCom = (node: any) => {
  const f = (key: string) => clean(node.fields?.[key]);
  const limit = node.limit?.raw || '0';
  const prefix = node.parentId ? '/com add +' : '/com add';
  if (node.type === 'equip') return [prefix, 'equip', f('vnum'), limit, f('target') || 'parent', f('position') || '<position>'].filter(Boolean).join(' ');
  if (node.type === 'give' || node.type === 'put') return [prefix, node.type, f('vnum'), limit, f(node.type === 'put' ? 'container' : 'target') || 'parent'].filter(Boolean).join(' ');
  if (node.type === 'door') return [prefix, 'door', f('direction') || 'n', f('doorAction') || 'close'].filter(Boolean).join(' ');
  return [prefix, node.type, f('vnum'), limit].filter(Boolean).join(' ');
};

const roomPreview = (doc: ShaperWorkspaceDoc, roomId: string) => {
  const room = doc.rooms[roomId];
  const commands: string[] = [];
  if (clean(room.name)) commands.push(wrapAt(room.roomNumber, `/room name ${clean(room.preposition) || 'in'}@${clean(room.name)}`));
  if (room.sector) commands.push(wrapAt(room.roomNumber, `/room sector ${room.sector}`));
  if (room.flags?.length) commands.push(wrapAt(room.roomNumber, `/room flag @${room.flags.join(' ')}`));
  commands.push(...editorBlock(room.roomNumber, '/room desc', room.description));
  
  (room.keywords || []).forEach(keyword => {
    const keys = (keyword.keywords || []).map(clean).filter(Boolean);
    if (keys.length) commands.push(wrapAt(room.roomNumber, `/room kadd ${keys.join(' ')}`));
    commands.push(...editorBlock(room.roomNumber, `/room kdescription ${keys[0]}`, keyword.description));
  });

  Object.values(doc.exits || {}).filter(exit => exit.fromRoomId === roomId).forEach(exit => {
    const target = doc.rooms[exit.toRoomId!];
    if (!target) return;
    commands.push(wrapAt(room.roomNumber, `/room exit ${exit.direction} ${target.roomNumber}`));
    if (exit.doorFlags?.length) commands.push(wrapAt(room.roomNumber, `/room dset ${exit.direction} @${exit.doorFlags.join(' ')}`));
    if ((exit.hasDoor || exit.doorFlags?.includes('door')) && clean(exit.doorName)) {
      commands.push(wrapAt(room.roomNumber, `/room dadd ${exit.direction} ${clean(exit.doorName)}`));
    }
    commands.push(...editorBlock(room.roomNumber, `/room edescription ${exit.direction}`, exit.exitDescription || ''));
  });

  const nodes = Object.values(doc.commandNodes || {}).filter(node => node.roomId === roomId).sort((a, b) => a.order - b.order);
  if (nodes.length) commands.push(wrapAt(room.roomNumber, '/com kill all'), ...nodes.map(node => wrapAt(room.roomNumber, formatCom(node))));
  Object.values(doc.exits || {}).filter(exit => exit.fromRoomId === roomId && exit.doorPickPercent !== undefined).forEach(exit => {
    const pick = Math.max(0, Math.min(100, Math.round(exit.doorPickPercent || 0)));
    commands.push(wrapAt(room.roomNumber, `/com add door ${exit.direction} lock ${pick} ${pick}`));
  });
  
  const libs = Object.values(doc.libraries || {}).filter(lib => lib.targetType === 'room' && lib.targetId === roomId);
  libs.forEach((lib, index) => {
    commands.push(`/lib room ${room.roomNumber} add ${lib.name}`);
    Object.entries(lib.parameters || {}).forEach(([key, value]) => {
      commands.push(`/lib room ${room.roomNumber} set ${index + 1} ${key} ${value}`);
    });
  });
  if (libs.some(lib => lib.requiresLoad)) commands.push(`/lib room ${room.roomNumber} load`);
  if (commands.length) commands.push(wrapAt(room.roomNumber, '/room save'));
  return commands;
};

// --- Configuration Section ---
const projectPath = 'projects/active.shaper.json';
if (!fs.existsSync(projectPath)) {
  console.error(`Error: Project file not found at: ${projectPath}`);
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(projectPath, 'utf8')) as ShaperWorkspaceDoc;
const commandsToDeploy: string[] = [];

// Collect all commands for non-verified rooms
Object.values(doc.rooms).forEach(room => {
  if (room.status !== 'verified') {
    commandsToDeploy.push(...roomPreview(doc, room.id));
  }
});

if (commandsToDeploy.length === 0) {
  console.log('No dirty/modified rooms found. Everything is already verified!');
  process.exit(0);
}

console.log(`Discovered ${commandsToDeploy.length} commands to deploy. Starting paces...`);

let agentConfig = { account: 'ellessar', password: 'radagast', character: 'ellessar' };
if (fs.existsSync('config.agent.json')) {
  agentConfig = JSON.parse(fs.readFileSync('config.agent.json', 'utf8'));
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

class ZoneDeployer {
  private socket: net.Socket | null = null;
  private buffer = '';
  private state: 'CONNECTING' | 'LOGIN_NAME' | 'LOGIN_PASSWORD' | 'LOGGING_IN_CHARACTER' | 'IN_GAME' = 'CONNECTING';
  private commandIndex = 0;
  private currentCommand: string | null = null;
  private commandOutput = '';
  private inEditor = false;
  private _editorFallback: ReturnType<typeof setTimeout> | null = null;

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
      process.exit(0);
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
        this.send(agentConfig.account);
      }
    } else if (this.state === 'LOGIN_NAME') {
      if (cleanBuffer.toLowerCase().includes('password:')) {
        this.state = 'LOGIN_PASSWORD';
        this.buffer = '';
        this.send(agentConfig.password);
      }
    } else if (this.state === 'LOGIN_PASSWORD') {
      if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
        this.buffer = '';
        this.send('');
      } else if (cleanBuffer.includes('Select one of the following:') || cleanBuffer.includes('play ' + agentConfig.character) || cleanBuffer.includes('character name')) {
        this.send(`play ${agentConfig.character}`);
        this.state = 'LOGGING_IN_CHARACTER';
        this.buffer = '';
      } else if (this.isPrompt(cleanBuffer)) {
        this.state = 'IN_GAME';
        this.buffer = '';
        this.runNextCommand();
      }
    } else if (this.state === 'LOGGING_IN_CHARACTER') {
      if (cleanBuffer.includes('[Return to continue]') || cleanBuffer.includes('return: continue')) {
        this.buffer = '';
        this.send('');
      } else if (this.isPrompt(cleanBuffer)) {
        this.state = 'IN_GAME';
        this.buffer = '';
        this.runNextCommand();
      }
    } else if (this.state === 'IN_GAME') {
      this.commandOutput += text;
      const cleanOutput = this.commandOutput.replace(/\x1b\[[0-9;]*m/g, '');

      if (this.inEditor) {
        // MUME editor opens with '==>' prompt after 'MUME editor. Type %h for help'
        const editorOpen =
          cleanOutput.includes('==>') ||
          cleanOutput.includes('Enter your description') ||
          cleanOutput.includes('Write description') ||
          cleanOutput.includes('Terminate with');

        if (editorOpen) {
          this.inEditor = false;
          if (this._editorFallback) { clearTimeout(this._editorFallback); this._editorFallback = null; }
          this.commandOutput = '';
          this.buffer = '';
          this.runNextCommand();
        }
      } else if (this.isPrompt(cleanOutput)) {
        this.commandOutput = '';
        this.buffer = '';
        setTimeout(() => this.runNextCommand(), 600);
      }
    }
  }

  private runNextCommand() {
    if (this.commandIndex >= commandsToDeploy.length) {
      console.log('All commands deployed successfully. Marking project rooms as verified...');
      Object.values(doc.rooms).forEach(room => {
        if (room.status !== 'verified') {
          room.status = 'verified';
        }
      });
      fs.writeFileSync(projectPath, JSON.stringify(doc, null, 2) + '\n');
      console.log('Saved updated project status to projects/active.shaper.json.');
      if (this.socket) {
        this.send('quit');
        this.socket.end();
      }
      return;
    }

    const rawCmd = commandsToDeploy[this.commandIndex++];
    console.log(`[Deploying ${this.commandIndex}/${commandsToDeploy.length}] ${rawCmd.trim()}`);

    if (rawCmd.startsWith('  [save editor]')) {
      this.send('%e'); // %e saves in the MUME line editor (@  would abort)
      this.buffer = '';
      this.commandOutput = '';
      // Wait for the prompt to return after saving before running next command
      return;
    } else if (rawCmd.startsWith('  ')) {
      // Send description line
      this.send(rawCmd.slice(2));
      this.buffer = '';
      this.commandOutput = '';
      this.runNextCommand();
    } else {
      // Normal command
      this.send(rawCmd);
      if (rawCmd.includes('/room desc') || rawCmd.includes('/room kdescription') || rawCmd.includes('/room edescription')) {
        this.inEditor = true;
        // Fallback: if MUME editor prompt not recognised within 2s, proceed anyway
        this._editorFallback = setTimeout(() => {
          if (this.inEditor) {
            console.log('[Fallback] Editor prompt not detected — proceeding with description lines.');
            this.inEditor = false;
            this.commandOutput = '';
            this.buffer = '';
            this.runNextCommand();
          }
        }, 2000);
      }
    }
  }
}

const deployer = new ZoneDeployer();
deployer.start();
