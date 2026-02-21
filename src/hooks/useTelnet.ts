import React, { useRef, useState, useCallback } from 'react';
import { IAC, SB, SE, WILL, WONT, DO, DONT, TELNET_GMCP, TELNET_TTYPE, TELNET_NAWS, TTYPE_IS, TTYPE_SEND } from '../constants';
import { MessageType, RoomNode } from '../types';

interface TelnetOptions {
    connectionUrl: string;
    addMessage: (type: MessageType, text: string) => void;
    setStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
    setStats: React.Dispatch<React.SetStateAction<any>>;
    setWeather: (weather: any) => void;
    setIsFoggy: (foggy: boolean) => void;
    setRumble: (rumble: boolean) => void;
    setHitFlash: (flash: boolean) => void;
    setDeathStage: (stage: any) => void;
    detectLighting: (line: string) => void;
    processLine: (line: string) => void;
    setPrompt: (prompt: string) => void;
    setInCombat: (inCombat: boolean) => void;
    onOpponentChange?: (name: string | null) => void;
}

export const useTelnet = (options: TelnetOptions) => {
    const {
        connectionUrl,
        addMessage,
        setStatus,
        setStats,
        setWeather,
        setIsFoggy,
        setRumble,
        setHitFlash,
        setDeathStage,
        detectLighting,
        processLine,
        setPrompt,
        setInCombat,
    } = options;

    const socketRef = useRef<WebSocket | null>(null);
    const bufferRef = useRef<string>("");
    const gmcpReadyRef = useRef(false);
    const telnetState = useRef<{
        state: 'DATA' | 'IAC' | 'NEGOTIATE' | 'SUB' | 'SUB_IAC',
        negotiationCmd: number,
        subBuffer: number[]
    }>({
        state: 'DATA',
        negotiationCmd: 0,
        subBuffer: []
    });
    const decoderRef = useRef<TextDecoder>(new TextDecoder());
    // Persist Char.Vitals state to handle partial updates
    const charVitalsRef = useRef<{ position?: string, opponent?: string | null }>({});

    const sendBytes = (bytes: number[]) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(new Uint8Array(bytes));
        }
    };

    const sendGMCP = (pkg: string, data: any = null) => {
        const json = data ? JSON.stringify(data) : '';
        const payload = pkg + (json ? ' ' + json : '');
        const encoder = new TextEncoder();
        const payloadBytes = Array.from(encoder.encode(payload));
        sendBytes([IAC, SB, TELNET_GMCP, ...payloadBytes, IAC, SE]);
    };

    const sendNAWS = () => {
        const w = 120;
        const h = 40;
        sendBytes([IAC, SB, TELNET_NAWS, (w >> 8) & 0xFF, w & 0xFF, (h >> 8) & 0xFF, h & 0xFF, IAC, SE]);
    };

    const processTextBuffer = useCallback((text: string) => {
        bufferRef.current += text;
        let newlineIdx;
        while ((newlineIdx = bufferRef.current.indexOf('\n')) !== -1) {
            const line = bufferRef.current.substring(0, newlineIdx);
            bufferRef.current = bufferRef.current.substring(newlineIdx + 1);
            processLine(line);
        }
        if (bufferRef.current) {
            detectLighting(bufferRef.current.replace(/\x1b\[[0-9;]*m/g, ''));
        }
        setPrompt(bufferRef.current);
    }, [processLine, detectLighting, setPrompt]);

    const handleSubnegotiation = (buffer: number[], handlers: { onRoomInfo: (data: any) => void, onRoomPlayers?: (data: any) => void, onCharVitals?: (data: any) => void }) => {
        if (buffer.length === 0) return;
        const cmd = buffer[0];

        if (cmd === TELNET_GMCP) {
            const raw = new TextDecoder().decode(new Uint8Array(buffer.slice(1)));
            // Robustly split pkg from json: find first space OR first '{' OR first '['
            // Many MUDs (including MUME) omit the space: Room.Info{"id":123}
            let splitIdx = raw.search(/[\s\{\[]/);
            const pkg = splitIdx > -1 ? raw.substring(0, splitIdx).trim() : raw;
            const json = splitIdx > -1 ? raw.substring(splitIdx).trim() : '';

            const pkgLower = pkg.toLowerCase();
            // Debug only in console, no visible echo
            if (pkgLower !== 'core.ping') {
                // console.log(`[GMCP] ${pkg}: ${json.substring(0, 50)}...`); 
            }

            if (pkgLower === 'char.vitals') {
                try {
                    const data = JSON.parse(json);
                    if (handlers.onCharVitals) handlers.onCharVitals(data);
                    setStats((prev: any) => ({
                        ...prev,
                        hp: data.hp ?? prev.hp,
                        maxHp: data.maxhp ?? prev.maxHp,
                        mana: data.mana ?? prev.mana,
                        maxMana: data.maxmana ?? prev.maxMana,
                        move: data.move ?? prev.move,
                        maxMove: data.maxmove ?? prev.maxMove
                    }));

                    // Partial updates: merge into ref to persist state
                    if (data.position !== undefined) charVitalsRef.current.position = data.position;
                    if (data.opponent !== undefined) {
                        charVitalsRef.current.opponent = data.opponent;
                        if (options.onOpponentChange) options.onOpponentChange(data.opponent);
                    }

                    // Calculate combat from persisted state
                    const fighting = charVitalsRef.current.position === 'fighting' || (charVitalsRef.current.opponent != null && charVitalsRef.current.opponent !== '');
                    setInCombat(fighting);

                    // Weather from GMCP (more reliable than text parsing)
                    if ('weather' in data) {
                        const w = data.weather;
                        if (w === '~') setWeather('cloud');
                        else if (w === "'") setWeather('rain');
                        else if (w === '"') setWeather('rain');
                        else if (w === '*') setWeather('heavy-rain');
                        else if (w === ' ' || w === null) setWeather((prev: any) => prev === 'cloud' || prev === 'rain' || prev === 'heavy-rain' || prev === 'snow' ? 'none' : prev);
                    }
                    // Fog from GMCP: '-' = light fog, '=' = heavy fog
                    if ('fog' in data) {
                        setIsFoggy(data.fog === '-' || data.fog === '=');
                    }
                    // Lighting from GMCP
                    if ('light' in data && data.light) {
                        detectLighting(data.light);
                    }
                } catch (e) { }
            } else if (pkgLower === 'room.info' || pkgLower === 'external.room.info' || pkgLower.endsWith('.room.info')) {
                try {
                    const data = JSON.parse(json);
                    handlers.onRoomInfo(data);
                } catch (e) { }
            } else if (pkgLower === 'room.players' || pkgLower === 'room.chars') {
                try {
                    const data = JSON.parse(json);
                    if (handlers.onRoomPlayers) handlers.onRoomPlayers(data);
                } catch (e) { }
            }
        } else if (cmd === TELNET_TTYPE && buffer[1] === TTYPE_SEND) {
            const encoder = new TextEncoder();
            const clientName = "xterm-256color";
            const bytes = [IAC, SB, TELNET_TTYPE, TTYPE_IS, ...Array.from(encoder.encode(clientName)), IAC, SE];
            sendBytes(bytes);
        }
    };

    const handleRawData = (data: Uint8Array, handlers: { onRoomInfo: (data: any) => void }) => {
        const textBytes: number[] = [];
        const state = telnetState.current;

        for (let i = 0; i < data.length; i++) {
            const byte = data[i];

            switch (state.state) {
                case 'DATA':
                    if (byte === IAC) {
                        state.state = 'IAC';
                    } else {
                        if (byte !== 13) {
                            textBytes.push(byte);
                        }
                    }
                    break;
                case 'IAC':
                    if (byte === SB) {
                        state.state = 'SUB';
                        state.subBuffer = [];
                    } else if (byte === WILL || byte === WONT || byte === DO || byte === DONT) {
                        state.state = 'NEGOTIATE';
                        state.negotiationCmd = byte;
                    } else if (byte === IAC) {
                        textBytes.push(255);
                        state.state = 'DATA';
                    } else {
                        state.state = 'DATA';
                    }
                    break;
                case 'NEGOTIATE':
                    const cmd = state.negotiationCmd;
                    const option = byte;
                    if (cmd === DO && option === TELNET_TTYPE) {
                        sendBytes([IAC, WILL, TELNET_TTYPE]);
                    } else if (cmd === WILL && option === TELNET_GMCP) {
                        // Server offers GMCP — we accept
                        sendBytes([IAC, DO, TELNET_GMCP]);
                        if (!gmcpReadyRef.current) {
                            gmcpReadyRef.current = true;
                            addMessage('system', 'GMCP negotiated (server WILL). Requesting room data...');
                            sendGMCP('Core.Supports.Set', ["Core 1", "Char 1", "Char.Vitals 1", "Room 1", "Room.Info 1", "Comm 1", "Room.Players 1", "External.Room 1"]);
                        }
                    } else if (cmd === DO && option === TELNET_GMCP) {
                        // Server requests us to enable GMCP — we comply
                        sendBytes([IAC, WILL, TELNET_GMCP]);
                        if (!gmcpReadyRef.current) {
                            gmcpReadyRef.current = true;
                            addMessage('system', 'GMCP negotiated (server DO). Requesting room data...');
                            sendGMCP('Core.Supports.Set', ["Core 1", "Char 1", "Char.Vitals 1", "Room 1", "Room.Info 1", "Comm 1", "Room.Players 1", "External.Room 1"]);
                        }
                    } else if (cmd === DO && option === TELNET_NAWS) {
                        sendBytes([IAC, WILL, TELNET_NAWS]);
                        sendNAWS();
                    } else if (cmd === WILL) {
                        sendBytes([IAC, DONT, option]);
                    } else if (cmd === DO) {
                        sendBytes([IAC, WONT, option]);
                    }
                    state.state = 'DATA';
                    break;
                case 'SUB':
                    if (byte === IAC) {
                        state.state = 'SUB_IAC';
                    } else {
                        state.subBuffer.push(byte);
                    }
                    break;
                case 'SUB_IAC':
                    if (byte === SE) {
                        handleSubnegotiation(state.subBuffer, handlers);
                        state.state = 'DATA';
                    } else if (byte === IAC) {
                        state.subBuffer.push(255);
                        state.state = 'SUB';
                    } else {
                        state.subBuffer.push(byte);
                        state.state = 'SUB';
                    }
                    break;
            }
        }

        if (textBytes.length > 0) {
            const decoded = decoderRef.current.decode(new Uint8Array(textBytes), { stream: true });
            processTextBuffer(decoded);
        }
    };

    const connect = (handlers: { onRoomInfo: (data: any) => void, onRoomPlayers?: (data: any) => void, onCharVitals?: (data: any) => void }) => {
        if (socketRef.current) socketRef.current.close();

        // Reset state for a clean reconnection
        bufferRef.current = "";
        gmcpReadyRef.current = false;
        telnetState.current = {
            state: 'DATA',
            negotiationCmd: 0,
            subBuffer: []
        };


        try {
            setStatus('connecting');
            addMessage('system', `Connecting to ${connectionUrl}...`);

            const ws = new WebSocket(connectionUrl);
            ws.binaryType = "arraybuffer";
            decoderRef.current = new TextDecoder(); // Reset decoder on new connection

            ws.onopen = () => {
                setStatus('connected');
                addMessage('system', 'Connected! Waiting for server negotiation...');

                const pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        sendGMCP('Core.Ping');
                    }
                }, 30000);
                (ws as any)._pingInterval = pingInterval;
            };

            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    handleRawData(new Uint8Array(event.data), handlers);
                }
            };

            ws.onclose = () => {
                setStatus('disconnected');
                addMessage('error', 'Connection closed.');
                if ((ws as any)._pingInterval) clearInterval((ws as any)._pingInterval);
            };

            ws.onerror = () => {
                setStatus('disconnected');
                addMessage('error', 'Connection error. Check settings.');
            };

            socketRef.current = ws;
        } catch (e) {
            addMessage('error', 'Invalid URL configuration.');
            setStatus('disconnected');
        }
    };

    const disconnect = () => {
        if (socketRef.current) socketRef.current.close();
    };

    const sendCommand = (cmd: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const encoder = new TextEncoder();
            const data = encoder.encode(cmd + '\r\n');
            socketRef.current.send(data);
        }
    };

    return {
        connect,
        disconnect,
        sendCommand,
        sendGMCP
    };
};
