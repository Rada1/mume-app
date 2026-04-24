/**
 * @file useLogGmcpParser.ts
 * @description Extracts and processes GMCP data embedded as text in the log.
 */

import { useCallback, useEffect, useRef } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
import { GameStats, CombatHealthStatus } from '../../types';

interface LogGmcpParserDeps {
    setSpectateWaiting: (val: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    spectateCharacterName: string | null;
    setRoomPlayers: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomZone: (zone: string | null) => void;
    setCurrentTerrain: (terrain: string) => void;
    setRoomExits: (exits: string[]) => void;
    characterName: string | null;
    mapperRef: React.RefObject<any>;
    detectLighting?: (light: number | string) => void;
    setWeather?: (w: any) => void;
    setIsFoggy?: (f: boolean) => void;
    isSpectateMode?: boolean;
    sessionMode?: import('../../types').SessionMode;
    playMovementSound?: (isRiding?: boolean) => void;
    playDoorSound?: (isOpen: boolean) => void;
}

export function useLogGmcpParser(deps: LogGmcpParserDeps) {
    const latestDeps = useRef(deps);
    useEffect(() => {
        latestDeps.current = deps;
    });

    const isSpectateModeRef = useRef(deps.isSpectateMode);
    const sessionModeRef = useRef(deps.sessionMode);
    const lastSpectateRoomIdRef = useRef<string | number | null>(null);
    const lastSpectateExitsRef = useRef<Record<string, any>>({});
    const spectatePositionRef = useRef<string>('standing');
    const spectateTargetIdRef = useRef<number | null>(null);

    useEffect(() => { isSpectateModeRef.current = deps.isSpectateMode; }, [deps.isSpectateMode]);
    useEffect(() => { sessionModeRef.current = deps.sessionMode; }, [deps.sessionMode]);

    const findStatus = (str: string | undefined): CombatHealthStatus | null => {
        if (!str) return null;
        const s = str.toLowerCase();
        if (s.includes('healthy')) return 'Healthy';
        if (s.includes('fine')) return 'Fine';
        if (s.includes('hurt')) return 'Hurt';
        if (s.includes('wounded')) return 'Wounded';
        if (s.includes('bad')) return 'Bad';
        if (s.includes('awful')) return 'Awful';
        if (s.includes('stunned')) return 'Stunned';
        if (s.includes('dying') || s.includes('bleeding') || s.includes('mortally')) return 'Dying';
        return null;
    };

    const parseLogGmcp = useCallback((line: string) => {
        const d = latestDeps.current;
        if (!d) return false;

        const {
            setSpectateWaiting, setCurrentTerrain,
            detectLighting, setWeather, setIsFoggy, playDoorSound, setRoomItems,
            setSpectateCharacterName, setRoomPlayers, setRoomNpcs, spectateCharacterName, characterName,
        } = d;

        const inSpectate = isSpectateModeRef.current;
        // Strip ANSI escape codes first — cleanLine from processLine still contains them
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Detect if the line has explicit GMCP marking or snoop prefixes
        const isSnooped = /^\s*&[a-zA-Z]\s+/.test(stripped);
        const isExplicitGmcp = /GMCP\s+/i.test(stripped);
        
        // Robust GMCP regex handles optional GMCP prefix and ampersand prefixes
        // Sometimes snooped logs leak naked namespaces like "Core.Ping"
        // In session replays, non-printable "replacement characters" (diamonds) often appear at the start.
        const gmcpRegex = /^[\s\uFFFD\x00-\x1F\x7F-\xFF]*(?:&[a-zA-Z]\s+)*(?:GMCP\s+)?([A-Za-z]+\.[A-Za-z]+[A-Za-z\.]*)(?:\s*(.+))?$/i;
        const match = stripped.match(gmcpRegex);
        
        if (!match) return false;

        const namespace = match[1];
        const jsonStr = match[2];

        // --- Selective Suppression Logic ---
        // If we are NOT in spectate mode, we only suppress if it is EXPLICITLY marked as GMCP,
        // UNLESS we are in replay mode (Theater Mode). In replays, ANY GMCP leak should be hidden.
        // This prevents suppressing "Core.Hello" (no payload) which is common in documentation/help text.
        const isReplay = sessionModeRef.current === 'replay';
        if (!inSpectate && !isExplicitGmcp && !isReplay) return false;

        // If it looks like a known GMCP namespace but has no payload, it's a signal to suppress
        // (but only if we've passed the mode check above)
        if (!jsonStr) return true;

        try {
            // Clean common issues like literal newlines/carriages that might leak from snoops
            // JSON.parse strictly forbids literal control characters in strings.
            const cleanedJson = jsonStr.trim()
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
            
            const data = JSON.parse(cleanedJson);
            console.log('[LogGmcpParser] Parsed:', namespace, data);

            switch (namespace) {
                case 'Char.Vitals':
                    gmcpBus.emit('Char.Vitals', data);

                    if (data.position) {
                        const posLower = data.position.toLowerCase();
                        setSpectateWaiting(posLower === 'waiting' || posLower.includes('waiting'));
                    }

                    // Strict clearing signal: if opponent is null/empty, we ARE NOT fighting
                    if (data.opponent === null || data.opponent === "") {
                        gmcpBus.emit('Char.Opponent', null);
                    }

                    if (data.opponent !== undefined) {
                        gmcpBus.emit('Char.Opponent', data.opponent || null);
                    }
                    
                    // If we have opponent HP in the vitals packet, route it via Char.Buffer or 
                    // Room.CharsCombat so the combat store can see it.
                    if (data['opponent-hp'] || data['opponent-hits']) {
                        const status = data['opponent-hp'] || data['opponent-hits'];
                        gmcpBus.emit('Room.CharsCombat', [{
                            name: data.opponent,
                            health: status
                        }]);
                    }

                    // --- Environmental sync for main session if we are NOT spectating ---
                    if (!inSpectate) {
                        if (data.light !== undefined && data.light !== null && detectLighting) {
                            detectLighting(data.light);
                        }
                        if (data.weather !== undefined && setWeather) {
                            setWeather(data.weather);
                            if (data.fog !== undefined && setIsFoggy) setIsFoggy(!!data.fog);
                        }
                    }
                    break;

                // Snooped Group GMCP — track the spectated player's groupmates so they
                // are always available as highlighted inline PC buttons in the log,
                // even when Room.Chars data hasn't arrived yet or is stale.
                case 'Group.Set': {
                    const members: import('../../types').GroupMember[] = Array.isArray(data) ? data : [];
                    // Identify the snooped target (they are "you" in their own group list)
                    const target = members.find((m: any) => m.type === 'you');
                    if (target) {
                        spectateTargetIdRef.current = Number(target.id);
                        console.log(`[LogGmcpParser] Group.Set: identified spectate target ID: ${spectateTargetIdRef.current}`);
                    }
                    gmcpBus.emit('Group.Set', members);
                    break;
                }
                case 'Group.Add': {
                    if (data.type === 'you' && data.id) {
                        spectateTargetIdRef.current = Number(data.id);
                        console.log(`[LogGmcpParser] Group.Add: identified spectate target ID: ${spectateTargetIdRef.current}`);
                    }
                    gmcpBus.emit('Group.Add', data);
                    break;
                }
                case 'Group.Update': {
                    if (data.id === undefined) break;
                    const id = Number(data.id);
                    const isTarget = id === spectateTargetIdRef.current;
                    
                    gmcpBus.emit('Group.Update', data);

                    // Use Group.Update for reliable 'waiting' (casting) state synchronization in spectate mode
                    if (data.waiting !== undefined) {
                        if (isTarget) {
                            setSpectateWaiting(!!data.waiting);
                        } else if (!spectateTargetIdRef.current) {
                            // Fallback: If we haven't identified a target ID yet, and we get a waiting=true
                            // while spectating, assume this ID belongs to our target for now.
                            spectateTargetIdRef.current = id;
                            setSpectateWaiting(!!data.waiting);
                        }
                    }
                    break;
                }
                case 'Group.Remove': {
                    gmcpBus.emit('Group.Remove', data);
                    break;
                }

                case 'Room.Info': {
                    gmcpBus.emit('Room.Info', data);

                    // Track the last spectated gmcp room id. When it changes (new room or a fresh
                    // target after a snoop switch), clear occupants — Room.Chars.Add/Update is
                    // accumulative, so without this, stale NPCs/players from the previous room
                    // (or from the previous snoop target) pollute the tracker.
                    const incomingId = data.num ?? (data as any).vnum ?? (data as any).id ?? null;
                    if (incomingId !== null && incomingId !== lastSpectateRoomIdRef.current) {
                        lastSpectateRoomIdRef.current = incomingId;
                        
                        // Pass riding status to ensure correct sound effect (horse vs footsteps)
                        const isRiding = spectatePositionRef.current === 'riding' || spectatePositionRef.current?.includes('riding');
                        d.playMovementSound?.(isRiding);
                    }
                    if (d.mapperRef?.current?.handleRoomInfo) {
                        d.mapperRef.current.handleRoomInfo({ ...data, spectating: true });
                    }
                    break;
                }
                
                case 'Room.UpdateExits':
                    gmcpBus.emit('Room.UpdateExits', data);

                    if (data.exits) {
                        // Door detection logic for spectate mode
                        if (playDoorSound) {
                            const oldExits = lastSpectateExitsRef.current || {};
                            const newExits = data.exits || {};

                            const getVisibleCount = (ex: Record<string, any>) =>
                                Object.values(ex).filter(v => v !== false && (typeof v !== 'object' || !v.flags?.includes('closed'))).length;

                            const oldVisibleCount = getVisibleCount(oldExits);
                            const newVisibleCount = getVisibleCount(newExits);

                            // Only trigger sound if we have a baseline (oldVisibleCount > 0) 
                            // to avoid "clunking" on first entry to a snooped room.
                            if (newVisibleCount > oldVisibleCount && oldVisibleCount > 0) {
                                playDoorSound(true);
                            } else if (newVisibleCount < oldVisibleCount && oldVisibleCount > 0) {
                                playDoorSound(false);
                            }
                        }
                        
                        lastSpectateExitsRef.current = data.exits;
                    }
                    if (d.mapperRef?.current?.handleUpdateExits) {
                        d.mapperRef.current.handleUpdateExits({ ...data, spectating: true });
                    }
                    break;

                case 'Room.Items.Set':
                case 'Room.Items.List': {
                    const rawList = Array.isArray(data) ? data : (data.items || data.objects || data.obj || data.objs || []);
                    const list = Array.isArray(rawList) ? rawList : [rawList];
                    const items = list
                        .map((i: any) => typeof i === 'string'
                            ? { name: i, keyword: i, short: i }
                            : { ...i, name: i.name || i.short || i.shortdesc || i.keyword })
                        .filter((i: any) => i.name);
                    gmcpBus.emit('Room.Items', items);
                    break;
                }

                case 'Room.Items.Add': {
                    const obj = typeof data === 'string'
                        ? { name: data, keyword: data, short: data }
                        : { ...data, name: data.name || data.short || data.shortdesc || data.keyword };
                    if (obj.name) {
                        // Synthesize a full list update for now as the store only handles Room.Items list
                        // In a real MUME client we'd have Room.Items.Add in the bus.
                        gmcpBus.emit('Room.Items', [obj]); 
                    }
                    break;
                }

                case 'Room.Items.Remove': {
                    // Items remove is complex without a full list; for snoops, Room.Items.Set usually follows.
                    break;
                }

                case 'Char.Name':
                case 'Char.Info':
                    gmcpBus.emit('Char.Info', data);
                    break;

                case 'Room.Chars.Add':
                case 'Room.Chars.Update':
                case 'Room.Chars.Set': {
                    const rawChars = Array.isArray(data) ? data : (data.chars || data.players || data.npcs || [data]);
                    const chars = rawChars.map((c: any) => {
                        const hadExplicitType = c.pc !== undefined || c.type !== undefined;
                        if (c.name && hadExplicitType) return c;
                        if (!c.desc && !c.name) return c;

                        const source = c.name || c.desc;
                        const words = source.trim().split(/[ \t,]/).filter(Boolean);
                        if (words.length === 0) return c;

                        const firstWord = words[0];
                        const startsWithArticle = /^(a|an|the|some)$/i.test(firstWord);

                        let extractedName = c.name || firstWord;
                        if (!c.name && startsWithArticle && words.length > 1) {
                            extractedName = words[1];
                        }

                        const sanitized = extractedName.replace(/[.,:;!]$/, '');
                        if (sanitized.length <= 1) return c;

                        const startsUpperCase = /^[A-Z\u00C0-\u00DE]/.test(sanitized);
                        const nameWords = sanitized.split(/\s+/).filter(Boolean);
                        const secondWord = nameWords[1] ?? '';
                        const looksLikePlayerName = nameWords.length === 1 || secondWord.toLowerCase() === 'the';
                        const inferredPc = !hadExplicitType ? (!startsWithArticle && startsUpperCase && looksLikePlayerName) : undefined;

                        return {
                            ...c,
                            name: sanitized,
                            ...(inferredPc !== undefined ? { pc: inferredPc } : {})
                        };
                    });

                    if (namespace === 'Room.Chars.Set') {
                        const pcs: any[] = [];
                        const npcs: any[] = [];
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            if (c.pc || c.type === 'pc' || c.type === 'player') pcs.push(c);
                            else npcs.push(c);
                        });
                        gmcpBus.emit('Room.Players', pcs);
                        gmcpBus.emit('Room.Npcs', npcs);
                    } else {
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            const isPc = c.pc || c.type === 'pc' || c.type === 'player';
                            
                            // Sync position/combat for target
                            const targetToSync = inSpectate ? spectateCharacterName : characterName;
                            if (c.name === targetToSync && c.position !== undefined) {
                                gmcpBus.emit('Char.Position', c.position);
                                const posLower = c.position.toLowerCase();
                                setSpectateWaiting(posLower === 'waiting' || posLower.includes('waiting'));
                            }

                            if (isPc) {
                                gmcpBus.emit('Room.AddPlayer', c);
                            } else {
                                gmcpBus.emit('Room.AddNpc', c);
                            }
                        });
                    }
                    break;
                }

                case 'Room.Chars.Combat': {
                    gmcpBus.emit('Room.CharsCombat', data);
                    break;
                }
                case 'Room.Chars.Remove': {
                    const id = typeof data === 'object' ? data.id : data;
                    gmcpBus.emit('Room.RemovePlayer', id);
                    gmcpBus.emit('Room.RemoveNpc', id);
                    break;
                }
            }
            return true;
        } catch (e) {
            console.warn('[LogGmcpParser] Failed to parse JSON:', jsonStr, 'Error:', e);
            // Even if JSON fails, if it's a GMCP line, we suppress it from the log
            return true;
        }
    }, []);

    const resetSpectateContext = useCallback(() => {
        const d = latestDeps.current;
        if (!d) return;

        lastSpectateRoomIdRef.current = null;
        spectateTargetIdRef.current = null;
        
        // Note: clearing stores should ideally be done via a dedicated bus event 
        // or by calling store.reset() directly. For now, we'll rely on the next 
        // room update to clear occupants.
        if (d.mapperRef?.current?.stableRoomIdRef) {
            d.mapperRef.current.stableRoomIdRef.current = null;
        }
    }, []);

    return { parseLogGmcp, resetSpectateContext };
}
