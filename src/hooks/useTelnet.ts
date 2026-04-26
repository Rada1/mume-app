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
        onGmcpRoomChars?: (data: any) => void;
        onGmcpRoomItems?: (data: any) => void;
        [key: string]: any;
    };
}

export function useTelnet(config: TelnetConfig) {
    const { isConnected, lastError, sendBytes, connect, disconnect } = useTelnetSocket();
    const configRef = React.useRef(config);
    const bufferRef = React.useRef("");
    const lastProcessedPromptRef = React.useRef("");
    const pendingTextLines = React.useRef<(string | { line: string, isPrompt: boolean })[]>([]);
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
        
        const processedLines: (string | { line: string, isPrompt: boolean })[] = [];

        const isPrompt = (line: string) => {
            const noAnsi = line.replace(/\x1b\[[0-9;]*m/g, '');
            const clean = noAnsi.trim();
            if (!clean) return false;

            // Snooped lines (prefixed with &E, &F, etc.) must not update the user's own HUD.
            // Pass them straight through to processLine, which strips the prefix and routes
            // any embedded prompt to the spectate view via setSpectateActivePrompt.
            if (/^(?:&|mp;)[A-Z] /.test(clean)) return false;

            // In XML mode, prompts are explicitly tagged and should be the entire line
            if (clean.startsWith('<prompt') && clean.endsWith('</prompt>')) return true;

            // In XML mode, lines often end with a closing tag like </object> or </header>
            // (whose final `>` is part of the tag, not a prompt symbol). Don't treat those
            // as prompts — they are normal game text (e.g. equipment lines).
            if (/<\/[a-zA-Z][a-zA-Z0-9_-]*>$/.test(clean)) return false;

            // Basic MUME prompt heuristics for non-XML or legacy prompts
            return (clean.endsWith('>') ||
                clean.toLowerCase().includes('return: continue') ||
                clean.toLowerCase().endsWith('password:') ||
                clean.toLowerCase().includes('by what name'));
        };

        const handlePromptDetected = (line: string) => {
            let displayPrompt = line;
            if (line.includes('<prompt')) {
                // Strip XML tags and decode entities for the UI display
                displayPrompt = line
                    .replace(/<prompt[^>]*>|<\/prompt>/g, '')
                    .replace(/&gt;/gi, '>')
                    .replace(/&lt;/gi, '<')
                    .replace(/&amp;/gi, '&')
                    .trim();
                
                // Remove trailing > delimiter if present for a cleaner HUD look
                if (displayPrompt.endsWith('>')) {
                    displayPrompt = displayPrompt.substring(0, displayPrompt.length - 1).trim();
                }
            }

            if (line !== lastProcessedPromptRef.current) {
                lastProcessedPromptRef.current = line;
                console.log(`[useTelnet] handlePromptDetected (queued) for: "${displayPrompt.substring(0, 30)}"`);
                configRef.current.setPrompt(displayPrompt);
                
                // Queue the raw line as an object so the parser still sees the tags if needed
                processedLines.push({ line, isPrompt: true });
                
                const cleanLine = displayPrompt.replace(/\x1b\[[0-9;]*m/g, '').trim();
                if (configRef.current.handlers.detectLighting) {
                    configRef.current.handlers.detectLighting(cleanLine);
                }
            }
        };

        // Splits a physical line that contains an XML <prompt>...</prompt> tag
        // anywhere within it into (preText | prompt | postText) so that:
        //  - the prompt updates the HUD
        //  - any other text on the same line (e.g. "<prompt>&gt;</prompt><header>...</header>")
        //    is still processed as a normal game line and shows up in the log.
        const splitXmlPrompt = (line: string) => {
            const re = /<prompt[^>]*>[\s\S]*?<\/prompt>/;
            const m = line.match(re);
            if (!m || m.index === undefined) return null;
            return {
                preText: line.substring(0, m.index),
                promptPart: m[0],
                postText: line.substring(m.index + m[0].length),
            };
        };

        for (const line of rawLines) {
            // Snooped lines (prefixed with &E, &F, etc.) must bypass ALL prompt detection.
            // splitXmlPrompt runs before snoop detection, so a snooped line like
            // "&E <prompt>&gt;north</prompt>" would have its <prompt> tag extracted and
            // passed to handlePromptDetected — flickering the user's HUD with snooped commands.
            // Push straight to processedLines; processLine handles prefix stripping and routing.
            const cleanForSnoop = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (/^(?:&|mp;)[A-Z] /.test(cleanForSnoop)) {
                if (line.length > 0) processedLines.push(line);
                continue;
            }

            // Priority 1: Explicit XML Prompt Tag anywhere in the line (MUME's "change xml on" output)
            const xmlSplit = splitXmlPrompt(line);

            // Priority 2: Legacy MUME prompt at end of line
            // Stricter check: must look like a real prompt (vitals, account prompt, or standalone >)
            // This prevents matching the > at the end of XML tags.
            const legacyPromptMatch = !xmlSplit ? line.match(/^(.*?)((?:!\[.*?\]\s*>|(?:\d+H\s+\d+M\s+\d+V\s+>)|(?:^> )|(?:Password:)|(?:By what name.*?\?))\s*)$/) : null;

            if (xmlSplit) {
                if (xmlSplit.preText.length > 0) processedLines.push(xmlSplit.preText);
                handlePromptDetected(xmlSplit.promptPart);
                if (xmlSplit.postText.length > 0) processedLines.push(xmlSplit.postText);
            } else if (legacyPromptMatch) {
                const preText = legacyPromptMatch[1];
                const promptPart = legacyPromptMatch[2];
                if (preText.length > 0) processedLines.push(preText);
                handlePromptDetected(promptPart);
            } else if (isPrompt(line)) {
                handlePromptDetected(line);
            } else if (line.length > 0) {
                processedLines.push(line);
            }
        }

        // Handle text remaining in buffer (the part after the last newline)
        // Snooped partial lines stay buffered for the next chunk — no prompt detection needed.
        const lastLineClean = lastLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (/^(?:&|mp;)[A-Z] /.test(lastLineClean)) {
            bufferRef.current = lastLine;
        } else {
            const xmlSplitLast = splitXmlPrompt(lastLine);
            const legacyPromptMatch = !xmlSplitLast ? lastLine.match(/^(.*?)((?:!\[.*?\]\s*>|(?:\d+H\s+\d+M\s+\d+V\s+>)|(?:^> )|(?:Password:)|(?:By what name.*?\?))\s*)$/) : null;

            if (xmlSplitLast) {
                if (xmlSplitLast.preText.length > 0) processedLines.push(xmlSplitLast.preText);
                handlePromptDetected(xmlSplitLast.promptPart);
                // postText after the prompt may still be a partial line — keep it buffered so
                // the next chunk can complete it instead of pushing a half-line into the log.
                bufferRef.current = xmlSplitLast.postText;
            } else if (legacyPromptMatch) {
                const preText = legacyPromptMatch[1];
                const promptPart = legacyPromptMatch[2];
                if (preText.length > 0) processedLines.push(preText);
                handlePromptDetected(promptPart);
                bufferRef.current = '';
            } else if (isPrompt(lastLine)) {
                handlePromptDetected(lastLine);
                bufferRef.current = '';
            } else {
                bufferRef.current = lastLine;
            }
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
                                currentOccupants: [
                                    ...(roomStore.players || []),
                                    ...(roomStore.npcs || [])
                                ],
                                roomNpcs: roomStore.npcs || [],
                                activeGroupMembers: combatStore.groupMembers || [],
                                roomItems: roomStore.items || [],
                                discoveredItems: [],
                                onlinePlayers,
                                inlineCategories: settings.inlineCategories || [],
                                npcColor: settings.npcColor,
                                playerColor: settings.playerColor,
                                objectColor: settings.objectColor,
                                roomColor: settings.roomColor,
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
