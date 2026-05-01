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
    const lastQueuedPromptRef = React.useRef<{ key: string, time: number } | null>(null);
    const pendingTextLines = React.useRef<(string | { line: string, isPrompt: boolean })[]>([]);
    const processingTimeout = React.useRef<any>(null);
    const hasSentGameEntrySetupRef = React.useRef(false);

    const snoopBlockRef = React.useRef<{ symbol: string; type: string } | null>(null);
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
            onRoomItems: (val) => configRef.current.handlers.onRoomItems?.(val),
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
        if (!isConnected) {
            hasSentGameEntrySetupRef.current = false;
        }
    }, [isConnected]);

    const sendGameEntrySetup = React.useCallback((source: string) => {
        if (hasSentGameEntrySetupRef.current) return;
        hasSentGameEntrySetupRef.current = true;
        console.log(`[Telnet] Sending game-entry setup from ${source}: change xml on, change page off, info %O %D %k %A`);
        sendBytes(new TextEncoder().encode('change xml on\n'));
        sendBytes(new TextEncoder().encode('change page off\n'));
        sendBytes(new TextEncoder().encode('info %O %D %k %A\n'));
    }, [sendBytes]);

    const processText = (text: string) => {
        bufferRef.current += text;
        
        const currentBuffer = bufferRef.current;
        const rawLines = currentBuffer.split('\n');
        let lastLine = rawLines.pop() || '';

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
                clean.toLowerCase().includes('return: continue'));
        };

        const isAccountLoginQuestion = (line: string) => {
            const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim().toLowerCase();
            return clean.includes('by what name do you wish') ||
                clean.includes('account password:') ||
                clean === 'password:';
        };

        const decodePromptText = (line: string) => line
            .replace(/<prompt[^>]*>|<\/prompt>/gi, '')
            .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '')
            .replace(/&gt;/gi, '>')
            .replace(/&lt;/gi, '<')
            .replace(/&amp;/gi, '&')
            .trim();

        const handlePromptDetected = (line: string) => {
            let displayPrompt = line;
            if (line.includes('<')) {
                // Strip XML tags and decode entities for the UI display/log prompt.
                displayPrompt = decodePromptText(line);
            }

            // Remove trailing > delimiter if present for a cleaner HUD look
            if (displayPrompt.endsWith('>')) {
                displayPrompt = displayPrompt.substring(0, displayPrompt.length - 1).trim();
            }

            const promptKey = displayPrompt.replace(/\s+/g, ' ').trim();
            const isNewPrompt = promptKey !== lastProcessedPromptRef.current;
            if (isNewPrompt) {
                lastProcessedPromptRef.current = promptKey;
                configRef.current.setPrompt(displayPrompt);

                const cleanLine = displayPrompt.replace(/\x1b\[[0-9;]*m/g, '').trim();
                if (configRef.current.handlers.detectLighting) {
                    configRef.current.handlers.detectLighting(cleanLine);
                }
            }

            // Queue normalized prompt text so XML-only variants don't render as
            // duplicate prompts. Repeated prompts outside the same network burst still
            // flow through so parser-driven capture sessions can finalize.
            const now = Date.now();
            const lastQueued = lastQueuedPromptRef.current;
            const isBurstDuplicate = !!lastQueued && lastQueued.key === promptKey && now - lastQueued.time < 250;
            if (!isBurstDuplicate) {
                lastQueuedPromptRef.current = { key: promptKey, time: now };
                processedLines.push({ line: displayPrompt, isPrompt: true });
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

        const normalizeSnoopLine = (value: string, symbol: string) => {
            // MUME sends symbol=L (bare letter), &L, or &amp;L — normalize all to &X format
            const rawLetter = symbol.replace(/^&amp;/i, '').replace(/^&/, '').trim().charAt(0).toUpperCase();
            const normalizedSymbol = rawLetter ? `&${rawLetter}` : '&?';
            const normalizedLine = value.replace(/^((?:\x1b\[[0-9;]*m|\s)*)&amp;([A-Z]) /, '$1&$2 ');
            const cleanLine = normalizedLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (/^(?:&|mp;)[A-Z](?: |$)/.test(cleanLine)) return normalizedLine;
            return `${normalizedSymbol} ${normalizedLine}`;
        };

        const splitSnoopXmlBlocks = (line: string): string[] => {
            if (line.length === 0) return [''];

            const out: string[] = [];
            let rest = line;

            while (rest.length > 0) {
                if (snoopBlockRef.current) {
                    const closeIdx = rest.indexOf('</snoop>');
                    const chunk = closeIdx === -1 ? rest : rest.substring(0, closeIdx);
                    const normalized = normalizeSnoopLine(chunk, snoopBlockRef.current.symbol);
                    if (normalized.trim()) out.push(normalized);
                    if (closeIdx === -1) return out;
                    snoopBlockRef.current = null;
                    rest = rest.substring(closeIdx + '</snoop>'.length);
                    continue;
                }

                const openIdx = rest.indexOf('<snoop');
                if (openIdx === -1) {
                    if (rest.length > 0) out.push(rest);
                    return out;
                }

                if (openIdx > 0) out.push(rest.substring(0, openIdx));
                rest = rest.substring(openIdx);

                const openMatch = rest.match(/^<snoop\s+symbol=([^;>\s]+)(?:;type=([^>\s]*))?>/);
                if (!openMatch) {
                    out.push(rest);
                    return out;
                }

                const symbol = openMatch[1];
                snoopBlockRef.current = { symbol, type: openMatch[2] || '' };
                rest = rest.substring(openMatch[0].length);
            }

            return out;
        };

        for (const rawLine of rawLines) {
            const lineSegments = splitSnoopXmlBlocks(rawLine);
            for (const line of lineSegments) {
                const cleanForSnoopSegment = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
                if (/^(?:&|mp;)[A-Z](?: |$)/.test(cleanForSnoopSegment)) {
                    processedLines.push(line);
                    continue;
                }

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
            const legacyPromptMatch = !xmlSplit ? line.match(/^(.*?)((?:!\[.*?\]\s*>|(?:\d+H\s+\d+M\s+\d+V\s+>)|(?:^> ))\s*)$/) : null;

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
            } else {
                processedLines.push(line);
            }
            }
        }

        // Handle text remaining in buffer (the part after the last newline)
        // Snooped partial lines stay buffered for the next chunk — no prompt detection needed.
        const lastLineClean = lastLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (snoopBlockRef.current || /^<snoop[\s>]/.test(lastLineClean) || /^(?:&|mp;)[A-Z] /.test(lastLineClean)) {
            bufferRef.current = lastLine;
        } else {
            const xmlSplitLast = splitXmlPrompt(lastLine);
            const legacyPromptMatch = !xmlSplitLast ? lastLine.match(/^(.*?)((?:!\[.*?\]\s*>|(?:\d+H\s+\d+M\s+\d+V\s+>)|(?:^> ))\s*)$/) : null;

            if (isAccountLoginQuestion(lastLine)) {
                processedLines.push(lastLine);
                bufferRef.current = '';
            } else if (xmlSplitLast) {
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
                                currentOccupants: Object.values(roomStore.chars || {}),
                                roomNpcs: Object.values(roomStore.chars || {}).filter((c: any) => c.type === 'npc'),
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
        const pkgLower = pkg.toLowerCase();
        const isRoomCharsFullSet = [
            'room.chars',
            'room.chars.set',
            'room.chars.list',
            'room.players',
            'room.npcs',
            'mume.client.chars'
        ].includes(pkgLower);
        const isRoomCharAdd = [
            'room.chars.add',
            'room.char.add',
            'room.players.add',
            'room.npcs.add',
            'room.addplayer',
            'room.addnpc',
            'room.addchar'
        ].includes(pkgLower);
        const isRoomCharUpdate = [
            'room.chars.update',
            'room.char.update',
            'room.players.update',
            'room.npcs.update'
        ].includes(pkgLower);
        const isRoomCharRemove = [
            'room.chars.remove',
            'room.char.remove',
            'room.players.remove',
            'room.npcs.remove',
            'room.removeplayer',
            'room.removenpc',
            'room.removechar'
        ].includes(pkgLower);

        // 1. Explicitly mapped handlers
        if (pkg.startsWith('Room.Info') || pkg.startsWith('Char.Name') || pkg.startsWith('Char.Vitals')) {
            sendGameEntrySetup(pkg);
        }

        if (pkg.startsWith('Char.Vitals')) {
            if (handlers.onCharVitals) handlers.onCharVitals(parsed);
        } else if (pkg.startsWith('Room.Info')) {
            if (handlers.onRoomInfo) handlers.onRoomInfo(parsed);
        } else if (pkgLower === 'group.set' || pkgLower === 'group') {
            handlers.onGroupSet?.(parsed);
        } else if (pkgLower === 'group.add') {
            handlers.onGroupAdd?.(parsed);
        } else if (pkgLower === 'group.update') {
            handlers.onGroupUpdate?.(parsed);
        } else if (pkgLower === 'group.remove') {
            handlers.onGroupRemove?.(parsed);
        } else if (isRoomCharAdd) {
            handlers.onAddChar?.(parsed);
        } else if (isRoomCharUpdate) {
            handlers.onUpdateChar?.(parsed);
        } else if (isRoomCharRemove) {
            handlers.onRemoveChar?.(parsed);
        } else if (pkg.startsWith('Room.Players') && isRoomCharsFullSet) {
            if (handlers.onRoomPlayers) handlers.onRoomPlayers(parsed);
        } else if (isRoomCharsFullSet) {
            if (handlers.onRoomNpcs) handlers.onRoomNpcs(parsed);
        } else if (pkg.startsWith('Room.Items') || pkg.startsWith('Room.Objects')) {
            if (handlers.onRoomItems) handlers.onRoomItems(parsed);
        }

        // 2. Generic package routing for all other handlers
        // Packages like Char.Ride -> onCharRide, etc.
        const parts = pkg.split('.');
        const lastPart = parts[parts.length - 1];
        const handlerName = `on${parts[0]}${lastPart}`; // e.g. onCharRide
        const alreadyRoutedGroup = pkgLower.startsWith('group.');
        if (!alreadyRoutedGroup && (handlers as any)[handlerName]) {
            (handlers as any)[handlerName](parsed);
        }
    }, [sendGameEntrySetup]);

    const handleSubnegotiation = React.useCallback((buffer: number[]) => {
        if (buffer.length === 0) return;
        const cmd = buffer[0];
        if (cmd === TELNET_GMCP) {
            const raw = new TextDecoder().decode(new Uint8Array(buffer.slice(1)));
            let splitIdx = raw.search(/[\s\{\[]/);
            const pkg = splitIdx > -1 ? raw.substring(0, splitIdx).trim() : raw;
            const json = splitIdx > -1 ? raw.substring(splitIdx).trim() : '';
            if (pkg.toLowerCase().startsWith('room.chars')) {
                console.log('[GMCP RAW Room.Chars]', raw);
            }
            
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
