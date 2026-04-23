/**
 * @file useTelnet.ts
 * @description Core telnet connection hook with GMCP support and deferred text processing.
 */

import React from 'react';
import { useTelnetSocket } from './useTelnetSocket';
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';
import { TELNET_GMCP, TELNET_TTYPE, TTYPE_SEND, TTYPE_IS, IAC, SB, SE } from '../constants';
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
import { PipelineOrchestrator } from '../services/parser/PipelineOrchestrator';
import { getRoom as getActiveRoom } from '../stores/useRoomStore';
import { getCombat as getActiveCombat } from '../stores/useCombatStore';
import { getVitals as getActiveVitals } from '../stores/useVitalsStore';
import { getSettings } from '../stores/useSettingsStore';
import { useButtonStore } from '../stores/useButtonStore';
import { useUIStore } from '../stores/useUIStore';

export interface TelnetConfig {
    connectionUrl: string;
    processLine: (line: string, tokens?: any) => void;
    recordEntry?: (type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any) => void;
    setPrompt: (prompt: string) => void;
    onCharNameChange?: (name: string) => void;
    onPositionChange?: (pos: string) => void;
    handlers: {
        setStatus: (status: string) => void;
        setStats: any;
        setWeather: any;
        setIsFoggy: any;
        setInCombat: any;
        addMessage: any;
        detectLighting: (light: string) => void;
        addDiagnosticLog?: (msg: string) => void;
        onEchoChange?: (visible: boolean) => void;
        onGmcpVitals?: (data: any) => void;
        onGmcpRoom?: (data: any) => void;
        onGmcpGroup?: (data: any) => void;
        onGmcpOccupants?: (data: any) => void;
        onGmcpRoomPlayers?: (data: any) => void;
        onGmcpRoomNpcs?: (data: any) => void;
        onGmcpRoomItems?: (data: any) => void;
        [key: string]: any;
    };
}

