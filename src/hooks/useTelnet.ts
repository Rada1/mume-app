import { useRef, useCallback, useEffect } from 'react';
import { IAC, SB, SE, TELNET_GMCP, TELNET_TTYPE, TTYPE_IS, TTYPE_SEND } from '../constants';
import { MessageType, WeatherType, GameStats, DeathStage, GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpRoomItems, GmcpOccupant, GmcpExitInfo } from '../types';
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';

export interface TelnetHandlers {
    setStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
    setStats: React.Dispatch<React.SetStateAction<GameStats>>;
    setWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
    setIsFoggy: React.Dispatch<React.SetStateAction<boolean>>;
    setInCombat: (inCombat: boolean) => void;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string) => void;
    setRumble: (rumble: boolean) => void;
    setHitFlash: (hitFlash: boolean) => void;
    setDeathStage: (stage: DeathStage) => void;
    detectLighting: (light: string) => void;
    onOpponentChange?: (opponent: string | null) => void;
    onAddPlayer?: (data: string | GmcpOccupant) => void;
    onRemovePlayer?: (data: string | GmcpOccupant) => void;
    onRoomItems?: (data: GmcpRoomItems | (string | GmcpOccupant)[]) => void;
    onRoomInfo?: (data: GmcpRoomInfo) => void;
    onRoomUpdateExits?: (data: Record<string, GmcpExitInfo | false>) => void;
    onCharVitals?: (data: GmcpCharVitals) => void;
    onRoomPlayers?: (data: GmcpRoomPlayers | (string | GmcpOccupant)[]) => void;
    onRoomNpcs?: (data: GmcpRoomPlayers | (string | GmcpOccupant)[]) => void;
    onAddNpc?: (data: string | GmcpOccupant) => void;
    onRemoveNpc?: (data: string | GmcpOccupant) => void;
    onCharNameChange?: (name: string | null) => void;
    onPositionChange?: (position: string) => void;
}

export interface TelnetOptions {
    connectionUrl: string;
    processLine: (line: string) => void;
    setPrompt: (prompt: string) => void;
    onCharNameChange?: (name: string | null) => void;
    onPositionChange?: (position: string) => void;
    handlers: TelnetHandlers;
}

