/**
 * @file diagnose_build_list.js
 * @description Connects to MUME and captures raw output of /misc build 31 list
 * and /stat room full for room 31:15 to check actual output format.
 */
import net from 'net';
import fs from 'fs';

const HOST = 'mume.org';
const PORT = 4242;

let agentConfig = { account: 'ellessar', password: 'radagast', character: 'ellessar' };
if (fs.existsSync('config.agent.json')) {
  agentConfig = JSON.parse(fs.readFileSync('config.agent.json', 'utf8'));
}

const IAC = 255, DONT = 254, DO = 253, WONT = 252, WILL = 251;
const SB = 250, SE = 240, TELNET_ECHO = 1, TELNET_TTYPE = 24, TELNET_NAWS = 31;

let rawLog = '';
let buffer = '';
let state = 'CONNECTING';
let phase = 0; // 0=build list, 1=stat room

const socket = net.createConnection(PORT, HOST, () => console.log('Connected.'));
let telnetState = 'DATA', negotiationCmd = 0, subBuffer = [];

socket.on('data', (data) => {
  const textBytes = [];
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    switch (telnetState) {
      case 'DATA':
        if (byte === IAC) telnetState = 'IAC';
        else if (byte !== 13) textBytes.push(byte);
        break;
      case 'IAC':
        if (byte === SB) { telnetState = 'SUB'; subBuffer = []; }
        else if ([WILL, WONT, DO, DONT].includes(byte)) { telnetState = 'NEGOTIATE'; negotiationCmd = byte; }
        else telnetState = 'DATA';
        break;
      case 'NEGOTIATE':
        if (negotiationCmd === DO && byte === TELNET_TTYPE) {
          socket.write(Buffer.from([IAC, WILL, TELNET_TTYPE]));
          socket.write(Buffer.from([IAC, SB, TELNET_TTYPE, 0, ...Buffer.from('xterm-256color'), IAC, SE]));
        } else if (negotiationCmd === DO && byte === TELNET_NAWS) {
          socket.write(Buffer.from([IAC, WILL, TELNET_NAWS]));
          socket.write(Buffer.from([IAC, SB, TELNET_NAWS, 0, 120, 0, 40, IAC, SE]));
        }
        telnetState = 'DATA';
        break;
      case 'SUB':
        if (byte === IAC) telnetState = 'SUB_IAC'; else subBuffer.push(byte);
        break;
      case 'SUB_IAC':
        telnetState = byte === SE ? 'DATA' : 'SUB';
        break;
    }
  }
  if (textBytes.length > 0) {
    const text = Buffer.from(textBytes).toString('utf8');
    rawLog += text;
    buffer += text;
    const clean = buffer.replace(/\x1b\[[0-9;]*m/g, '');

    if (state === 'CONNECTING' && (clean.toLowerCase().includes('by what name') || clean.toLowerCase().includes('what name'))) {
      state = 'LOGIN_NAME'; buffer = '';
      socket.write(agentConfig.account + '\r\n');
    } else if (state === 'LOGIN_NAME' && clean.toLowerCase().includes('password:')) {
      state = 'LOGIN_PASS'; buffer = '';
      socket.write(agentConfig.password + '\r\n');
    } else if (state === 'LOGIN_PASS') {
      if (clean.includes('[Return to continue]')) { buffer = ''; socket.write('\r\n'); }
      else if (isPrompt(clean)) {
        state = 'IN_GAME'; buffer = '';
        console.log('In game! Sending /misc build 31 list...');
        socket.write('/misc build 31 list\r\n');
        phase = 0;
        setTimeout(() => {
          console.log('Sending /at 31:15 /stat room full...');
          socket.write('/at 31:15 /stat room full\r\n');
          phase = 1;
        }, 3000);
        setTimeout(() => {
          console.log('Sending /at 31:15 /com list -commands...');
          socket.write('/at 31:15 /com list -commands\r\n');
        }, 5000);
        setTimeout(() => {
          fs.writeFileSync('diagnose_output.txt', rawLog);
          console.log('Saved raw output to diagnose_output.txt');
          socket.write('quit\r\n');
          socket.end();
          process.exit(0);
        }, 8000);
      }
    }
  }
});

function isPrompt(text) {
  const t = text.trim();
  return t.endsWith('*') || t.endsWith('>') || /\d+H\s+\d+M\s+\d+V\s+>$/.test(t);
}

socket.on('error', err => { console.error('Error:', err.message); process.exit(1); });
socket.on('close', () => console.log('Connection closed.'));