export function useTelnet(config: TelnetConfig) {
    const { isConnected, lastError, sendBytes, connect, disconnect } = useTelnetSocket();
    const configRef = React.useRef(config);
    const bufferRef = React.useRef("");
    const lastProcessedPromptRef = React.useRef("");
    const pendingTextLines = React.useRef<string[]>([]);
    const processingTimeout = React.useRef<any>(null);

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
            onRoomPlayers: (val) => configRef.current.handlers.onRoomPlayers?.(val),
            onRoomNpcs: (val) => configRef.current.handlers.onRoomNpcs?.(val),
            onRoomItems: (val) => configRef.current.handlers.onRoomItems?.(val),
            onAddPlayer: (val) => configRef.current.handlers.onAddPlayer?.(val),
            onAddNpc: (val) => configRef.current.handlers.onAddNpc?.(val),
            onRemovePlayer: (val) => configRef.current.handlers.onRemovePlayer?.(val),
            onRemoveNpc: (val) => configRef.current.handlers.onRemoveNpc?.(val),
            onCharNameChange: (val) => configRef.current.onCharNameChange?.(val),
            onPositionChange: (val) => configRef.current.onPositionChange?.(val),
            onGroupSet: (val) => configRef.current.handlers.onGroupSet?.(val),
            onGroupUpdate: (val) => configRef.current.handlers.onGroupUpdate?.(val),
            onGroupAdd: (val) => configRef.current.handlers.onGroupAdd?.(val),
            onGroupRemove: (val) => configRef.current.handlers.onGroupRemove?.(val),
            onCharRide: (val) => configRef.current.handlers.onCharRide?.(val),
            onComm: (s, c, m) => configRef.current.handlers.onComm?.(s, c, m),
        } as any);
    }
    const protocolHandler = React.useRef<ProtocolHandler | null>(null);

    React.useEffect(() => {
        configRef.current = config;
    }, [config]);

    React.useEffect(() => {
        configRef.current.handlers.setStatus(isConnected ? 'connected' : 'disconnected');
    }, [isConnected]);

    const processText = (text: string) => {
        bufferRef.current += text;
        
        const currentBuffer = bufferRef.current;
        const rawLines = currentBuffer.split('\n');
        let lastLine = rawLines.pop() || '';

        console.log(`[useTelnet] processText: bufferLen=${currentBuffer.length}, lines=${rawLines.length}, lastLine="${lastLine.substring(0, 30)}"`);
        
        const processedLines: string[] = [];

        const isPrompt = (line: string) => {
            const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (!clean) return false;
            const res = (clean.endsWith('>') || 
                clean.toLowerCase().includes('return: continue') ||
                clean.toLowerCase().endsWith('password:') ||
                clean.toLowerCase().includes('by what name'));
            console.log(`[useTelnet] isPrompt check: "${clean.substring(0, 30)}", result=${res}`);
            if (res) return true;
            // MUME-style prompts like ![...] >
            if (/^!\[.*?\]\s*>/.test(clean)) return true;
            // Combat prompts with vitals like HP:Healthy
            if (/HP:\w+/.test(clean) && clean.includes('>')) return true;
            return false;
        };

        const handlePromptDetected = (line: string) => {
            if (line !== lastProcessedPromptRef.current) {
                lastProcessedPromptRef.current = line;
                console.log(`[useTelnet] handlePromptDetected for: "${line.substring(0, 30)}"`);
                configRef.current.setPrompt(line);
                configRef.current.processLine(line, { isPrompt: true });
                const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
                if (configRef.current.handlers.detectLighting) {
                    configRef.current.handlers.detectLighting(cleanLine);
                }
            }
        };

        for (const line of rawLines) {
            // Check if this "line" (ending in \n) actually contains a prompt followed by more text,
            // or if it IS a prompt.
            const mumePromptMatch = line.match(/(.*?)((?:!\[.*?\]\s*>|[^>\n]{0,50}>)\s*)$/);
            
            if (mumePromptMatch) {
                const preText = mumePromptMatch[1];
                const promptPart = mumePromptMatch[2];
                if (preText.trim()) processedLines.push(preText);
                handlePromptDetected(promptPart);
            } else if (isPrompt(line)) {
                handlePromptDetected(line);
            } else if (line.trim().length > 0) {
                processedLines.push(line);
            }
        }

        // Handle text remaining in buffer (the part after the last newline)
        // Check if it's a prompt
        console.log(`[useTelnet] Checking lastLine for prompt: "${lastLine.substring(0, 30)}" (len=${lastLine.length})`);
        const mumePromptMatch = lastLine.match(/(.*?)((?:!\[.*?\]\s*>|[^>\n]{0,50}>)\s*)$/);
        if (mumePromptMatch) {
            const preText = mumePromptMatch[1];
            const promptPart = mumePromptMatch[2];
            console.log(`[useTelnet] mumePromptMatch found! pre="${preText}" prompt="${promptPart}"`);
            if (preText.trim()) processedLines.push(preText);
            handlePromptDetected(promptPart);
            bufferRef.current = ''; // Clear because the end was a prompt
        } else if (isPrompt(lastLine)) {
            console.log(`[useTelnet] isPrompt(lastLine) is TRUE`);
            handlePromptDetected(lastLine);
            bufferRef.current = '';
        } else {
            bufferRef.current = lastLine;
        }

        if (processedLines.length > 0) {
            pendingTextLines.current.push(...processedLines);
            
            if (!processingTimeout.current) {
                processingTimeout.current = setTimeout(() => {
                    processingTimeout.current = null;
                    const chunk = [...pendingTextLines.current];
                    pendingTextLines.current = [];

                    if (chunk.length === 0) return;

                    const settings = getSettings();
                    PipelineOrchestrator.ingestChunk(
                        chunk,
                        () => {
                            const roomStore = getActiveRoom();
                            const combatStore = getActiveCombat();
                            const vitalsStore = getActiveVitals();
                            const buttonStore = useButtonStore.getState();
                            const uiStore = useUIStore.getState();

                            // Consolidate online players from who/where lists
                            const onlinePlayers = (roomStore.whoList || []).map((entry: string) => entry.includes('|') ? entry.split('|')[1] : entry);
                            
                            return {
                                target: vitalsStore.target,
                                currentOccupants: roomStore.players || [],
                                roomNpcs: roomStore.npcs || [],
                                activeGroupMembers: combatStore.groupMembers || [],
                                roomItems: roomStore.items || [],
                                discoveredItems: [],
                                onlinePlayers,
                                inlineCategories: settings.inlineCategories || [],
                                buttons: buttonStore.rawButtons || [],
                                selectedObjectIds: (uiStore as any).selectedObjectIds || new Set<string>()
                            };
                        },
                        (line, tokens) => {
                            console.log(`[useTelnet] Internal processLine call for: "${line.substring(0, 30)}"`);
                            configRef.current.processLine(line, tokens);
                        }
                    );
                }, 0);
            }
        }
    };

    const onGmcp = React.useCallback((pkg: string, data: string) => {
        const { handlers } = configRef.current;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch(e) {}

        // 1. Explicitly mapped handlers
        if (pkg.startsWith('Char.Vitals')) {
            if (handlers.onCharVitals) handlers.onCharVitals(parsed);
        } else if (pkg.startsWith('Room.Info')) {
            if (handlers.onRoomInfo) handlers.onRoomInfo(parsed);
        } else if (pkg.startsWith('Group')) {
            if (handlers.onGroupSet) handlers.onGroupSet(parsed);
        } else if (pkg.startsWith('Room.Players')) {
            if (handlers.onRoomPlayers) handlers.onRoomPlayers(parsed);
        } else if (pkg.startsWith('Room.Npcs') || pkg.startsWith('Room.Chars')) {
            if (handlers.onRoomNpcs) handlers.onRoomNpcs(parsed);
        } else if (pkg.startsWith('Room.Items') || pkg.startsWith('Room.Objects')) {
            if (handlers.onRoomItems) handlers.onRoomItems(parsed);
        }

        // 2. Generic package routing for all other handlers
        // Packages like Char.Ride -> onCharRide, etc.
        const parts = pkg.split('.');
        const lastPart = parts[parts.length - 1];
        const handlerName = `on${parts[0]}${lastPart}`; // e.g. onCharRide
        if ((handlers as any)[handlerName]) {
            (handlers as any)[handlerName](parsed);
        }
    }, []);

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
            
            PipelineOrchestrator.registerGmcpHandler((p, d) => gmcpDecoder.current?.decode(p, d));
            PipelineOrchestrator.ingestGmcp(pkg, json);
            onGmcp(pkg, json);
        } else if (cmd === TELNET_TTYPE && buffer[1] === TTYPE_SEND) {
            const bytes = [IAC, SB, TELNET_TTYPE, TTYPE_IS, ...Array.from(new TextEncoder().encode("xterm-256color")), IAC, SE];
            sendBytes(bytes);
        }
    }, [onGmcp, sendBytes]);

    // Initialize ProtocolHandler if not done yet
    if (!protocolHandler.current) {
        protocolHandler.current = new ProtocolHandler({
            sendBytes: (bytes) => sendBytes(bytes),
            addMessage: (type, text, combat, mid, isRoom, precalc) => configRef.current.handlers.addMessage(type, text, combat, mid, isRoom, precalc),
            handleSubnegotiation: (buffer) => handleSubnegotiation(buffer),
            processText: (text) => processText(text),
            sendGMCP: (pkg, data) => {
                const json = data ? JSON.stringify(data) : '';
                const bytes = [IAC, SB, TELNET_GMCP, ...Array.from(new TextEncoder().encode(`${pkg} ${json}`)), IAC, SE];
                sendBytes(new Uint8Array(bytes));
            },
            onEchoChange: (visible) => configRef.current.handlers.onEchoChange?.(visible)
        });
    }

    const onData = React.useCallback((data: ArrayBuffer) => {
        console.log(`[useTelnet] onData received ${data.byteLength} bytes`);
        if (configRef.current.recordEntry) {
            configRef.current.recordEntry('rx', { length: data.byteLength });
        }
        protocolHandler.current?.handleRawData(new Uint8Array(data));
    }, []);

    return { 
        isConnected, 
        lastError, 
        connect: () => connect(configRef.current.connectionUrl, onData), 
        disconnect, 
        send: (text: string) => sendBytes(new TextEncoder().encode(text + '\n')),
        sendCommand: (text: string) => sendBytes(new TextEncoder().encode(text + '\n')),
        sendGMCP: (pkg: string, data: any) => {
            const json = data ? JSON.stringify(data) : '';
            const bytes = [IAC, SB, TELNET_GMCP, ...Array.from(new TextEncoder().encode(`${pkg} ${json}`)), IAC, SE];
            sendBytes(new Uint8Array(bytes));
        }
    };
}
