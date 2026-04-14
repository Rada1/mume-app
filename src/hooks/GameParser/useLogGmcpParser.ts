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
    setSpectateInCombat: (val: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomExits: (exits: string[]) => void;
    characterName: string | null;
    mapperRef: React.RefObject<any>;
    detectLighting?: (light: number | string) => void;
    setWeather?: (w: any) => void;
    setIsFoggy?: (f: boolean) => void;
    isSpectateMode?: boolean;
    sessionMode?: 'live' | 'replay';
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
        setRoomPlayers,
        setRoomNpcs,
        setRoomItems,
        setRoomName,
        setRoomDesc,
        setRoomExits,
        characterName,
        mapperRef,
        detectLighting,
        setWeather,
        setIsFoggy,
        isSpectateMode
    } = deps;

    // Stable refs for values that can change without the callback being recreated.
    // parseLogGmcp's dep array intentionally stays narrow (setters are stable), so we read
    // mode flags + the last-known spectate room from refs to avoid a stale-closure bug where
    // spectate GMCP lines stopped being suppressed/parsed once the user toggled spectate on.
    const isSpectateModeRef = useRef(isSpectateMode);
    const sessionModeRef = useRef(deps.sessionMode);
    const lastSpectateRoomIdRef = useRef<string | number | null>(null);
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
        const gmcpRegex = /^[\s\uFFFD\x00-\x1F\x7F-\xFF]*(?:&[a-zA-Z]\s+)*(?:GMCP\s+)?([A-Za-z]+\.[A-Za-z\.]+)(?:\s+(.+))?$/i;
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
                        if (posLower === 'fighting') {
                            setSpectateInCombat(true);
                        }
                    }
                    if (data.fighting !== undefined) {
                        setSpectateInCombat(!!data.fighting);
                    }
                    if (data.opponent !== undefined) {
                        setSpectateOpponentName(data.opponent || null);
                        setSpectateOpponentStatus(findStatus(data['opponent-hp']));
                        setSpectateInCombat(!!data.opponent);
                    }
                    // --- Environmental sync from snooped Char.Vitals ---
                    if (data.light !== undefined && data.light !== null) {
                        if (inSpectate) {
                            // Translate numeric light to LightingType if needed, but detectLighting usually handles it
                            if (typeof data.light === 'number') {
                                const l = data.light;
                                let type: import('../../types').LightingType = 'none';
                                if (l <= 0) type = 'dark';
                                else if (l <= 2) type = 'dim';
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

                case 'Group.Update':
                case 'Group.Set':
                    break;

                case 'Room.Info': {
                    if (data.name) setSpectateRoomName(data.name);
                    if (data.desc !== undefined) setSpectateRoomDesc(data.desc);
                    if (data.terrain || data.environment) setSpectateTerrain(data.terrain || data.environment);
                    if (data.zone || data.area) setSpectateRoomZone(data.zone || data.area);

                    // Track the last spectated gmcp room id. When it changes (new room or a fresh
                    // target after a snoop switch), clear occupants — Room.Chars.Add/Update is
                    // accumulative, so without this, stale NPCs/players from the previous room
                    // (or from the previous snoop target) pollute the tracker.
                    const incomingId = data.num ?? (data as any).vnum ?? (data as any).id ?? null;
                    if (incomingId !== null && incomingId !== lastSpectateRoomIdRef.current) {
                        setRoomPlayers([]);
                        setRoomNpcs([]);
                        lastSpectateRoomIdRef.current = incomingId;
                    }
                    setRoomItems([]);
                    if (mapperRef.current?.handleRoomInfo) {
                        mapperRef.current.handleRoomInfo({ ...data, spectating: true });
                    }
                    if (data.exits) setRoomExits(Object.keys(data.exits));
                    break;
                }
                
                case 'Room.UpdateExits':
                    if (mapperRef.current?.handleUpdateExits) {
                        mapperRef.current.handleUpdateExits({ ...data, spectating: true });
                    }
                    if (data.exits) setRoomExits(Object.keys(data.exits));
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

                        // Heuristic: PC if the source didn't lead with an article. Only applied when
                        // the snooped payload didn't already give us a pc/type field.
                        const inferredPc = !hadExplicitType ? !startsWithArticle : undefined;

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
        setSpectateInCombat, setSpectateCharacterName, mapperRef,
        detectLighting, setWeather, setIsFoggy, setRoomPlayers, setRoomNpcs, setRoomItems, 
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
        if (mapperRef.current?.stableRoomIdRef) {
            // Drop the mapper's notion of "which room the player is currently in" so that the
            // next snooped Room.Info is treated as a fresh sync rather than a failed move
            // correlation against the previous snoop target's last known location.
            mapperRef.current.stableRoomIdRef.current = null;
        }
    }, [setRoomPlayers, setRoomNpcs, setRoomItems, setSpectateRoomName, setSpectateRoomDesc, mapperRef]);

    return { parseLogGmcp, resetSpectateContext };
}
