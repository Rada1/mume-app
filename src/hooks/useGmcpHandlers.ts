import React, { useCallback, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import {
    GmcpOccupant,
    GmcpCharVitals,
    GmcpRoomInfo,
    GmcpUpdateExits,
    GmcpRoomPlayers,
    GmcpRoomNpcs,
    GmcpRoomItems,
    MessageType,
    CombatHealthStatus,
    GmcpCharInfo,
    GroupMember,
    GmcpMumeEdit
} from '../types';
import { MapperRef } from '../components/Mapper/mapperTypes';

interface GmcpHandlersProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setDiscoveredItems: (items: string[]) => void;
    characterName: string | null;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void;
    setCharacterName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
    setRoomName: (name: string | null) => void;
    isMobileBrevityMode: boolean;
    setRoomExits: (exits: string[]) => void;
    setRoomZone: (zone: string | null) => void;
    setBufferName: (name: string | null) => void;
    setPlayerHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (status: CombatHealthStatus | null) => void;
    setBufferHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentName: (name: string | null) => void;
    characterInfo: import('../types').CharacterInfo;
    setCharacterInfo: React.Dispatch<React.SetStateAction<import('../types').CharacterInfo>>;
    opponentName: string | null;
    opponentId: string | null;
    setOpponentId: (id: string | null) => void;
    bufferName: string | null;
    roomPlayers: GmcpOccupant[];
    roomNpcs: GmcpOccupant[];
    suppressNextTextHeaderRef?: React.MutableRefObject<boolean>;
    setGroupMembers: React.Dispatch<React.SetStateAction<GroupMember[]>>;
    setMumeEditState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; text: string; key: string }>>;
    setWhoList: React.Dispatch<React.SetStateAction<string[]>>;
    setWhereList: React.Dispatch<React.SetStateAction<import('../types').WhereEntry[]>>;
    detectLighting?: (symbol: string | number) => void;
    playMovementSound?: (isRiding: boolean) => void;
    playDoorSound?: (isOpen: boolean) => void;
    playerPositionRef?: React.RefObject<string>;
    setIsRiding?: (val: boolean) => void;
    isRidingRef?: React.RefObject<boolean>;
    registerEntity?: (id: string, name: string, location: import('../types').EntityLocation, category?: string) => import('../types').GameEntity;
}

