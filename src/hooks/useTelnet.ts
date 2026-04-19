import * as React from 'react';
import { IAC, SB, SE, TELNET_GMCP, TELNET_TTYPE, TTYPE_IS, TTYPE_SEND } from '../constants';
import { MessageType, WeatherType, GameStats, GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpRoomItems, GmcpOccupant, GmcpExitInfo, GmcpUpdateExits, GmcpRoomNpcs } from '../types';
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';
import { gmcpBus } from '../events/gmcpBus';

export interface TelnetHandlers {
    setStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
    setStats: React.Dispatch<React.SetStateAction<GameStats>>;
    setWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
    setIsFoggy: React.Dispatch<React.SetStateAction<boolean>>;
    setInCombat: (inCombat: boolean, force?: boolean) => void;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }) => void;
    detectLighting: (light: string) => void;
    onOpponentChange?: (opponent: string | null) => void;
    onBufferChange?: (buffer: string | null) => void;
    onAddPlayer?: (data: string | GmcpOccupant) => void;
    onRemovePlayer?: (data: string | GmcpOccupant) => void;
    onRoomItems?: (data: GmcpRoomItems) => void;
    onRoomInfo?: (data: GmcpRoomInfo) => void;
    onRoomUpdateExits?: (data: GmcpUpdateExits) => void;
    onCharVitals?: (data: GmcpCharVitals) => void;
    onRoomPlayers?: (data: GmcpRoomPlayers) => void;
    onRoomNpcs?: (data: GmcpRoomNpcs) => void;
    onAddNpc?: (data: string | GmcpOccupant) => void;
    onRemoveNpc?: (data: string | GmcpOccupant) => void;
    onCharNameChange?: (name: string | null) => void;
    onCharInfo?: (data: import('../types').GmcpCharInfo) => void;
    onPositionChange?: (position: string) => void;
    onComm?: (sender: string, chan: string, msg: string) => void;
    onGroupAdd?: (data: any) => void;
    onGroupUpdate?: (data: any) => void;
    onGroupRemove?: (data: any) => void;
    onGroupSet?: (data: any) => void;
    onMumeEdit?: (data: import('../types').GmcpMumeEdit) => void;
    onRoomCharsCombat?: (data: any[]) => void;
    onCharRide?: (data: any) => void;
    onCorePing?: () => void;
    onCoreGoodbye?: () => void;
    onDisconnect?: () => void;
    flushMessages?: () => void;
    addDiagnosticLog?: (log: string) => void;
    onEchoChange?: (visible: boolean) => void;
}

export interface TelnetOptions {
    connectionUrl: string;
    processLine: (line: string) => void;
    setPrompt: (prompt: string) => void;
    onCharNameChange?: (name: string | null) => void;
    onPositionChange?: (position: string) => void;
    handlers: TelnetHandlers;
    recordEntry?: (type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any) => void;
}

