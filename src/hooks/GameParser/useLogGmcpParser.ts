/**
 * @file useLogGmcpParser.ts
 * @description Extracts and processes GMCP data embedded as text in the log.
 */

import { useCallback, useEffect, useRef } from 'react';
import { GameStats, CombatHealthStatus } from '../../types';

interface LogGmcpParserDeps {
    setSpectateStats: (stats: GameStats | ((prev: GameStats) => GameStats)) => void;
    setSpectateHealthStatus: (status: CombatHealthStatus | null) => void;
    setSpectateOpponentName: (name: string | null) => void;
    setSpectateOpponentStatus: (status: CombatHealthStatus | null) => void;
    setSpectatePosition: (pos: string) => void;
    setSpectateWaiting: (val: boolean) => void;
    setSpectateRoomName: (name: string | null) => void;
    setSpectateRoomDesc: (desc: string | null) => void;
    setSpectateTerrain: (terrain: string) => void;
    setSpectateRoomZone: (zone: string | null) => void;
    setSpectateLighting: (light: import('../../types').LightingType) => void;
    setSpectateWeather: (w: import('../../types').WeatherType) => void;
    setSpectateIsFoggy: (f: boolean) => void;
    setSpectateInCombat: (val: boolean, force?: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    spectateCharacterName: string | null;
    setSpectateGroupMembers: React.Dispatch<React.SetStateAction<import('../../types').GroupMember[]>>;
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
    sessionMode?: 'live' | 'replay';
    playMovementSound?: (isRiding?: boolean) => void;
    playDoorSound?: (isOpen: boolean) => void;
}

export function useLogGmcpParser(deps: LogGmcpParserDeps) {
    const {
        setSpectateStats,
        setSpectateHealthStatus,
        setSpectateOpponentName,
        setSpectateOpponentStatus,
        setSpectatePosition,
        setSpectateWaiting,
        setSpectateRoomName,
        setSpectateRoomDesc,
        setSpectateTerrain,
        setSpectateRoomZone,
        setSpectateLighting,
        setSpectateWeather,
        setSpectateIsFoggy,
        setSpectateInCombat,
        setSpectateCharacterName,
        spectateCharacterName,
        setSpectateGroupMembers,
        setRoomPlayers,
        setRoomNpcs,
        setRoomItems,
        setRoomName,
        setRoomDesc,
        setRoomZone,
        setCurrentTerrain,
        setRoomExits,
        characterName,
        mapperRef,
        detectLighting,
        setWeather,
        setIsFoggy,
        isSpectateMode,
        playMovementSound,
        playDoorSound
    } = deps;

    // Stable refs for values that can change without the callback being recreated.
    // parseLogGmcp's dep array intentionally stays narrow (setters are stable), so we read
    // mode flags + the last-known spectate room from refs to avoid a stale-closure bug where
    // spectate GMCP lines stopped being suppressed/parsed once the user toggled spectate on.
    const isSpectateModeRef = useRef(isSpectateMode);
    const sessionModeRef = useRef(deps.sessionMode);
    const lastSpectateRoomIdRef = useRef<string | number | null>(null);
    const lastSpectateExitsRef = useRef<Record<string, any>>({});
    const spectatePositionRef = useRef<string>('standing');
    useEffect(() => { isSpectateModeRef.current = isSpectateMode; }, [isSpectateMode]);
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
        if (s.includes('dying') || s.includes('bleeding')) return 'Dying';
        return null;
    };