export const useGmcpHandlers = ({
    mapperRef,
    setCurrentTerrain,
    setRoomPlayers,
    setRoomNpcs,
    setRoomItems,
    setDiscoveredItems,
    characterName,
    setAbilities,
    addMessage,
    setCharacterName,
    setPlayerPosition,
    setRoomName,
    isMobileBrevityMode,
    setRoomExits,
    setRoomZone,
    setBufferName,
    setPlayerHealthStatus,
    setOpponentHealthStatus,
    setBufferHealthStatus,
    setOpponentName,
    characterInfo,
    setCharacterInfo,
    opponentName,
    opponentId,
    setOpponentId,
    bufferName,
    roomPlayers,
    roomNpcs,
    setGroupMembers,
    setMumeEditState,
    setWhoList,
    setWhereList,
    detectLighting,
    playMovementSound,
    playDoorSound,
    playerPositionRef: propsPlayerPositionRef,
    setIsRiding,
    isRidingRef,
    registerEntity
}: GmcpHandlersProps) => {

    const lastRoomNumRef = useRef<number | string | null>(null);
    const lastExitsRef = useRef<Record<string, any>>({});
    const playerPositionRef = propsPlayerPositionRef || useRef('standing');

    // --- Room Info & Exits ---

    const onRoomInfo = useCallback((data: GmcpRoomInfo) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));
        
        const roomNum = data.num || data.id || data.vnum;
        const roomChanged = roomNum !== undefined && roomNum !== lastRoomNumRef.current;
        lastRoomNumRef.current = roomNum ?? null;

        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
        if (data.name) setRoomName(data.name);
        
        let zone = data.zone || data.area;
        if (!zone && roomNum !== undefined && mapperRef.current?.preloadedCoordsRef?.current) {
            const staticData = mapperRef.current.preloadedCoordsRef.current[String(roomNum)];
            if (staticData && staticData[9]) {
                zone = staticData[9];
            }
        }
        if (zone) setRoomZone(zone);
        
        // Drive lighting from GMCP Room Info
        const light = data.light ?? data.l;
        if (light !== undefined && light !== null && detectLighting) {
            detectLighting(light);
        }

        if (data.exits) {
            setRoomExits(Object.keys(data.exits));
            lastExitsRef.current = data.exits;
        }

        if (roomChanged) {
            setRoomPlayers([]);
            setRoomNpcs([]);
            setRoomItems([]);
            setDiscoveredItems([]);
            if (playMovementSound) {
                const isRiding = isRidingRef?.current || playerPositionRef.current === 'riding' || playerPositionRef.current === 'mounted';
                playMovementSound(isRiding);
            }
        }
    }, [mapperRef, setCurrentTerrain, setRoomName, setRoomExits, setRoomZone, setRoomPlayers, setRoomNpcs, setRoomItems, setDiscoveredItems, playMovementSound]);

    const onRoomUpdateExits = useCallback((data: GmcpUpdateExits) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-update-exits', { detail: data }));
        if (data.exits) {
            console.log('[GMCP] Room.UpdateExits:', data.exits);
            // Door detection logic
            if (playDoorSound) {
                const oldExits = lastExitsRef.current;
                const newExits = data.exits;
                
                // Track total visible/open exits
                const getVisibleCount = (ex: Record<string, any>) => 
                    Object.values(ex).filter(v => v !== false && (typeof v !== 'object' || !v.flags?.includes('closed'))).length;
                
                const oldVisibleCount = getVisibleCount(oldExits);
                const newVisibleCount = getVisibleCount(newExits);
                
                console.log('[GMCP] Door Detection:', { oldVisibleCount, newVisibleCount, oldExits: Object.keys(oldExits), newExits: Object.keys(newExits) });

                if (newVisibleCount > oldVisibleCount) {
                    console.log('[GMCP] Triggering Door Open');
                    playDoorSound(true);
                } else if (newVisibleCount < oldVisibleCount) {
                    console.log('[GMCP] Triggering Door Close');
                    playDoorSound(false);
                }
            }

            lastExitsRef.current = data.exits;
            setRoomExits(Object.keys(data.exits));
        }
    }, [setRoomExits, playDoorSound]);

    // --- Character Status ---

    const findStatus = useCallback((str: string | undefined): CombatHealthStatus | null => {
        if (!str) return null;
        const s = str.toLowerCase();
        if (s.includes('healthy')) return 'Healthy';
        if (s.includes('fine')) return 'Fine';
        if (s.includes('hurt')) return 'Hurt';
        if (s.includes('wounded')) return 'Wounded';
        if (s.includes('bad')) return 'Badly Wounded';
        if (s.includes('awful')) return 'Awful';
        if (s.includes('stunned')) return 'Stunned';
        if (s.includes('dying') || s.includes('bleeding')) return 'Dying';
        return null;
    }, []);

    const getCharNameFromId = useCallback((id: string | null | undefined): string | null => {
        if (!id) return null;
        // Search in NPC objects
        const match = [...roomPlayers, ...roomNpcs].find(p => 
            p.id === id || p.name?.toLowerCase() === id.toLowerCase() || p.keyword?.toLowerCase() === id.toLowerCase()
        );
        return match?.name || match?.short || match?.keyword || id;
    }, [roomPlayers, roomNpcs]);

    const onCharVitals = useCallback((data: GmcpCharVitals) => {
        if (data.terrain) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
            }
            setCurrentTerrain(data.terrain);
        }

        if (data.light !== undefined && data.light !== null && detectLighting) {
            detectLighting(data.light);
        }

        if (data.position) {
            console.log('[GMCP] Position Update:', data.position);
            // Don't let 'standing' stomp 'riding' because MUME often says 'standing' while mounted.
            const isCurrentlyRiding = playerPositionRef.current === 'riding' || playerPositionRef.current === 'mounted';
            if (data.position === 'standing' && isCurrentlyRiding) {
                console.log('[GMCP] Ignoring position:standing because we are riding');
            } else {
                setPlayerPosition(data.position);
                playerPositionRef.current = data.position;
            }
        }

        // --- Combat Info via Vitals ---
        if (data.hp_status) {
            setPlayerHealthStatus(findStatus(data.hp_status));
        }

        if (data.opponent !== undefined) {
            const oppId = data.opponent;
            setOpponentId(oppId);
            const oppName = getCharNameFromId(oppId);
            setOpponentName(oppName);
            if (!oppName && !oppId) setOpponentHealthStatus(null);
        }

        if (data.buff !== undefined) {
            const buffName = getCharNameFromId(data.buff);
            setBufferName(buffName);
            if (!buffName) setBufferHealthStatus(null);
        }
        console.log('[GMCP] CharVitals:', data);
    }, [setCurrentTerrain, setPlayerHealthStatus, setOpponentId, setOpponentName, setOpponentHealthStatus, setBufferName, setBufferHealthStatus, setPlayerPosition, roomPlayers, roomNpcs, findStatus, getCharNameFromId]);

    const onCharInfo = useCallback((data: GmcpCharInfo) => {
        console.log('[GMCP] CharInfo:', data);
        setCharacterInfo(prev => ({
            ...prev,
            name: data.name ?? data.fullname ?? prev.name,
            level: data.level !== undefined ? Number(data.level) : prev.level,
            xp: data.xp !== undefined ? Number(data.xp) : prev.xp,
            xpMax: data.xp_max !== undefined ? Number(data.xp_max) : (data['next-level-xp'] !== undefined ? Number(data['next-level-xp']) : prev.xpMax),
            tp: data.tp !== undefined ? Number(data.tp) : prev.tp,
            tpMax: data.tp_max !== undefined ? Number(data.tp_max) : (data['next-level-tp'] !== undefined ? Number(data['next-level-tp']) : prev.tpMax),
            race: data.race ?? prev.race,
            subrace: data.subrace ?? prev.subrace,
            subclass: data.subclass ?? prev.subclass,
            class: data.class ?? prev.class,
            gold: data.gold !== undefined ? Number(data.gold) : prev.gold,
            description: data.description ?? prev.description,
            whois: data.whois ?? prev.whois
        }));
    }, [setCharacterInfo]);

    const onRoomCharsCombat = useCallback((data: any[]) => {
        if (!Array.isArray(data)) return;

        data.forEach(char => {
            const status = findStatus(char.health || char.condition || char.hp_status || char.status);
            if (!status) return;

            // Prioritize ID match for opponent
            if (opponentId && char.id === opponentId) {
                setOpponentHealthStatus(status);
            } else if (opponentName && !opponentId) {
                // Fallback to name match if no ID yet (only if no direct ID match exists)
                const name = char.name || char.short || char.keyword;
                if (name && (name.toLowerCase() === opponentName.toLowerCase())) {
                    setOpponentHealthStatus(status);
                }
            }

            // Buffer match
            if (bufferName) {
                 const name = char.name || char.short || char.keyword;
                 if (name && (name.toLowerCase() === bufferName.toLowerCase())) {
                    setBufferHealthStatus(status);
                 }
            }
        });
    }, [findStatus, opponentName, opponentId, bufferName, setOpponentHealthStatus, setBufferHealthStatus]);

    // --- Room Occupants & Items ---

    const onRoomPlayers = useCallback((data: GmcpRoomPlayers) => {
        let rawList = Array.isArray(data) ? data : ((data as any).players || (data as any).members || (data as any).chars || (data as any).char || (data as any).npcs || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) return;
        
        console.log('[GMCP] Room.Players parsed:', rawList.length, 'items');

        const pcList: GmcpOccupant[] = [];
        const npcList: GmcpOccupant[] = [];

        rawList.forEach(p => {
            const obj: GmcpOccupant = typeof p === 'string' || typeof p === 'number'
                ? { name: String(p), keyword: String(p), short: String(p) } 
                : { ...p, name: p.name || p.keyword || p.short || p.shortdesc };
            if (!obj.name) return;
            if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return;

            const isPc = typeof p !== 'string' && typeof p !== 'number' && (p.pc || p.type === 'pc' || p.type === 'player');
            if (isPc) {
                pcList.push(obj);
                if (registerEntity) {
                    const id = obj.id ? String(obj.id) : `roomplayers:${obj.name}`;
                    registerEntity(id, obj.name, 'roomplayers', 'inlineplayer');
                }
            }
            else {
                npcList.push(obj);
                if (registerEntity) {
                    const id = obj.id ? String(obj.id) : `roomnpcs:${obj.name}`;
                    registerEntity(id, obj.name, 'roomnpcs', 'inlinenpc');
                }
            }
        });

        setRoomPlayers(pcList);
        if (npcList.length > 0) {
            setRoomNpcs(prev => {
                const next = [...prev];
                npcList.forEach(n => {
                    const idStr = n.id !== undefined && n.id !== null ? String(n.id) : null;
                    const nameStr = n.name || n.keyword || n.short;
                    const idx = idStr 
                        ? next.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
                        : next.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
                    if (idx >= 0) next[idx] = { ...next[idx], ...n };
                    else next.push(n);
                });
                return next;
            });
        }
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity]);

    const onRoomNpcs = useCallback((data: GmcpRoomNpcs) => {
        let rawList = Array.isArray(data) ? data : ((data as any).npcs || (data as any).chars || (data as any).members || (data as any).char || (data as any).players || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) return;

        console.log('[GMCP] Room.Npcs parsed:', rawList.length, 'items');

        const npcs: GmcpOccupant[] = [];
        const players: GmcpOccupant[] = [];

        rawList.forEach(p => {
            const shortStr = (typeof p === 'string' ? p : (p.short || p.shortdesc || p.name || '')).toLowerCase();
            if (shortStr.includes('ridden by you')) {
                console.log('[GMCP] Detected Riding from NPC:', shortStr);
                if (setIsRiding) setIsRiding(true);
            }

            const obj: GmcpOccupant = typeof p === 'string' || typeof p === 'number'
                ? { name: String(p), keyword: String(p), short: String(p) } 
                : { ...p, name: p.name || p.keyword || p.short || p.shortdesc };

            if (!obj.name) return;
            if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return;

            const isPc = typeof p !== 'string' && typeof p !== 'number' && (p.pc || p.type === 'pc' || p.type === 'player');
            if (isPc) {
                players.push(obj);
                if (registerEntity) {
                    const id = obj.id ? String(obj.id) : `roomplayers:${obj.name}`;
                    registerEntity(id, obj.name, 'roomplayers', 'inlineplayer');
                }
            }
            else {
                npcs.push(obj);
                if (registerEntity) {
                    const id = obj.id ? String(obj.id) : `roomnpcs:${obj.name}`;
                    registerEntity(id, obj.name, 'roomnpcs', 'inlinenpc');
                }
            }
        });

        setRoomNpcs(npcs);
        if (players.length > 0) {
            setRoomPlayers(prev => {
                const next = [...prev];
                players.forEach(p => {
                    const idStr = p.id !== undefined && p.id !== null ? String(p.id) : null;
                    const nameStr = p.name || p.keyword || p.short;
                    const idx = idStr 
                        ? next.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
                        : next.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
                    
                    if (idx >= 0) next[idx] = { ...next[idx], ...p };
                    else next.push(p);
                });
                return next;
            });
        }
    }, [setRoomNpcs, setRoomPlayers, setIsRiding, characterName, registerEntity]);

    const onRoomItems = useCallback((data: GmcpRoomItems) => {
        let rawList = Array.isArray(data) ? data : ((data as any).items || (data as any).objects || (data as any).obj || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) return;

        const items: GmcpOccupant[] = rawList.map(i => {
            const obj = typeof i === 'string' ? { name: i, keyword: i, short: i } : { ...i, name: i.name || i.short || i.shortdesc || i.keyword };
            if (registerEntity && obj.name) {
                const id = (obj as any).id ? String((obj as any).id) : `roomitems:${obj.name}`;
                registerEntity(id, obj.name, 'roomitems', 'inline-obj-room');
            }
            return obj;
        });
        setRoomItems(items);
    }, [setRoomItems, registerEntity]);

    const onAddPlayer = useCallback((data: any) => {
        if (!data) return;
        const obj: GmcpOccupant = typeof data === 'string' || typeof data === 'number'
            ? { name: String(data), keyword: String(data), short: String(data) } 
            : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };
        
        if (!obj.name) return;
        if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return;

        const isExplicitPc = typeof data === 'object' && (data.pc || data.type === 'pc' || data.type === 'player');
        const isExplicitNpc = typeof data === 'object' && (data.npc || data.type === 'npc');

        const idStr = (obj.id !== undefined && obj.id !== null) ? String(obj.id) : null;
        const nameStr = obj.name || obj.keyword || obj.short;

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };

        // If it's explicitly an NPC even though it's in the player list (rare but possible in some MUD protocols)
        if (isExplicitNpc && !isExplicitPc) {
            setRoomPlayers(prev => prev.filter(filterFn));
            if (registerEntity) {
                const id = idStr || `roomnpcs:${obj.name}`;
                registerEntity(id, obj.name, 'roomnpcs', 'inlinenpc');
            }
            setRoomNpcs(prev => {
                const idx = idStr 
                    ? prev.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
                    : prev.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...obj };
                    return next;
                }
                return [...prev, obj];
            });
            return;
        }

        setRoomNpcs(prev => prev.filter(filterFn)); // Cross-remove to ensure uniqueness
        
        if (registerEntity && obj.name) {
            const id = idStr || `roomplayers:${obj.name}`;
            registerEntity(id, obj.name, 'roomplayers', 'inlineplayer');
        }

        setRoomPlayers(prev => {
            const idx = idStr 
                ? prev.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
                : prev.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
            
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...obj };
                return next;
            }
            return [...prev, obj];
        });
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity]);

    const onAddNpc = useCallback((data: any) => {
        if (!data) return;
        const obj: GmcpOccupant = typeof data === 'string' || typeof data === 'number'
            ? { name: String(data), keyword: String(data), short: String(data) } 
            : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };
        
        if (!obj.name) return;
        if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return;

        const isExplicitPc = typeof data === 'object' && (data.pc || data.type === 'pc' || data.type === 'player');

        const idStr = (obj.id !== undefined && obj.id !== null) ? String(obj.id) : null;
        const nameStr = obj.name || obj.keyword || obj.short;

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };

        // If it's explicitly a player even though it came through the NPC handler
        if (isExplicitPc) {
            setRoomNpcs(prev => prev.filter(filterFn));
            if (registerEntity) {
                const id = idStr || `roomplayers:${obj.name}`;
                registerEntity(id, obj.name, 'roomplayers', 'inlineplayer');
            }
            setRoomPlayers(prev => {
                const idx = idStr 
                    ? prev.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
                    : prev.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...obj };
                    return next;
                }
                return [...prev, obj];
            });
            return;
        }

        setRoomPlayers(prev => prev.filter(filterFn)); // Cross-remove to ensure uniqueness

        if (registerEntity && obj.name) {
            const id = idStr || `roomnpcs:${obj.name}`;
            registerEntity(id, obj.name, 'roomnpcs', 'inlinenpc');
        }

        setRoomNpcs(prev => {
            const idx = idStr 
                ? prev.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
                : prev.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
            
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...obj };
                return next;
            }
            return [...prev, obj];
        });
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity]);

    const onRemovePlayer = useCallback((data: any) => {
        if (!data) return;
        const id = (data && typeof data === 'object' && data !== null) ? data.id : data;
        const name = (data && typeof data === 'object' && data !== null) ? (data.name || data.keyword || data.short) : data;
        const idStr = (id !== undefined && id !== null) ? String(id) : null;
        const nameStr = (name !== undefined && name !== null && String(name) !== idStr) ? String(name) : (typeof name === 'string' ? name : null);

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };
        setRoomPlayers(prev => prev.filter(filterFn));
        setRoomNpcs(prev => prev.filter(filterFn));
        
        // Trigger map re-render
        if (mapperRef.current?.triggerRender) {
            mapperRef.current.triggerRender();
        }
    }, [setRoomPlayers, setRoomNpcs, mapperRef]);

    const onRemoveNpc = useCallback((data: any) => {
        if (!data) return;
        const id = (data && typeof data === 'object' && data !== null) ? data.id : data;
        const name = (data && typeof data === 'object' && data !== null) ? (data.name || data.keyword || data.short) : data;
        const idStr = (id !== undefined && id !== null) ? String(id) : null;
        const nameStr = (name !== undefined && name !== null && String(name) !== idStr) ? String(name) : (typeof name === 'string' ? name : null);

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };
        setRoomPlayers(prev => prev.filter(filterFn));
        setRoomNpcs(prev => prev.filter(filterFn));

        // Trigger map re-render
        if (mapperRef.current?.triggerRender) {
            mapperRef.current.triggerRender();
        }
    }, [setRoomPlayers, setRoomNpcs, mapperRef]);

    // --- Character Identity ---

    const onCharNameChange = useCallback((name: string | null) => {
        if (characterName && name !== characterName) {
            setAbilities({});
            const msg = `Character changed to ${name}. Abilities reset.`;
            addMessage('system', msg, undefined, undefined, undefined, { textOnly: msg, lower: msg.toLowerCase() });
        }
        setCharacterName(name);
    }, [characterName, setAbilities, addMessage, setCharacterName]);
    
    const onComm = useCallback((_sender: string, _chan: string, _msg: string) => {
        // Comm messages arrive via plain text through processLine; the GMCP metadata
        // (sender, chan) is forwarded via pendingGmcpCommRef in GameContext before the
        // text line is processed, so no addMessage call is needed here.
    }, []);
    
    // --- Group Handlers ---

    /** Normalizes a raw group member: coerces id to number, resolves mapid */
    const normalizeGroupMember = (raw: any): GroupMember => {
        // Coerce id to number for consistent comparisons
        const id = raw.id !== undefined && raw.id !== null ? Number(raw.id) : raw.id;

        // Try dedicated ID fields first; only fall back to raw.room if it's numeric (not a name string)
        const candidates = [raw.mapid, raw.roomid, raw.room_id, raw.rid, raw.vnum, raw.map_id];
        let mapid: number | undefined = undefined;
        for (const c of candidates) {
            if (c !== undefined && c !== null) { mapid = Number(c); break; }
        }
        if (mapid === undefined && raw.room !== undefined && raw.room !== null && !isNaN(Number(raw.room))) {
            mapid = Number(raw.room);
        }
        console.log('[Group Member] raw keys:', Object.keys(raw), '| id:', id, '| resolved mapid:', mapid, '| fighting:', raw.fighting, '| raw:', JSON.stringify(raw));
        return { ...raw, id, mapid: (mapid !== undefined && !isNaN(mapid)) ? mapid : undefined };
    };

    const onGroupAdd = useCallback((data: GroupMember) => {
        console.log('[GMCP] onGroupAdd raw:', JSON.stringify(data));
        const member = normalizeGroupMember(data);
        // MUME marks self with type:'you' — filter it out
        if (member.type === 'you') return;
        // Also fall back to name comparison in case type is missing
        if (characterName && member.name && member.name.toLowerCase() === characterName.toLowerCase()) return;
        setGroupMembers(prev => {
            if (prev.find(m => String(m.id) === String(member.id))) return prev;
            return [...prev, member];
        });
    }, [setGroupMembers, characterName]);

    const onGroupUpdate = useCallback((data: any) => {
        console.log('[GMCP] onGroupUpdate raw:', JSON.stringify(data));
        const updates = normalizeGroupMember(data);
        setGroupMembers(prev => prev.map(m => {
            if (String(m.id) === String(updates.id)) {
                const merged = { ...m, ...updates };
                // Preserve mapid if the update omits it
                if (updates.mapid === undefined && m.mapid !== undefined) {
                    merged.mapid = m.mapid;
                }
                // Preserve fighting state if the update omits it (MUME only sends this in combat-state packets)
                if (updates.fighting === undefined && m.fighting !== undefined) {
                    merged.fighting = m.fighting;
                }
                return merged;
            }
            return m;
        }));
    }, [setGroupMembers]);

    const onGroupRemove = useCallback((id: number) => {
        console.log('[GMCP] onGroupRemove id:', id);
        setGroupMembers(prev => prev.filter(m => String(m.id) !== String(id)));
    }, [setGroupMembers]);

    const onGroupSet = useCallback((data: GroupMember[]) => {
        console.log('[GMCP] onGroupSet raw:', JSON.stringify(data));
        const members = Array.isArray(data) ? data.map(normalizeGroupMember) : [];
        // Filter out self: MUME marks own character with type:'you'.
        // Fall back to name comparison for servers that omit the type field.
        const others = members.filter(m => {
            if (m.type === 'you') return false;
            if (characterName && m.name && m.name.toLowerCase() === characterName.toLowerCase()) return false;
            return true;
        });
        setGroupMembers(others);
    }, [setGroupMembers, characterName]);

    const onCharRide = useCallback((data: any) => {
        console.log('[GMCP] Char.Ride:', data);
        // MUME sends empty object or nullish when dismounted, or { "mount": "..." } when mounted.
        const riding = data && (data.mount || data.mount_name || data.riding);
        if (riding) {
            if (setIsRiding) setIsRiding(true);
        } else {
            if (setIsRiding) setIsRiding(false);
        }
    }, [setIsRiding]);

    return {
        onRoomInfo,
        onRoomUpdateExits,
        onRoomPlayers,
        onRoomNpcs,
        onRoomItems,
        onAddPlayer,
        onAddNpc,
        onRemovePlayer,
        onRemoveNpc,
        onCharNameChange,
        onCharInfo,
        onBufferChange: (name: string | null) => setBufferName(name),
        onCharVitals,
        onComm,
        onRoomCharsCombat,
        onPositionChange: (pos: string) => setPlayerPosition(pos),
        onGroupAdd,
        onGroupUpdate,
        onGroupRemove,
        onGroupSet,
        onMumeEdit: (data: GmcpMumeEdit) => {
            if (data && data.key) {
                setMumeEditState({
                    isOpen: true,
                    title: data.title || 'Mume Editor',
                    text: data.text || '',
                    key: data.key
                });
            }
        },
        onDisconnect: () => {
            setCharacterName(null);
            setGroupMembers([]);
            setRoomPlayers([]);
            setRoomNpcs([]);
            setRoomItems([]);
            setWhoList([]);
            setWhereList([]);
        },
        onCharRide
    };
};
