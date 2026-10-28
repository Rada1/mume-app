/**
 * @file useTelnet.ts
 * @description Core telnet connection hook with GMCP support and deferred text processing.
 */

import React from 'react';
import { useTelnetText } from './useTelnetText';
import { useTelnetSocket } from './useTelnetSocket';
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';
import { TELNET_GMCP, TELNET_MSSP, TELNET_TTYPE, TTYPE_SEND, TTYPE_IS, IAC, SB, SE } from '../constants';
import { parseMsspTime } from '../utils/telnet/msspTime';
import type { TelnetConfig } from '../types';
export type { TelnetConfig } from '../types';
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
import { uiPerformance } from '../utils/uiPerformance';

export function useTelnet(config: TelnetConfig) {
    const { isConnected, lastError, sendBytes, connect, disconnect } = useTelnetSocket();

    const sendGmcp = React.useCallback((pkg: string, data?: unknown) => {
        const json = data ? JSON.stringify(data) : '';
        const bytes = [IAC, SB, TELNET_GMCP, ...Array.from(new TextEncoder().encode(`${pkg} ${json}`)), IAC, SE];
        sendBytes(new Uint8Array(bytes));
    }, [sendBytes]);

    // --- Connection and Packet Routing Section ---
    const configRef = React.useRef(config);
    const processText = useTelnetText(configRef);

    const gmcpDecoder = React.useRef<GmcpDecoder | null>(null);
    if (!gmcpDecoder.current) {
        gmcpDecoder.current = new GmcpDecoder({
            setStats: (val) => configRef.current.handlers.setStats(val),
            setWeather: (val) => configRef.current.handlers.setWeather(val),
            setIsFoggy: (val) => configRef.current.handlers.setIsFoggy(val),
            setInCombat: (val, force) => configRef.current.handlers.setInCombat(val, force),
            detectLighting: (val) => configRef.current.handlers.detectLighting(val),
            onCharVitals: (val) => configRef.current.handlers.onCharVitals?.(val),
            onRoomInfo: (val) => configRef.current.handlers.onRoomInfo?.(val),
            onRoomUpdateExits: (val) => configRef.current.handlers.onRoomUpdateExits?.(val),
            onRoomChars: (val) => configRef.current.handlers.onRoomChars?.(val),
            onAddChar: (val) => configRef.current.handlers.onAddChar?.(val),
            onUpdateChar: (val) => configRef.current.handlers.onUpdateChar?.(val),
            onRemoveChar: (val) => configRef.current.handlers.onRemoveChar?.(val),
            onCharNameChange: (val) => configRef.current.onCharNameChange?.(val),
            onPositionChange: (val) => configRef.current.onPositionChange?.(val),
            onGroupSet: (val) => configRef.current.handlers.onGroupSet?.(val),
            onGroupUpdate: (val) => configRef.current.handlers.onGroupUpdate?.(val),
            onGroupAdd: (val) => configRef.current.handlers.onGroupAdd?.(val),
            onGroupRemove: (val) => configRef.current.handlers.onGroupRemove?.(val),
            onCharInfo: (val) => configRef.current.handlers.onCharInfo?.(val),
            onCharStatusVars: (val) => {
                const handlers = configRef.current.handlers;
                (handlers.onCharStatusVars ?? handlers.onCharInfo)?.(val);
            },
            onCharRide: (val) => configRef.current.handlers.onCharRide?.(val),
            onComm: (s, c, m) => configRef.current.handlers.onComm?.(s, c, m),
            onEvent: (pkg, val) => configRef.current.handlers.onEvent?.(pkg, val),
            onMumeEdit: (val) => configRef.current.handlers.onMumeEdit?.(val),
            onMumeView: (val) => configRef.current.handlers.onMumeView?.(val),
            onCorePing: () => sendGmcp('Core.Ping'),
            onCoreGoodbye: () => {},
        });
    }
    const protocolHandler = React.useRef<ProtocolHandler | null>(null);

    React.useEffect(() => {
        configRef.current = config;
    }, [config]);

    React.useEffect(() => {
        configRef.current.handlers.setStatus(isConnected ? 'connected' : 'disconnected');
    }, [isConnected]);

    React.useEffect(() => {
        if (!isConnected) return;
        const id = window.setInterval(() => sendGmcp('Core.KeepAlive'), 30_000);
        return () => window.clearInterval(id);
    }, [isConnected, sendGmcp]);

    const handleSubnegotiation = React.useCallback((buffer: number[]) => {
        if (buffer.length === 0) return;
        const cmd = buffer[0];
        if (cmd === TELNET_GMCP) {
            const raw = new TextDecoder().decode(new Uint8Array(buffer.slice(1)));
            let splitIdx = raw.search(/[\s\{\[]/);
            const pkg = splitIdx > -1 ? raw.substring(0, splitIdx).trim() : raw;
            const json = splitIdx > -1 ? raw.substring(splitIdx).trim() : '';
            
            if (configRef.current.recordEntry) {
                configRef.current.recordEntry('gmcp', { pkg, data: json });
            }
            
            // The decoder owns routing: a second explicit/generic dispatch here
            // repeats vitals, room updates and their synchronous mapper events.
            const finish = uiPerformance.startWork('Socket GMCP');
            try { gmcpDecoder.current?.decode(pkg, json); }
            finally { finish(); }
        } else if (cmd === TELNET_MSSP) {
            const time = parseMsspTime(buffer.slice(1));
            if (time) configRef.current.handlers.onMsspTime?.(time);
        } else if (cmd === TELNET_TTYPE && buffer[1] === TTYPE_SEND) {
            const bytes = [IAC, SB, TELNET_TTYPE, TTYPE_IS, ...Array.from(new TextEncoder().encode("xterm-256color")), IAC, SE];
            sendBytes(bytes);
        }
    }, [sendBytes]);

    // Initialize ProtocolHandler if not done yet
    if (!protocolHandler.current) {
        protocolHandler.current = new ProtocolHandler({
            sendBytes: (bytes) => sendBytes(bytes),
            addMessage: (type, text, combat, mid, isRoom, precalc) => configRef.current.handlers.addMessage(type, text, combat, mid, isRoom, precalc),
            handleSubnegotiation: (buffer) => handleSubnegotiation(buffer),
            processText: (text) => {
                const finish = uiPerformance.startWork('Socket text framing');
                try { processText(text); }
                finally { finish(); }
            },
            sendGMCP: (pkg, data) => sendGmcp(pkg, data),
            onEchoChange: (visible) => configRef.current.handlers.onEchoChange?.(visible)
        });
    }

    const onData = React.useCallback((data: ArrayBuffer) => {
        if (configRef.current.recordEntry) {
            configRef.current.recordEntry('rx', { length: data.byteLength });
        }
        const finish = uiPerformance.startWork('Socket protocol');
        try { protocolHandler.current?.handleRawData(new Uint8Array(data)); }
        finally { finish(); }
    }, []);

    return { 
        isConnected, 
        lastError, 
        connect: () => connect(configRef.current.connectionUrl, onData), 
        disconnect, 
        send: (text: string) => sendBytes(new TextEncoder().encode(text + '\n')),
        sendCommand: (text: string) => sendBytes(new TextEncoder().encode(text + '\n')),
        sendGMCP: sendGmcp
    };
}