    const parseLogGmcp = useCallback((line: string) => {
        // Strip ANSI escape codes first — cleanLine from processLine still contains them
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Detect if the line has explicit GMCP marking or snoop prefixes
        const isSnooped = /^\s*&[a-zA-Z]\s+/.test(stripped);
        const isExplicitGmcp = /GMCP\s+/i.test(stripped);
        
        // Robust GMCP regex handles optional GMCP prefix and ampersand prefixes
        // Sometimes snooped logs leak naked namespaces like "Core.Ping"
        // In session replays, non-printable "replacement characters" (diamonds) often appear at the start.
        const gmcpRegex = /^[\s\uFFFD\x00-\x1F\x7F-\xFF]*(?:&[a-zA-Z]\s+)*(?:GMCP\s+)?([A-Za-z]+\.[A-Za-z\.]+)(?:\s*(.+))?$/i;
        const match = stripped.match(gmcpRegex);
        
        if (!match) return false;

        const namespace = match[1];
        const jsonStr = match[2];

        // --- Selective Suppression Logic ---
        // If we are NOT in spectate mode, we only suppress if it is EXPLICITLY marked as GMCP,
        // UNLESS we are in replay mode (Theater Mode). In replays, ANY GMCP leak should be hidden.
        // This prevents suppressing "Core.Hello" (no payload) which is common in documentation/help text.
        const inSpectate = isSpectateModeRef.current;
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
                    if (data.hp !== undefined || data.mana !== undefined || data.move !== undefined || data.mp !== undefined || data.hits !== undefined) {
                        setSpectateStats(prev => ({
                            hp: data.hp ?? data.hits ?? prev.hp,
                            maxHp: data.maxhp ?? data.maxhits ?? prev.hp, // Note: maxhp can be missing, use hp as fallback for max
                            mana: data.mana ?? prev.mana,
                            maxMana: data.maxmana ?? prev.maxMana,
                            move: data.move ?? data.moves ?? data.mv ?? data.mp ?? prev.move,
                            maxMove: data.maxmove ?? data.maxmoves ?? data.maxmv ?? data.maxmp ?? prev.maxMove,
                            wimpy: data.wimpy ?? prev.wimpy
                        }));
                    }
                    if (data.hp_status || data['hp-string']) {
                        setSpectateHealthStatus(findStatus(data.hp_status || data['hp-string']));
                    }
                    if (data.position) {
                        setSpectatePosition(data.position);
                        const posLower = data.position.toLowerCase();
                        setSpectateWaiting(posLower === 'waiting' || posLower.includes('waiting'));
                        const isFighting = posLower === 'fighting';
                        setSpectateInCombat(isFighting);
                        // If we are fighting, we definitely are NOT waiting
                        if (isFighting) setSpectateWaiting(false);
                    }

                    // Strict clearing signal: if opponent is null/empty, we ARE NOT fighting
                    if (data.opponent === null || data.opponent === "") {
                        setSpectateInCombat(false);
                    }
                    if (data.opponent !== undefined) {
                        setSpectateOpponentName(data.opponent || null);
                        setSpectateOpponentStatus(findStatus(data['opponent-hp']));
                    }
                    if (data.terrain) {
                        setSpectateTerrain(data.terrain);
                        if (inSpectate) setCurrentTerrain(data.terrain);
                    }

                    // --- Environmental sync from snooped Char.Vitals ---
                    if (data.light !== undefined && data.light !== null) {
                        if (inSpectate) {
                            // Translate numeric light to LightingType if needed, but detectLighting usually handles it
                            if (typeof data.light === 'number') {
                                const l = data.light;
                                let type: import('../../types').LightingType = 'none';
                                if (l <= 0) type = 'dark';
                                else if (l <= 2) type = 'moon';
                                else type = 'sun';
                                setSpectateLighting(type);
                            } else {
                                setSpectateLighting(data.light);
                            }
                        } else if (detectLighting) {
                            detectLighting(data.light);
                        }
                    }
                    if (data.weather !== undefined) {
                        if (inSpectate) {
                            setSpectateWeather(data.weather);
                            if (data.fog !== undefined) setSpectateIsFoggy(!!data.fog);
                        } else if (setWeather) {
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
                    // Filter out the spectated character themselves ("you" entries)
                    const others = members.filter((m: any) => m.type !== 'you' && m.name);
                    setSpectateGroupMembers(others);
                    break;
                }
                case 'Group.Add': {
                    if (data.type === 'you' || !data.name) break;
                    const member = data as import('../../types').GroupMember;
                    setSpectateGroupMembers(prev => {
                        if (prev.find(m => String(m.id) === String(member.id))) return prev;
                        return [...prev, member];
                    });
                    break;
                }
                case 'Group.Update': {
                    if (data.id === undefined) break;
                    const id = Number(data.id);
                    setSpectateGroupMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
                    // NOTE: Do NOT sync combat state from Group.Update. Group packets are
                    // unreliable for this — they can fire with stale/mismatched fighting fields
                    // for other group members, causing false combat-start or premature stop.
                    // Combat state is driven exclusively by Char.Vitals (position/opponent).
                    break;
                }
                case 'Group.Remove': {
                    const removeId = data.id ?? data;
                    if (removeId == null) break;
                    setSpectateGroupMembers(prev => prev.filter(m => String(m.id) !== String(removeId)));
                    break;
                }

                case 'Room.Info': {
                    if (data.name) {
                        setSpectateRoomName(data.name);
                        setRoomName(data.name);
                    }
                    if (data.desc !== undefined) {
                        setSpectateRoomDesc(data.desc);
                        setRoomDesc(data.desc);
                    }
                    if (data.terrain || data.environment) {
                        const terrain = data.terrain || data.environment;
                        setSpectateTerrain(terrain);
                        if (inSpectate) setCurrentTerrain(terrain);
                    }
                    if (data.zone || data.area) {
                        const zone = data.zone || data.area;
                        setSpectateRoomZone(zone);
                        if (inSpectate) setRoomZone(zone);
                    }

                    // Track the last spectated gmcp room id. When it changes (new room or a fresh
                    // target after a snoop switch), clear occupants — Room.Chars.Add/Update is
                    // accumulative, so without this, stale NPCs/players from the previous room
                    // (or from the previous snoop target) pollute the tracker.
                    const incomingId = data.num ?? (data as any).vnum ?? (data as any).id ?? null;
                    if (incomingId !== null && incomingId !== lastSpectateRoomIdRef.current) {
                        setRoomPlayers([]);
                        setRoomNpcs([]);
                        lastSpectateRoomIdRef.current = incomingId;
                        
                        // Pass riding status to ensure correct sound effect (horse vs footsteps)
                        const isRiding = spectatePositionRef.current === 'riding' || spectatePositionRef.current?.includes('riding');
                        playMovementSound?.(isRiding);
                    }
                    setRoomItems([]);
                    if (mapperRef.current?.handleRoomInfo) {
                        mapperRef.current.handleRoomInfo({ ...data, spectating: true });
                    }
                    if (data.exits) {
                        setRoomExits(Object.keys(data.exits));
                        lastSpectateExitsRef.current = data.exits;
                    }
                    break;
                }
                
                case 'Room.UpdateExits':
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
                        setRoomExits(Object.keys(data.exits));
                    }
                    if (mapperRef.current?.handleUpdateExits) {
                        mapperRef.current.handleUpdateExits({ ...data, spectating: true });
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
                    setRoomItems(items);
                    break;
                }

                case 'Room.Items.Add': {
                    const obj = typeof data === 'string'
                        ? { name: data, keyword: data, short: data }
                        : { ...data, name: data.name || data.short || data.shortdesc || data.keyword };
                    if (obj.name) {
                        setRoomItems(prev => [...prev, obj]);
                    }
                    break;
                }

                case 'Room.Items.Remove': {
                    const id = (data && typeof data === 'object') ? data.id : null;
                    const name = (data && typeof data === 'object') ? (data.name || data.short || data.keyword) : data;
                    setRoomItems(prev => prev.filter(it => {
                        if (id != null && (it as any).id != null && String((it as any).id) === String(id)) return false;
                        if (name && (it.name === name || it.keyword === name || it.short === name)) return false;
                        return true;
                    }));
                    break;
                }

                case 'Char.Name':
                case 'Char.Info':
                    if (data.name || data.fullname) {
                        setSpectateCharacterName(data.name || data.fullname);
                    }
                    break;

                case 'Room.Chars.Add':
                case 'Room.Chars.Update':
                case 'Room.Chars.Set': {
                    const rawChars = Array.isArray(data) ? data : (data.chars || data.players || data.npcs || [data]);
                    // Pre-process to extract names from descriptions if missing (common in snoop logs).
                    // We also classify PC vs NPC here: NPCs typically start with an article ("a pack horse"),
                    // PCs do not ("Ildaeth the Elf...").
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

                        // Heuristic: PC if the source didn't lead with an article AND the name looks
                        // like a proper player name. MUME player names are always a single capitalized
                        // word ("Ildaeth", "Khach"), optionally followed by "the <Title>" ("Ildaeth the Elf").
                        // NPC names sent without an article (article stripped by the server) may still
                        // be sentence-cased ("Mother eagle", "Pack horse"), so "starts uppercase" alone
                        // is not enough — that catches too many NPCs as false positives.
                        // Rule: infer PC only when the name is one word OR its second word is "the".
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

                    // In the snooped log-GMCP path we do NOT filter by `characterName`:
                    // the app user (characterName) may legitimately appear in the spectated
                    // player's room list, and we want them highlighted like any other PC.
                    if (namespace === 'Room.Chars.Set') {
                        const pcs: any[] = [];
                        const npcs: any[] = [];
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            if (c.pc || c.type === 'pc' || c.type === 'player') pcs.push(c);
                            else npcs.push(c);
                        });
                        setRoomPlayers(pcs);
                        setRoomNpcs(npcs);
                    } else {
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            const isPc = c.pc || c.type === 'pc' || c.type === 'player';
                            const setter = isPc ? setRoomPlayers : setRoomNpcs;
                            
                            // If this update is for the person we are spectating, and it includes position,
                            // synchronize our global spectateInCombat state immediately.
                            const targetToSync = inSpectate ? spectateCharacterName : characterName;
                            if (c.name === targetToSync && c.position !== undefined) {
                                const posLower = c.position.toLowerCase();
                                setSpectateInCombat(posLower === 'fighting');
                                if (posLower === 'fighting') setSpectateWaiting(false);
                            }

                            setter(prev => {
                                const idx = prev.findIndex(x => (x.id && x.id === c.id) || x.name === c.name);
                                if (idx >= 0) {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], ...c };
                                    return next;
                                }
                                return [...prev, c];
                            });
                        });
                    }
                    break;
                }

                case 'Room.Chars.Combat': {
                    if (!Array.isArray(data)) break;
                    // If any character in the room (including the spectated target) is reported as 
                    // fighting, we check if they are the spectated player's opponent or the player themselves.
                    // But effectively, if we see Room.Chars.Combat involving the spectated character,
                    // it means combat is active.
                    let foundTarget = false;
                    data.forEach((char: any) => {
                        const status = findStatus(char.health || char.condition || char.hp_status || char.status);
                        const targetToSync = inSpectate ? spectateCharacterName : characterName;
                        if (char.name === targetToSync) {
                            foundTarget = true;
                            // If we see combat data specifically for our target, it's a strong signal combat is ongoing.
                            // Unlike Char.Vitals position, this is room-level combat data.
                            if (char.fighting || status === 'Stunned') {
                                setSpectateInCombat(true);
                            } else {
                                setSpectateInCombat(false);
                            }
                        }
                    });
                    // Optional: If target not in room combat list, and we are in spectate,
                    // we might want to clear it, but let's stick to explicit flags for now.
                    break;
                }
                case 'Room.Chars.Remove': {
                    const id = typeof data === 'object' ? data.id : data;
                    const filter = (p: any) => p.id !== id;
                    setRoomPlayers(prev => prev.filter(filter));
                    setRoomNpcs(prev => prev.filter(filter));
                    break;
                }
            }
            return true;
        } catch (e) {
            console.warn('[LogGmcpParser] Failed to parse JSON:', jsonStr, 'Error:', e);
            // Even if JSON fails, if it's a GMCP line, we suppress it from the log
            return true;
        }
    }, [
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName, 
        setSpectateOpponentStatus, setSpectatePosition, setSpectateWaiting, setSpectateRoomName,
        setSpectateInCombat, setSpectateCharacterName, spectateCharacterName, mapperRef,
        detectLighting, setWeather, setIsFoggy, setRoomPlayers, setRoomNpcs, setRoomItems, 
        setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain,
        setRoomExits, characterName
    ]);

    // Called when the user rotates to a new snoop target. Clears everything that is tied to
    // the previous spectated character so the next Room.Info / Char.Vitals / Room.Chars.Set
    // starts from a clean slate instead of mixing old and new state.
    const resetSpectateContext = useCallback(() => {
        lastSpectateRoomIdRef.current = null;
        setRoomPlayers([]);
        setRoomNpcs([]);
        setRoomItems([]);
        setSpectateRoomName(null);
        setSpectateRoomDesc(null);
        setRoomName(null);
        setRoomDesc(null);
        setRoomZone(null);
        setCurrentTerrain('city');
        setSpectateGroupMembers([]);
        if (mapperRef.current?.stableRoomIdRef) {
            // Drop the mapper's notion of "which room the player is currently in" so that the
            // next snooped Room.Info is treated as a fresh sync rather than a failed move
            // correlation against the previous snoop target's last known location.
            mapperRef.current.stableRoomIdRef.current = null;
        }
    }, [setRoomPlayers, setRoomNpcs, setRoomItems, setSpectateRoomName, setSpectateRoomDesc, setSpectateGroupMembers, mapperRef]);

    return { parseLogGmcp, resetSpectateContext };
}