export function useTelnet(options: TelnetOptions) {
    const { handlers, connectionUrl, processLine, setPrompt } = options;
    const socketRef = useRef<WebSocket | null>(null);
    const bufferRef = useRef<string>("");

    // Stability fix: use a ref for handlers to avoid stale closures in GmcpDecoder
    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const sendBytes = useCallback((bytes: number[]) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(new Uint8Array(bytes));
    }, []);

    const sendGMCP = useCallback((pkg: string, data: any = null) => {
        const json = data ? JSON.stringify(data) : '';
        const payload = pkg + (json ? ' ' + json : '');
        const payloadBytes = Array.from(new TextEncoder().encode(payload));
        sendBytes([IAC, SB, TELNET_GMCP, ...payloadBytes, IAC, SE]);
    }, [sendBytes]);

    const gmcpDecoder = useRef(new GmcpDecoder({
        setStats: (val) => handlersRef.current.setStats(val),
        setWeather: (val) => handlersRef.current.setWeather(val),
        setIsFoggy: (val) => handlersRef.current.setIsFoggy(val),
        setInCombat: (val) => handlersRef.current.setInCombat(val),
        detectLighting: (val) => handlersRef.current.detectLighting(val),
        onOpponentChange: (val) => handlersRef.current.onOpponentChange?.(val),
        onAddPlayer: (val) => handlersRef.current.onAddPlayer?.(val),
        onRemovePlayer: (val) => handlersRef.current.onRemovePlayer?.(val),
        onRoomItems: (val) => handlersRef.current.onRoomItems?.(val),
        onRoomInfo: (val) => handlersRef.current.onRoomInfo?.(val),
        onRoomUpdateExits: (val) => handlersRef.current.onRoomUpdateExits?.(val),
        onCharVitals: (val) => handlersRef.current.onCharVitals?.(val),
        onRoomPlayers: (val) => handlersRef.current.onRoomPlayers?.(val),
        onRoomNpcs: (val) => handlersRef.current.onRoomNpcs?.(val),
        onAddNpc: (val) => handlersRef.current.onAddNpc?.(val),
        onRemoveNpc: (val) => handlersRef.current.onRemoveNpc?.(val),
        onCharNameChange: (val) => handlersRef.current.onCharNameChange?.(val),
        onPositionChange: (val) => handlersRef.current.onPositionChange?.(val)
    }));
    const protocolHandler = useRef<ProtocolHandler | null>(null);

    const handleSubnegotiation = useCallback((buffer: number[]) => {
        if (buffer.length === 0) return;
        const cmd = buffer[0];
        if (cmd === TELNET_GMCP) {
            const raw = new TextDecoder().decode(new Uint8Array(buffer.slice(1)));
            let splitIdx = raw.search(/[\s\{\[]/);
            const pkg = splitIdx > -1 ? raw.substring(0, splitIdx).trim() : raw;
            const json = splitIdx > -1 ? raw.substring(splitIdx).trim() : '';
            gmcpDecoder.current.decode(pkg, json);
        } else if (cmd === TELNET_TTYPE && buffer[1] === TTYPE_SEND) {
            const bytes = [IAC, SB, TELNET_TTYPE, TTYPE_IS, ...Array.from(new TextEncoder().encode("xterm-256color")), IAC, SE];
            sendBytes(bytes);
        }
    }, [sendBytes]);

    const processText = useCallback((text: string) => {
        bufferRef.current += text;
        let newlineIdx;
        while ((newlineIdx = bufferRef.current.indexOf('\n')) !== -1) {
            const line = bufferRef.current.substring(0, newlineIdx);
            bufferRef.current = bufferRef.current.substring(newlineIdx + 1);
            processLine(line);
        }
        const prompt = bufferRef.current;
        setPrompt(prompt);
        if (prompt && handlers.detectLighting) {
            const cleanPrompt = prompt.replace(/\x1b\[[0-9;]*m/g, '');
            handlers.detectLighting(cleanPrompt);
        }
    }, [processLine, setPrompt, handlers]);

    useEffect(() => {
        protocolHandler.current = new ProtocolHandler({
            sendBytes, sendGMCP, handleSubnegotiation, processText,
            addMessage: handlers.addMessage
        });
    }, [sendBytes, sendGMCP, handleSubnegotiation, processText, handlers.addMessage]);

    const connect = () => {
        if (socketRef.current) socketRef.current.close();
        bufferRef.current = "";
        protocolHandler.current?.setGmcpReady(false);
        try {
            handlers.setStatus('connecting');
            handlers.addMessage('system', `Connecting to ${connectionUrl}...`);
            const ws = new WebSocket(connectionUrl);
            ws.binaryType = "arraybuffer";
            ws.onopen = () => {
                handlers.setStatus('connected');
                handlers.addMessage('system', 'Connected! Negotiating...');
                const interval = setInterval(() => { if (ws.readyState === WebSocket.OPEN) sendGMCP('Core.Ping'); }, 30000);
                (ws as any)._pingInterval = interval;
            };
            ws.onmessage = (event) => { if (event.data instanceof ArrayBuffer) protocolHandler.current?.handleRawData(new Uint8Array(event.data)); };
            ws.onclose = () => {
                handlers.setStatus('disconnected');
                handlers.addMessage('error', 'Connection closed.');
                if ((ws as any)._pingInterval) clearInterval((ws as any)._pingInterval);
            };
            ws.onerror = () => { handlers.setStatus('disconnected'); handlers.addMessage('error', 'Connection error.'); };
            socketRef.current = ws;
        } catch (e) { handlers.setStatus('disconnected'); handlers.addMessage('error', 'Invalid URL.'); }
    };

    return {
        connect, disconnect: () => socketRef.current?.close(),
        sendCommand: (cmd: string) => { if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(new TextEncoder().encode(cmd + '\r\n')); },
        sendGMCP
    };
}