export function useTelnet(options: TelnetOptions) {
    const { handlers, connectionUrl, processLine, setPrompt, recordEntry } = options;
    const socketRef = React.useRef<WebSocket | null>(null);
    const bufferRef = React.useRef<string>("");
    const isBackgroundedRef = React.useRef<boolean>(false);
    const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Stability fix: use a ref for handlers to avoid stale closures in GmcpDecoder
    const handlersRef = React.useRef(handlers);
    const recordEntryRef = React.useRef(recordEntry);
    React.useEffect(() => {
        handlersRef.current = handlers;
        recordEntryRef.current = recordEntry;
    }, [handlers, recordEntry]);

    const sendBytes = React.useCallback((bytes: number[]) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(new Uint8Array(bytes));
    }, []);

    const sendGMCP = React.useCallback((pkg: string, data: any = null) => {
        const json = data ? JSON.stringify(data) : '';
        const payload = pkg + (json ? ' ' + json : '');
        const payloadBytes = Array.from(new TextEncoder().encode(payload));
        sendBytes([IAC, SB, TELNET_GMCP, ...payloadBytes, IAC, SE]);
    }, [sendBytes]);

    const gmcpDecoder = React.useRef(new GmcpDecoder({
        setStats: (val) => handlersRef.current.setStats(val),
        setWeather: (val) => handlersRef.current.setWeather(val),
        setIsFoggy: (val) => handlersRef.current.setIsFoggy(val),
        setInCombat: (val, force) => handlersRef.current.setInCombat(val, force),
        detectLighting: (val) => handlersRef.current.detectLighting(val),
        onOpponentChange: (val) => { gmcpBus.emit('Char.Opponent', val); handlersRef.current.onOpponentChange?.(val); },
        onBufferChange: (val) => { gmcpBus.emit('Char.Buffer', val); handlersRef.current.onBufferChange?.(val); },
        onAddPlayer: (val) => { gmcpBus.emit('Room.AddPlayer', val); handlersRef.current.onAddPlayer?.(val); },
        onRemovePlayer: (val) => { gmcpBus.emit('Room.RemovePlayer', val); handlersRef.current.onRemovePlayer?.(val); },
        onRoomItems: (val) => { gmcpBus.emit('Room.Items', val); handlersRef.current.onRoomItems?.(val); },
        onRoomInfo: (val) => { gmcpBus.emit('Room.Info', val); handlersRef.current.onRoomInfo?.(val); },
        onRoomUpdateExits: (val) => { gmcpBus.emit('Room.UpdateExits', val); handlersRef.current.onRoomUpdateExits?.(val); },
        onCharVitals: (val) => { gmcpBus.emit('Char.Vitals', val); handlersRef.current.onCharVitals?.(val); },
        onRoomPlayers: (val) => { gmcpBus.emit('Room.Players', val); handlersRef.current.onRoomPlayers?.(val); },
        onRoomNpcs: (val) => { gmcpBus.emit('Room.Npcs', val); handlersRef.current.onRoomNpcs?.(val); },
        onAddNpc: (val) => { gmcpBus.emit('Room.AddNpc', val); handlersRef.current.onAddNpc?.(val); },
        onRemoveNpc: (val) => { gmcpBus.emit('Room.RemoveNpc', val); handlersRef.current.onRemoveNpc?.(val); },
        onCharNameChange: (val) => { gmcpBus.emit('Char.Name', val); handlersRef.current.onCharNameChange?.(val); },
        onCharInfo: (val) => { gmcpBus.emit('Char.Info', val); handlersRef.current.onCharInfo?.(val); },
        onPositionChange: (val) => { gmcpBus.emit('Char.Position', val); handlersRef.current.onPositionChange?.(val); },
        onComm: (sender, chan, msg) => { gmcpBus.emit('Comm.Channel', { sender, chan, msg }); handlersRef.current.onComm?.(sender, chan, msg); },
        onGroupAdd: (val) => { gmcpBus.emit('Group.Add', val); handlersRef.current.onGroupAdd?.(val); },
        onGroupUpdate: (val) => { gmcpBus.emit('Group.Update', val); handlersRef.current.onGroupUpdate?.(val); },
        onGroupRemove: (val) => { gmcpBus.emit('Group.Remove', val); handlersRef.current.onGroupRemove?.(val); },
        onGroupSet: (val) => { gmcpBus.emit('Group.Set', val); handlersRef.current.onGroupSet?.(val); },
        onMumeEdit: (val) => { gmcpBus.emit('Mume.Edit', val); handlersRef.current.onMumeEdit?.(val); },
        onDisconnect: () => { gmcpBus.emit('Connection.Disconnect', undefined); handlersRef.current.onDisconnect?.(); },
        onRoomCharsCombat: (val) => { gmcpBus.emit('Room.CharsCombat', val); handlersRef.current.onRoomCharsCombat?.(val); },
        onCharRide: (val) => { gmcpBus.emit('Char.Ride', val); handlersRef.current.onCharRide?.(val); },
        onCorePing: () => { gmcpBus.emit('Core.Ping', undefined); handlersRef.current.onCorePing?.(); },
        onCoreGoodbye: () => { gmcpBus.emit('Core.Goodbye', undefined); handlersRef.current.onCoreGoodbye?.(); }
    }));
    const protocolHandler = React.useRef<ProtocolHandler | null>(null);

    const handleSubnegotiation = React.useCallback((buffer: number[]) => {
        if (buffer.length === 0) return;
        const cmd = buffer[0];
        if (cmd === TELNET_GMCP) {
            const raw = new TextDecoder().decode(new Uint8Array(buffer.slice(1)));
            let splitIdx = raw.search(/[\s\{\[]/);
            const pkg = splitIdx > -1 ? raw.substring(0, splitIdx).trim() : raw;
            const json = splitIdx > -1 ? raw.substring(splitIdx).trim() : '';
            if (recordEntryRef.current) recordEntryRef.current('gmcp', { pkg, data: json });
            gmcpDecoder.current.decode(pkg, json);
        } else if (cmd === TELNET_TTYPE && buffer[1] === TTYPE_SEND) {
            const bytes = [IAC, SB, TELNET_TTYPE, TTYPE_IS, ...Array.from(new TextEncoder().encode("xterm-256color")), IAC, SE];
            sendBytes(bytes);
        }
    }, [sendBytes]);

    const lastProcessedPromptRef = React.useRef<string>("");

    const processText = React.useCallback((text: string) => {
        bufferRef.current += text;

        const lines = bufferRef.current.split('\n');
        // Keep the potentially incomplete last line in the buffer
        bufferRef.current = lines.pop() || '';

        // Process all COMPLETE lines first
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // De-duplication: if this line was previously processed as an optimistic prompt
            // (e.g. "By what name...?"), don't process it again now that it has a newline.
            if (i === 0 && lastProcessedPromptRef.current !== "" && line === lastProcessedPromptRef.current) {
                lastProcessedPromptRef.current = "";
                continue;
            }
            const result = processLine(line);
            // If processLine explicitly returns null, it means the line was suppressed (e.g. GMCP bleed)
            // and we should NOT update the prompt based on it if it's the last thing we saw.
            if (result === null) {
                // If this was the last line, we don't want it to 'stick' as the current prompt either
                if (i === lines.length - 1) {
                    lastProcessedPromptRef.current = "";
                }
                continue;
            }
        }

        // ONLY after all lines are added to the message log, update the prompt
        // using what is left in the buffer.
        const remaining = bufferRef.current;
        setPrompt(remaining);

        if (remaining) {
            const cleanPrompt = remaining.replace(/\x1b\[[0-9;]*m/g, '').trim();
            // Any incomplete buffer ending with '>' is a prompt — always parse it.
            // Also recognize MUME-specific paginators and login prompts that don't end in '>'
            const isLikelyPrompt = cleanPrompt.endsWith('>') || 
                                   (cleanPrompt.startsWith('***') && cleanPrompt.endsWith('***')) ||
                                   cleanPrompt.toLowerCase().includes('return: continue') ||
                                   cleanPrompt.toLowerCase().includes('by what name') ||
                                   cleanPrompt.toLowerCase().endsWith('password:');

            if (isLikelyPrompt) {
                // Track this prompt so we don't double-process it if a newline follows
                // We update this BEFORE calling processLine to prevent recursive races 
                // if processLine is slow or triggers a state update that Re-renders before return.
                lastProcessedPromptRef.current = remaining;
                
                // CRITICAL: We bypass the null-return check here because prompts
                // must ALWAYS be processed to update the game state/UI, even if 
                // they contain GMCP data that was also parsed.
                processLine(remaining);

                if (handlersRef.current.detectLighting) handlersRef.current.detectLighting(cleanPrompt);
                if (handlersRef.current.flushMessages) handlersRef.current.flushMessages();
            } else {
                // If it's no longer a 'likely prompt', clear the tracking
                lastProcessedPromptRef.current = "";
            }
        } else {
            // Buffer is empty, clear the tracking
            lastProcessedPromptRef.current = "";
        }
    }, [processLine, setPrompt]);

    // Stable callback refs — update on every render so ProtocolHandler always
    // calls the latest version without needing to be re-created.
    const sendBytesRef = React.useRef(sendBytes);
    const sendGMCPRef = React.useRef(sendGMCP);
    const handleSubnegotiationRef = React.useRef(handleSubnegotiation);
    const processTextRef = React.useRef(processText);
    const addMessageRef = React.useRef(handlers.addMessage);
    React.useEffect(() => {
        sendBytesRef.current = sendBytes;
        sendGMCPRef.current = sendGMCP;
        handleSubnegotiationRef.current = handleSubnegotiation;
        processTextRef.current = processText;
        addMessageRef.current = handlers.addMessage;
    });

    // Create ProtocolHandler ONCE on mount — never recreate it, so gmcpReady
    // is never inadvertently reset between renders.
    React.useEffect(() => {
        protocolHandler.current = new ProtocolHandler({
            sendBytes: (...args) => sendBytesRef.current(...args),
            sendGMCP: (...args) => sendGMCPRef.current(...args),
            handleSubnegotiation: (...args) => handleSubnegotiationRef.current(...args),
            processText: (...args) => processTextRef.current(...args),
            addMessage: (...args) => addMessageRef.current(...args),
            onEchoChange: (visible: boolean) => handlersRef.current.onEchoChange?.(visible)
        });

        return () => {
            if (socketRef.current) {
                const ws = socketRef.current as any;
                if (ws._pingInterval) clearInterval(ws._pingInterval);
                ws.close();
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const connect = React.useCallback(() => {
        if (socketRef.current) socketRef.current.close();
        bufferRef.current = "";
        protocolHandler.current?.setGmcpReady(false);
        try {
            handlersRef.current.setStatus('connecting');
            const msg1 = `Connecting to ${connectionUrl}...`;
            console.log(`[WebSocket] Initiating connection to ${connectionUrl} (Origin: ${window.location.origin})`);
            handlersRef.current.addMessage('system', msg1, undefined, undefined, undefined, { textOnly: msg1, lower: msg1.toLowerCase() });
            
            // Try with no subprotocol first. If it fails once, some systems might prefer 'binary'.
            const ws = new WebSocket(connectionUrl);
            ws.binaryType = "arraybuffer";

            // Set connection timeout
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    console.warn(`[WebSocket] Connection timed out for ${connectionUrl}`);
                    ws.close();
                    handlersRef.current.setStatus('disconnected');
                    const msg = 'Connection timed out. Please check your network and try again.';
                    handlersRef.current.addMessage('error', msg, undefined, undefined, undefined, { textOnly: msg, lower: msg.toLowerCase() });
                    handlersRef.current.addDiagnosticLog?.(`Timeout: Handshake took longer than 10s on ${connectionUrl}`);
                }
            }, 10000);
            
            ws.onopen = () => {
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }
                console.log(`[WebSocket] Connected successfully to ${connectionUrl}`);
                handlersRef.current.setStatus('connected');
                const msg2 = 'Connected! Negotiating...';
                handlersRef.current.addMessage('system', msg2, undefined, undefined, undefined, { textOnly: msg2, lower: msg2.toLowerCase() });
                const interval = setInterval(() => { if (ws.readyState === WebSocket.OPEN) sendGMCP('Core.Ping'); }, 30000);
                (ws as any)._pingInterval = interval;
            };
            ws.onmessage = (event) => { 
                if (event.data instanceof ArrayBuffer) {
                    const bytes = new Uint8Array(event.data);
                    if (recordEntryRef.current) recordEntryRef.current('rx', Array.from(bytes));
                    protocolHandler.current?.handleRawData(bytes); 
                }
            };
            ws.onclose = (event) => {
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }
                const reason = event.reason ? ` Reason: ${event.reason}` : '';
                const codeDesc = event.code === 1006 ? ' (Abnormal Closure - often firewall/proxy or TLS issue)' : '';
                handlersRef.current.setStatus('disconnected');
                handlersRef.current.onDisconnect?.();
                handlersRef.current.addMessage('error', `Connection closed. Code: ${event.code}${codeDesc}`, undefined, undefined, undefined, { textOnly: `Connection closed. Code: ${event.code}${codeDesc}`, lower: `connection closed. code: ${event.code}${codeDesc.toLowerCase()}` });
                handlersRef.current.addDiagnosticLog?.(`WebSocket closed: Code ${event.code}${codeDesc},${reason}, WasClean: ${event.wasClean}`);
                console.warn(`[WebSocket] Closed: Code ${event.code}${codeDesc}${reason}`);
                if ((ws as any)._pingInterval) clearInterval((ws as any)._pingInterval);
            };
            ws.onerror = (event) => {
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }
                console.error('[WebSocket] Connection Error Event:', event);
                handlersRef.current.setStatus('disconnected');
                handlersRef.current.onDisconnect?.();
                handlersRef.current.addMessage('error', 'Handshake failed. Check diagnostics.', undefined, undefined, undefined, { textOnly: 'Handshake failed. Check diagnostics.', lower: 'handshake failed. check diagnostics.' });
                handlersRef.current.addDiagnosticLog?.(`WebSocket error on ${connectionUrl}. Browser Security (CORS/Origin) or mixed content might be blocking this. Result: Code 1006 likely.`);
            };
            socketRef.current = ws;
        } catch (e: any) { 
            handlersRef.current.setStatus('disconnected'); 
            handlersRef.current.addMessage('error', `Socket Error: ${e?.message}`, undefined, undefined, undefined, { textOnly: `Socket Error: ${e?.message}`, lower: `socket error: ${e?.message?.toLowerCase()}` }); 
            handlersRef.current.addDiagnosticLog?.(`Execution failure: ${e?.message}`);
            console.error('[WebSocket] Setup exception:', e);
        }
    }, [connectionUrl, sendGMCP]);

    React.useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                isBackgroundedRef.current = false;
                // If we were backgrounded and disconnected, reconnect immediately
                if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
                    connect();
                }
            } else {
                isBackgroundedRef.current = true;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [connect]);

    return {
        connect, disconnect: () => socketRef.current?.close(),
        sendCommand: (cmd: string) => { 
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                if (recordEntryRef.current) recordEntryRef.current('tx', cmd);
                socketRef.current.send(new TextEncoder().encode(cmd + '\r\n')); 
            }
        },
        sendGMCP
    };
}
