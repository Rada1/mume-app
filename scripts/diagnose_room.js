import net from 'net';
import fs from 'fs';

const HOST = 'mume.org', PORT = 4242;
const config = JSON.parse(fs.readFileSync('config.agent.json', 'utf8'));
const IAC=255,DONT=254,DO=253,WONT=252,WILL=251,SB=250,SE=240,TELNET_TTYPE=24,TELNET_NAWS=31,TELNET_ECHO=1;

let raw = '', buf = '', state = 'CONNECTING';
const socket = net.createConnection(PORT, HOST, () => {});
let ts = 'DATA', nc = 0, sb = [];

socket.on('data', data => {
  const bytes = [];
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    switch (ts) {
      case 'DATA': if (b===IAC) ts='IAC'; else if (b!==13) bytes.push(b); break;
      case 'IAC':
        if (b===SB){ts='SUB';sb=[];}
        else if([WILL,WONT,DO,DONT].includes(b)){ts='NEG';nc=b;}
        else ts='DATA'; break;
      case 'NEG':
        if(nc===DO&&b===TELNET_TTYPE){socket.write(Buffer.from([IAC,WILL,TELNET_TTYPE]));socket.write(Buffer.from([IAC,SB,TELNET_TTYPE,0,...Buffer.from('xterm-256color'),IAC,SE]));}
        if(nc===DO&&b===TELNET_NAWS){socket.write(Buffer.from([IAC,WILL,TELNET_NAWS,0,120,0,40,IAC,SE]));}
        ts='DATA'; break;
      case 'SUB': if(b===IAC)ts='SUB_IAC'; else sb.push(b); break;
      case 'SUB_IAC': ts=b===SE?'DATA':'SUB'; break;
    }
  }
  if (bytes.length) {
    const text = Buffer.from(bytes).toString('utf8');
    raw += text; buf += text;
    const clean = buf.replace(/\x1b\[[0-9;]*m/g,'');
    if (state==='CONNECTING'&&(clean.toLowerCase().includes('by what name')||clean.toLowerCase().includes('what name'))) { state='LOGIN_NAME'; buf=''; socket.write(config.account+'\r\n'); }
    else if (state==='LOGIN_NAME'&&clean.toLowerCase().includes('password:')) { state='LOGIN_PASS'; buf=''; socket.write(config.password+'\r\n'); }
    else if (state==='LOGIN_PASS') {
      if (clean.includes('[Return to continue]')) { buf=''; socket.write('\r\n'); }
      else if (isPrompt(clean)) {
        state='IN_GAME'; buf='';
        socket.write('/at 31:25 /stat room full\r\n');
        setTimeout(() => { fs.writeFileSync('diag_31_25.txt', raw); socket.write('quit\r\n'); socket.end(); process.exit(0); }, 3000);
      }
    }
  }
});

function isPrompt(t) { const s=t.trim(); return s.endsWith('*')||s.endsWith('>')||/\d+H\s+\d+M\s+\d+V\s+>$/.test(s); }
socket.on('error', e => { console.error(e.message); process.exit(1); });
