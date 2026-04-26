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
    setRoomNum: (num: number | null) => void;
    setUserRoomNum?: (num: number | null) => void;
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

    // Local mapper cache for zone resolution
    const preloadedCoordsRef = useRef<Record<string, any>>({});
    const serverIdIndexRef = useRef<Record<string, string>>({});

    useEffect(() => {
        fetch('/mume_map_data.json?v=' + Date.now())
            .then(res => res.json())
            .then(data => {
                preloadedCoordsRef.current = data;
                
                // Build server-to-vnum index similar to MapperContext.tsx
                const sIndex: Record<string, string> = {};
                for (const vnum in data) {
                    const rData = data[vnum];
                    const rServerId = rData[6];
                    
                    // Maps vnum to itself as a baseline
                    sIndex[String(vnum)] = vnum;
                    
                    // Maps server ID to vnum for GMCP lookup
                    if (rServerId && String(rServerId) !== String(vnum)) {
                        sIndex[String(rServerId)] = vnum;
                    }
                }
                serverIdIndexRef.current = sIndex;
                console.log('[LogGmcpParser] Local mapper data and server-to-vnum index loaded');
            })
            .catch(err => console.error('[LogGmcpParser] Failed to load mapper data:', err));
    }, []);

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

    const parseLogGmcp = useCallback((line: string, isSnoopedParam: boolean = false) => {
        const d = latestDeps.current;
        if (!d) return false;

        const {
            setSpectateWaiting,
            detectLighting, setWeather, setIsFoggy, playDoorSound, setRoomItems,
            setSpectateCharacterName, setRoomPlayers, setRoomNpcs, spectateCharacterName, characterName,
            setRoomNum, setUserRoomNum
        } = d;

        const inSpectate = isSpectateModeRef.current;
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        
        const isSnooped = isSnoopedParam;
        const isExplicitGmcp = /GMCP\s+/i.test(stripped);
        
        const gmcpRegex = /^[\s\uFFFD\x00-\x1F\x7F-\xFF]*(?:&[a-zA-Z]\s+)*(?:GMCP\s+)?([A-Za-z]+\.[A-Za-z]+[A-Za-z\.]*)(?:\s*(.+))?$/i;
        const match = stripped.match(gmcpRegex);
        
        if (!match) return false;

        const namespace = match[1];
        const jsonStr = match[2];

        const isReplay = sessionModeRef.current === 'replay';
        if (!inSpectate && !isExplicitGmcp && !isReplay) return false;

        if (!jsonStr) return true;

        try {
            const cleanedJson = jsonStr.trim().replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            const data = JSON.parse(cleanedJson);
            data.isSnooped = isSnooped; // Add the flag for stores
            console.log('[LogGmcpParser] Parsed:', namespace, data);

            switch (namespace) {
                case 'Char.Vitals':
                    gmcpBus.emit('Char.Vitals', data);

                    if (data.position) {
                        const posLower = data.position.toLowerCase();
                        if (isSnooped) {
                            setSpectateWaiting(posLower === 'waiting' || posLower.includes('waiting'));
                        }
                    }

                    if (data.opponent === null || data.opponent === "") {
                        gmcpBus.emit('Char.Opponent', { data: null, isSnooped });
                    } else if (data.opponent !== undefined) {
                        gmcpBus.emit('Char.Opponent', { data: data.opponent, isSnooped });
                    }
                    
                    if (data['opponent-hp'] || data['opponent-hits']) {
                        const status = data['opponent-hp'] || data['opponent-hits'];
                        gmcpBus.emit('Room.CharsCombat', Object.assign([{
                            name: data.opponent,
                            health: status
                        }], { isSnooped }));
                    }

                    if (!isSnooped) {
                        if (data.light !== undefined && data.light !== null && detectLighting) {
                            detectLighting(data.light);
                        }
                        if (data.weather !== undefined && setWeather) {
                            setWeather(data.weather);
                            if (data.fog !== undefined && setIsFoggy) setIsFoggy(!!data.fog);
                        }
                    }
                    break;

                case 'Group.Set': {
                    const members: import('../../types').GroupMember[] = Array.isArray(data) ? data : [];
                    if (isSnooped) {
                        const target = members.find((m: any) => m.type === 'you');
                        if (target) {
                            spectateTargetIdRef.current = Number(target.id);
                        }
                    }
                    gmcpBus.emit('Group.Set', Object.assign(members, { isSnooped }));
                    break;
                }
                case 'Group.Add': {
                    if (isSnooped && data.type === 'you' && data.id) {
                        spectateTargetIdRef.current = Number(data.id);
                    }
                    gmcpBus.emit('Group.Add', data);
                    break;
                }
                case 'Group.Update': {
                    gmcpBus.emit('Group.Update', data);

                    if (isSnooped && data.waiting !== undefined) {
                        if (data.id === undefined) break;
                        const id = Number(data.id);
                        const isTarget = id === spectateTargetIdRef.current;
                        if (isTarget) {
                            setSpectateWaiting(!!data.waiting);
                        } else if (!spectateTargetIdRef.current) {
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
                    const incomingId = data.num ?? (data as any).vnum ?? (data as any).id ?? null;
                    
                    if (isSnooped && incomingId !== null) {
                        // Populate missing zone from local mapper cache to fix spectate ambient music
                        let zone = data.zone || data.area || (data as any).roomZone;
                        
                        // Resolve vnum from server ID index
                        const vnum = serverIdIndexRef.current[String(incomingId)];
                        const localCoords = vnum ? preloadedCoordsRef.current[vnum] : null;

                        if (!zone && localCoords && Array.isArray(localCoords) && localCoords[9]) {
                            zone = localCoords[9];
                            data.zone = zone;
                        }

                        // Fallback to MapperRef if local cache missed
                        if (!zone && d.mapperRef?.current?.serverIdIndexRef?.current) {
                            const refVnum = d.mapperRef.current.serverIdIndexRef.current[String(incomingId)];
                            const refCoords = refVnum ? d.mapperRef.current.preloadedCoordsRef.current[refVnum] : null;
                            if (refCoords && Array.isArray(refCoords) && refCoords[9]) {
                                zone = refCoords[9];
                                data.zone = zone;
                            }
                        }

                        if (zone) {
                            d.setRoomZone?.(zone);
                        }
                    }

                    gmcpBus.emit('Room.Info', data);

                    if (isSnooped) {
                        // gmcpBus.emit('Room.Info') above already updates useSpectateRoomStore via its listener.
                        // Do NOT call setRoomName/setRoomDesc here — those
                        // setters point to the user session and would corrupt it with target data.
                        if (incomingId !== null) {
                            setRoomNum(incomingId); // setSpectateRoomNum
                        }
                        if (incomingId !== null && incomingId !== lastSpectateRoomIdRef.current) {
                            lastSpectateRoomIdRef.current = incomingId;
                            const isRiding = spectatePositionRef.current === 'riding' || spectatePositionRef.current?.includes('riding');
                            d.playMovementSound?.(isRiding);
                        }
                    } else if (setUserRoomNum) {
                        if (incomingId !== null) setUserRoomNum(incomingId);
                    }
                    
                    // Send to MapperContext
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('mume-gmcp-room-info', { detail: { ...data, spectating: isSnooped } }));
                        
                        const terrain = data.terrain || data.environment;
                        if (terrain) {
                            window.dispatchEvent(new CustomEvent('mume-gmcp-terrain', { detail: terrain }));
                        }
                    }
                    break;
                }
                
                case 'Room.UpdateExits':
                    gmcpBus.emit('Room.UpdateExits', data);

                    if (isSnooped && data.exits) {
                        // setRoomExits removed — targets user session; spectate store already
                        // updated via gmcpBus.emit('Room.UpdateExits') above.
                        if (playDoorSound) {
                            const oldExits = lastSpectateExitsRef.current || {};
                            const newExits = data.exits || {};
                            const getVisibleCount = (ex: Record<string, any>) =>
                                Object.values(ex).filter(v => v !== false && (typeof v !== 'object' || !v.flags?.includes('closed'))).length;
                            const oldVisibleCount = getVisibleCount(oldExits);
                            const newVisibleCount = getVisibleCount(newExits);
                            if (newVisibleCount > oldVisibleCount && oldVisibleCount > 0) playDoorSound(true);
                            else if (newVisibleCount < oldVisibleCount && oldVisibleCount > 0) playDoorSound(false);
                        }
                        lastSpectateExitsRef.current = data.exits;
                    }
                    
                    // Send to MapperContext
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('mume-gmcp-room-exits', { detail: { ...data, spectating: isSnooped } }));
                    }
                    break;

                case 'Room.Items.Set':
                case 'Room.Items.List':
                case 'Room.Items':
                case 'Char.Items':
                case 'Char.Inv':
                case 'Mume.Client.RoomItems':
                case 'Mume.Client.Inventory':
                case 'Mume.Client.Equipment': {
                    const rawList = Array.isArray(data) ? data : (data.items || data.objects || data.obj || data.objs || []);
                    const list = Array.isArray(rawList) ? rawList : [rawList];
                    const items = list
                        .map((i: any) => typeof i === 'string'
                            ? { name: i, keyword: i, short: i }
                            : { ...i, name: i.name || i.short || i.shortdesc || i.keyword })
                        .filter((i: any) => i.name);
                    gmcpBus.emit('Room.Items', Object.assign(items, { isSnooped }));
                    break;
                }

                case 'Room.Items.Add': {
                    const obj = typeof data === 'string'
                        ? { name: data, keyword: data, short: data }
                        : { ...data, name: data.name || data.short || data.shortdesc || data.keyword };
                    if (obj.name) {
                        gmcpBus.emit('Room.Items', Object.assign([obj], { isSnooped })); 
                    }
                    break;
                }

                case 'Room.Items.Remove': break;

                case 'Char.Name': {
                    const name = typeof data === 'string' ? data : (data.name || null);
                    gmcpBus.emit('Char.Name', { data: name, isSnooped });
                    if (isSnooped && name) {
                        setSpectateCharacterName(name);
                    }
                    break;
                }

                case 'Char.Info':
                case 'Char.Status':
                case 'Char.StatusVars':
                    gmcpBus.emit('Char.Info', data);
                    if (isSnooped && data.name) setSpectateCharacterName(data.name);
                    break;

                case 'Room.Chars.Add':
                case 'Room.Char.Add':
                case 'Room.AddChar':
                case 'Room.Chars.Update':
                case 'Room.UpdateChar':
                case 'Room.Chars.Set':
                case 'Room.Chars.List':
                case 'Room.Chars':
                case 'Room.Char':
                case 'Mume.Client.Chars': {
                    const rawChars = Array.isArray(data) ? data : (data.chars || data.players || data.npcs || [data]);
                    const chars = rawChars.map((c: any) => {
                        if (typeof c === 'string') {
                            return { name: c, short: c, keyword: c, pc: namespace.toLowerCase().includes('player') };
                        }
                        const hadExplicitType = c.pc !== undefined || c.type !== undefined;
                        if (c.name && hadExplicitType) return c;
                        if (!c.desc && !c.name) return c;
                        const source = c.name || c.desc;
                        const words = source.trim().split(/[ \t,]/).filter(Boolean);
                        if (words.length === 0) return c;
                        const firstWord = words[0];
                        const startsWithArticle = /^(a|an|the|some)$/i.test(firstWord);
                        let extractedName = c.name || firstWord;
                        if (!c.name && startsWithArticle && words.length > 1) extractedName = words[1];
                        const sanitized = extractedName.replace(/[.,:;!]$/, '');
                        if (sanitized.length <= 1) return c;
                        const startsUpperCase = /^[A-Z\u00C0-\u00DE]/.test(sanitized);
                        const nameWords = sanitized.split(/\s+/).filter(Boolean);
                        const secondWord = nameWords[1] ?? '';
                        const looksLikePlayerName = nameWords.length === 1 || secondWord.toLowerCase() === 'the';
                        const inferredPc = !hadExplicitType ? (!startsWithArticle && startsUpperCase && looksLikePlayerName) : undefined;
                        
                        let finalPc = c.pc ?? inferredPc;
                        if (namespace.toLowerCase().includes('player')) finalPc = true;
                        if (namespace.toLowerCase().includes('npc')) finalPc = false;

                        return { ...c, name: sanitized, ...(finalPc !== undefined ? { pc: finalPc } : {}) };
                    });

                    const nsLower = namespace.toLowerCase();
                    const isFullSet = nsLower === 'room.chars.set' || nsLower === 'room.chars.list' || nsLower === 'room.chars' || nsLower === 'room.npcs' || nsLower === 'room.players' || nsLower === 'mume.client.chars';

                    if (isFullSet) {
                        const pcs: any[] = [];
                        const npcs: any[] = [];
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            if (c.pc || c.type === 'pc' || c.type === 'player') pcs.push(c);
                            else npcs.push(c);
                        });
                        gmcpBus.emit('Room.Players', Object.assign(pcs, { isSnooped }));
                        gmcpBus.emit('Room.Npcs', Object.assign(npcs, { isSnooped }));
                    } else {
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            const isPc = c.pc || c.type === 'pc' || c.type === 'player';
                            
                            const targetToSync = isSnooped ? spectateCharacterName : characterName;
                            if (c.name === targetToSync && c.position !== undefined) {
                                gmcpBus.emit('Char.Position', { ...c, isSnooped });
                                const posLower = c.position.toLowerCase();
                                if (isSnooped) setSpectateWaiting(posLower === 'waiting' || posLower.includes('waiting'));
                            }

                            if (isPc) gmcpBus.emit('Room.AddPlayer', { ...c, isSnooped });
                            else gmcpBus.emit('Room.AddNpc', { ...c, isSnooped });
                        });
                    }
                    break;
                }

                case 'room.chars.combat': {
                    gmcpBus.emit('Room.CharsCombat', Object.assign(data, { isSnooped }));
                    break;
                }
                case 'room.chars.remove':
                case 'room.char.remove':
                case 'room.removeplayer':
                case 'room.removenpc':
                case 'room.removechar': {
                    const id = typeof data === 'object' ? (data.id || data.name || data.short) : data;
                    if (id) {
                        gmcpBus.emit('Room.RemovePlayer', { id, isSnooped });
                        gmcpBus.emit('Room.RemoveNpc', { id, isSnooped });
                    }
                    break;
                }
                default:
                    return isExplicitGmcp;
            }
            return true;
        } catch (e) {
            return isExplicitGmcp;
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
