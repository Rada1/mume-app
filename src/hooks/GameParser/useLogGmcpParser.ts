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
            setSpectateStats, setSpectateHealthStatus, setSpectateWaiting, setSpectateInCombat,
            setSpectateOpponentStatus, setSpectateOpponentName, setSpectateTerrain, setCurrentTerrain,
            setSpectateLighting, detectLighting, setSpectateWeather, setSpectateIsFoggy,
            setWeather, setIsFoggy, setSpectateGroupMembers, playDoorSound, setRoomItems,
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
                    if (data.hp !== undefined || data.maxhp !== undefined || data.maxhits !== undefined ||
                        data.mana !== undefined || data.sp !== undefined || data.maxmana !== undefined || data.maxsp !== undefined ||
                        data.move !== undefined || data.mp !== undefined || data.mv !== undefined ||
                        data.maxmove !== undefined || data.maxmoves !== undefined || data.maxmv !== undefined || data.maxmp !== undefined ||
                        data.hits !== undefined || data.wimpy !== undefined) {
                        setSpectateStats(prev => {
                            const hpVal = data.hp ?? data.hits;
                            const maxHpVal = data.maxhp ?? data.maxhits;
                            // mana = spell points; MUME may send as 'mana' or 'sp'
                            const manaVal = data.mana ?? data.sp;
                            const maxManaVal = data.maxmana ?? data.maxsp;
                            // mp = move points in MUME; also aliased as move/moves/mv
                            const moveVal = data.move ?? data.moves ?? data.mv ?? data.mp;
                            const maxMoveVal = data.maxmove ?? data.maxmoves ?? data.maxmv ?? data.maxmp;

                            return {
                                hp: typeof hpVal === 'number' ? hpVal : prev.hp,
                                maxHp: typeof maxHpVal === 'number' ? maxHpVal : prev.maxHp,
                                mana: typeof manaVal === 'number' ? manaVal : prev.mana,
                                maxMana: typeof maxManaVal === 'number' ? maxManaVal : prev.maxMana,
                                move: typeof moveVal === 'number' ? moveVal : prev.move,
                                maxMove: typeof maxMoveVal === 'number' ? maxMoveVal : prev.maxMove,
                                wimpy: typeof data.wimpy === 'number' ? data.wimpy : prev.wimpy
                            };
                        });
                    }
                    if (data.hp_status || data['hp-string'] || data.hits) {
                        setSpectateHealthStatus(findStatus(data.hp_status || data['hp-string'] || data.hits));
                    }
                    if (data.position) {
                        d.setSpectatePosition(data.position);
                        spectatePositionRef.current = data.position;
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
                        setSpectateOpponentStatus(null);
                        setSpectateOpponentName(null);
                    }
                    if (data['opponent-hp'] !== undefined || data['opponent-hits'] !== undefined) {
                        const status = findStatus(data['opponent-hp'] || data['opponent-hits']);
                        console.log(`[LogGmcpParser] Opponent HP Update: ${data['opponent-hp'] || data['opponent-hits']} -> ${status}`);
                        setSpectateOpponentStatus(status);
                    }
                    if (data.opponent !== undefined) {
                        setSpectateOpponentName(data.opponent || null);
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
                    // Identify the snooped target (they are "you" in their own group list)
                    const target = members.find((m: any) => m.type === 'you');
                    if (target) {
                        spectateTargetIdRef.current = Number(target.id);
                        console.log(`[LogGmcpParser] Group.Set: identified spectate target "${target.name}" with ID: ${spectateTargetIdRef.current}`);
                    }
                    // Filter out the spectated character themselves ("you" entries)
                    const others = members.filter((m: any) => m.type !== 'you' && m.name);
                    setSpectateGroupMembers(others);
                    break;
                }
                case 'Group.Add': {
                    if (data.type === 'you' && data.id) {
                        spectateTargetIdRef.current = Number(data.id);
                        console.log(`[LogGmcpParser] Group.Add: identified spectate target ID: ${spectateTargetIdRef.current}`);
                    }
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
                    
                    // Filter out stat data (hp, mana, move, hits) from being mixed into the group 
                    // member state for the spectated player. This ensures that the primary bars 
                    // rely solely on high-fidelity Char.Vitals GMCP.
                    const isTarget = id === spectateTargetIdRef.current;
                    const filteredData = isTarget 
                        ? Object.fromEntries(Object.entries(data).filter(([k]) => !['hp', 'mana', 'move', 'hits', 'hp-string', 'vitals'].includes(k)))
                        : data;

                    setSpectateGroupMembers(prev => prev.map(m => m.id === id ? { ...m, ...filteredData } : m));

                    // Use Group.Update for reliable 'waiting' (casting) state synchronization in spectate mode
                    if (data.waiting !== undefined) {
                        if (isTarget) {
                            console.log(`[LogGmcpParser] Group.Update for target (ID ${id}): waiting=${data.waiting}`);
                            setSpectateWaiting(!!data.waiting);
                        } else if (!spectateTargetIdRef.current) {
                            // Fallback: If we haven't identified a target ID yet, and we get a waiting=true
                            // while spectating, assume this ID belongs to our target for now.
                            // This handles cases where the initial Group.Set/Add was missed.
                            spectateTargetIdRef.current = id;
                            console.log(`[LogGmcpParser] Auto-discovered spectate target ID ${id} via Group.Update waiting=${data.waiting}`);
                            setSpectateWaiting(!!data.waiting);
                        }
                    }

                    // NOTE: Do NOT sync combat state from Group.Update. Group packets are
                    // unreliable for this — they can fire with stale/mismatched fighting fields
                    // for other group members, causing false combat-start or premature stop.
                    // Combat state is driven exclusively by Char.Vitals (position/opponent).
                    break;
                }
                case 'Group.Remove': {
                    const removeId = data.id ?? data;
                    if (removeId == null) break;
                    d.setSpectateGroupMembers(prev => prev.filter(m => String(m.id) !== String(removeId)));
                    break;
                }

                case 'Room.Info': {
                    if (data.name) {
                        d.setSpectateRoomName(data.name);
                        d.setRoomName(data.name);
                    }
                    if (data.desc !== undefined) {
                        d.setSpectateRoomDesc(data.desc);
                        d.setRoomDesc(data.desc);
                    }
                    if (data.terrain || data.environment) {
                        const terrain = data.terrain || data.environment;
                        d.setSpectateTerrain(terrain);
                        if (inSpectate) d.setCurrentTerrain(terrain);
                    }
                    if (data.zone || data.area) {
                        const zone = data.zone || data.area;
                        d.setSpectateRoomZone(zone);
                        if (inSpectate) d.setRoomZone(zone);
                    }

                    // Track the last spectated gmcp room id. When it changes (new room or a fresh
                    // target after a snoop switch), clear occupants — Room.Chars.Add/Update is
                    // accumulative, so without this, stale NPCs/players from the previous room
                    // (or from the previous snoop target) pollute the tracker.
                    const incomingId = data.num ?? (data as any).vnum ?? (data as any).id ?? null;
                    if (incomingId !== null && incomingId !== lastSpectateRoomIdRef.current) {
                        d.setRoomPlayers([]);
                        d.setRoomNpcs([]);
                        lastSpectateRoomIdRef.current = incomingId;
                        
                        // Pass riding status to ensure correct sound effect (horse vs footsteps)
                        const isRiding = spectatePositionRef.current === 'riding' || spectatePositionRef.current?.includes('riding');
                        d.playMovementSound?.(isRiding);
                    }
                    d.setRoomPlayers([]); // Wait, looking at original: setRoomItems([]);
                    d.setRoomItems([]);
                    if (d.mapperRef?.current?.handleRoomInfo) {
                        d.mapperRef.current.handleRoomInfo({ ...data, spectating: true });
                    }
                    if (data.exits) {
                        d.setRoomExits(Object.keys(data.exits));
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
                        d.setRoomExits(Object.keys(data.exits));
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
                                d.setSpectatePosition(c.position);
                                spectatePositionRef.current = c.position;
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
                    const targetToSync = inSpectate ? spectateCharacterName : characterName;
                    data.forEach((char: any) => {
                        const status = findStatus(char.health || char.condition || char.hp_status || char.status);
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
    }, []);

    const resetSpectateContext = useCallback(() => {
        const d = latestDeps.current;
        if (!d) return;

        lastSpectateRoomIdRef.current = null;
        spectateTargetIdRef.current = null;
        d.setRoomPlayers([]);
        d.setRoomNpcs([]);
        d.setRoomItems([]);
        d.setSpectateRoomName(null);
        d.setSpectateRoomDesc(null);
        d.setRoomName(null);
        d.setRoomDesc(null);
        d.setRoomZone(null);
        d.setCurrentTerrain('city');
        d.setSpectateGroupMembers([]);
        if (d.mapperRef?.current?.stableRoomIdRef) {
            d.mapperRef.current.stableRoomIdRef.current = null;
        }
    }, []);

    return { parseLogGmcp, resetSpectateContext };
}
