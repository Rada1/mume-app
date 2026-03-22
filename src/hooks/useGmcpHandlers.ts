import { useCallback, useRef, Dispatch, SetStateAction } from 'react';
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
    detectLighting
}: GmcpHandlersProps) => {

    const lastRoomNumRef = useRef<number | string | null>(null);

    // --- Room Info & Exits ---

    const onRoomInfo = useCallback((data: GmcpRoomInfo) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));
        
        const roomNum = data.num || data.id || data.vnum;
        const roomChanged = roomNum !== undefined && roomNum !== lastRoomNumRef.current;
        lastRoomNumRef.current = roomNum ?? null;

        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
        if (data.name) setRoomName(data.name);
        
        // Drive lighting from GMCP Room Info
        const light = data.light ?? data.l;
        if (light !== undefined && light !== null && detectLighting) {
            detectLighting(light);
        }

        if (data.exits) {
            setRoomExits(Object.keys(data.exits));
        }

        if (roomChanged) {
            setRoomPlayers([]);
            setRoomNpcs([]);
            setRoomItems([]);
            setDiscoveredItems([]);
        }
    }, [mapperRef, setCurrentTerrain, setRoomName, setRoomExits, setRoomPlayers, setRoomNpcs, setRoomItems, setDiscoveredItems]);

    const onRoomUpdateExits = useCallback((data: GmcpUpdateExits) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-update-exits', { detail: data }));
        if (data.exits) {
            setRoomExits(Object.keys(data.exits));
        }
    }, [setRoomExits]);

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
    }, [setCurrentTerrain, setPlayerHealthStatus, setOpponentName, setOpponentHealthStatus, setBufferName, setBufferHealthStatus, roomPlayers, roomNpcs, findStatus, getCharNameFromId]);

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
        const players: GmcpOccupant[] = data.map(p => {
            if (typeof p === 'string') return { name: p, keyword: p, short: p };
            return {
                ...p,
                name: p.name || p.keyword || p.short || p.shortdesc
            };
        });
        setRoomPlayers(players);
    }, [setRoomPlayers]);

    const onRoomNpcs = useCallback((data: GmcpRoomNpcs) => {
        const npcs: GmcpOccupant[] = [];
        const players: GmcpOccupant[] = [];

        data.forEach(p => {
            const obj: GmcpOccupant = typeof p === 'string' 
                ? { name: p, keyword: p, short: p } 
                : { ...p, name: p.name || p.keyword || p.short || p.shortdesc };

            if (!obj.name) return;

            const isPc = typeof p !== 'string' && (p.pc || p.type === 'pc' || p.type === 'player');
            if (isPc) players.push(obj);
            else npcs.push(obj);
        });

        setRoomNpcs(npcs);
        if (players.length > 0) {
            setRoomPlayers(prev => [...prev, ...players]);
        }
    }, [setRoomNpcs, setRoomPlayers]);

    const onRoomItems = useCallback((data: GmcpRoomItems) => {
        const items: GmcpOccupant[] = data.map(i => {
            if (typeof i === 'string') return { name: i, keyword: i, short: i };
            return { ...i, name: i.name || i.short || i.shortdesc || i.keyword };
        });
        setRoomItems(items);
    }, [setRoomItems]);

    const onAddPlayer = useCallback((data: string | GmcpOccupant) => {
        const obj: GmcpOccupant = typeof data === 'string' 
            ? { name: data, keyword: data, short: data } 
            : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };
        setRoomPlayers(prev => [...prev, obj]);
    }, [setRoomPlayers]);

    const onAddNpc = useCallback((data: string | GmcpOccupant) => {
        const obj: GmcpOccupant = typeof data === 'string' 
            ? { name: data, keyword: data, short: data } 
            : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };
        setRoomNpcs(prev => [...prev, obj]);
    }, [setRoomNpcs]);

    const onRemovePlayer = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : (data.name || data.keyword || data.short);
        if (!name) return;
        setRoomPlayers(prev => prev.filter(p => (p.name || p.keyword || p.short) !== name));
    }, [setRoomPlayers]);

    const onRemoveNpc = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : (data.name || data.keyword || data.short);
        if (!name) return;
        setRoomNpcs(prev => prev.filter(p => (p.name || p.keyword || p.short) !== name));
    }, [setRoomNpcs]);

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

    /** Normalizes a raw group member: resolves room ID from whatever field MUME uses -> mapid */
    const normalizeGroupMember = (raw: any): GroupMember => {
        const mapid = raw.mapid ?? raw.room ?? raw.roomid ?? raw.room_id ?? raw.rid ?? raw.vnum ?? raw.map_id ?? undefined;
        console.log('[Group Member] raw keys:', Object.keys(raw), '| resolved mapid:', mapid, '| raw:', JSON.stringify(raw));
        return { ...raw, mapid: mapid !== undefined ? Number(mapid) : undefined };
    };

    const onGroupAdd = useCallback((data: GroupMember) => {
        console.log('[GMCP] onGroupAdd raw:', JSON.stringify(data));
        const member = normalizeGroupMember(data);
        // MUME marks self with type:'you' — filter it out
        if (member.type === 'you') return;
        // Also fall back to name comparison in case type is missing
        if (characterName && member.name && member.name.toLowerCase() === characterName.toLowerCase()) return;
        setGroupMembers(prev => {
            if (prev.find(m => m.id === member.id)) return prev;
            return [...prev, member];
        });
    }, [setGroupMembers, characterName]);

    const onGroupUpdate = useCallback((data: any) => {
        console.log('[GMCP] onGroupUpdate raw:', JSON.stringify(data));
        const updates = normalizeGroupMember(data);
        setGroupMembers(prev => prev.map(m => {
            if (m.id === updates.id) {
                // Persistent Location Fix: If the update doesn't have a mapid/room but the existing state does, KEEP IT.
                // MUME often omits location in health/status updates, which was causing dots to vanish.
                const merged = { ...m, ...updates };
                if (updates.mapid === undefined && m.mapid !== undefined) {
                    merged.mapid = m.mapid;
                }
                return merged;
            }
            return m;
        }));
    }, [setGroupMembers]);

    const onGroupRemove = useCallback((id: number) => {
        console.log('[GMCP] onGroupRemove id:', id);
        setGroupMembers(prev => prev.filter(m => m.id !== id));
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
            setGroupMembers([]);
            setRoomPlayers([]);
            setRoomNpcs([]);
            setRoomItems([]);
            setWhoList([]);
            setWhereList([]);
        }
    };

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
        onMumeEdit: (data: import('../types').GmcpMumeEdit) => {
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
            setGroupMembers([]);
            setRoomPlayers([]);
            setRoomNpcs([]);
            setRoomItems([]);
            setWhoList([]);
            setWhereList([]);
        }
    };
};
