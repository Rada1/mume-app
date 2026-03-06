import { IAC, SB, SE, WILL, WONT, DO, DONT, TELNET_GMCP, TELNET_TTYPE, TELNET_NAWS, TTYPE_IS, TTYPE_SEND } from '../../constants';

export type TelnetState = 'DATA' | 'IAC' | 'NEGOTIATE' | 'SUB' | 'SUB_IAC';

export interface ProtocolOptions {
    sendBytes: (bytes: number[]) => void;
    addMessage: (type: 'system' | 'error' | 'game', text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean) => void;
    handleSubnegotiation: (buffer: number[]) => void;
    processText: (text: string) => void;
    sendGMCP: (pkg: string, data?: any) => void;
}

export class ProtocolHandler {
    private state: TelnetState = 'DATA';
    private negotiationCmd: number = 0;
    private subBuffer: number[] = [];
    private gmcpReady: boolean = false;
    private decoder = new TextDecoder();

    constructor(private options: ProtocolOptions) { }

    public setGmcpReady(ready: boolean) {
        this.gmcpReady = ready;
    }

    public handleRawData(data: Uint8Array) {
        const textBytes: number[] = [];

        for (let i = 0; i < data.length; i++) {
            const byte = data[i];

            switch (this.state) {
                case 'DATA':
                    if (byte === IAC) {
                        this.state = 'IAC';
                    } else {
                        if (byte !== 13) textBytes.push(byte);
                    }
                    break;
                case 'IAC':
                    if (byte === SB) {
                        this.state = 'SUB';
                        this.subBuffer = [];
                    } else if (byte === WILL || byte === WONT || byte === DO || byte === DONT) {
                        this.state = 'NEGOTIATE';
                        this.negotiationCmd = byte;
                    } else if (byte === IAC) {
                        textBytes.push(255);
                        this.state = 'DATA';
                    } else {
                        this.state = 'DATA';
                    }
                    break;
                case 'NEGOTIATE':
                    this.handleNegotiation(byte);
                    this.state = 'DATA';
                    break;
                case 'SUB':
                    if (byte === IAC) this.state = 'SUB_IAC';
                    else this.subBuffer.push(byte);
                    break;
                case 'SUB_IAC':
                    if (byte === SE) {
                        this.options.handleSubnegotiation(this.subBuffer);
                        this.state = 'DATA';
                    } else if (byte === IAC) {
                        this.subBuffer.push(255);
                        this.state = 'SUB';
                    } else {
                        this.subBuffer.push(byte);
                        this.state = 'SUB';
                    }
                    break;
            }
        }

        if (textBytes.length > 0) {
            const decoded = this.decoder.decode(new Uint8Array(textBytes), { stream: true });
            this.options.processText(decoded);
        }
    }

    private handleNegotiation(option: number) {
        const cmd = this.negotiationCmd;
        if (cmd === DO && option === TELNET_TTYPE) {
            this.options.sendBytes([IAC, WILL, TELNET_TTYPE]);
        } else if ((cmd === WILL || cmd === DO) && option === TELNET_GMCP) {
            this.options.sendBytes([IAC, (cmd === WILL ? DO : WILL), TELNET_GMCP]);
            if (!this.gmcpReady) {
                this.gmcpReady = true;
                this.options.addMessage('system', 'GMCP negotiated. Requesting data...');
                this.options.sendGMCP('Core.Supports.Set', ["Core 1", "Char 1", "Char.Vitals 1", "Room 1", "Room.Info 1", "Room.UpdateExits 1", "Room.Chars 1", "Room.Items 1", "Char.Items 1", "Comm 1", "External.Room 1"]);
            }
        } else if (cmd === DO && option === TELNET_NAWS) {
            this.options.sendBytes([IAC, WILL, TELNET_NAWS]);
            this.sendNAWS();
        } else if (cmd === WILL) {
            this.options.sendBytes([IAC, DONT, option]);
        } else if (cmd === DO) {
            this.options.sendBytes([IAC, WONT, option]);
        }
    }

    private sendNAWS() {
        const w = 120;
        const h = 40;
        this.options.sendBytes([IAC, SB, TELNET_NAWS, (w >> 8) & 0xFF, w & 0xFF, (h >> 8) & 0xFF, h & 0xFF, IAC, SE]);
    }
}
