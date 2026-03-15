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
    GmcpCharInfo
} from '../types';
import { MapperRef } from '../components/Mapper/mapperTypes';

interface GmcpHandlersProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<string[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<string[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<string[]>>;
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
    bufferName: string | null;
    roomPlayers: string[];
    roomNpcs: string[];
    suppressNextTextHeaderRef?: React.MutableRefObject<boolean>;
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
    bufferName,
    roomPlayers,
    roomNpcs
}: GmcpHandlersProps) => {

    // --- Room Info & Exits ---

    const onRoomInfo = useCallback((data: GmcpRoomInfo) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));
        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
        if (data.name) setRoomName(data.name);
        if (data.exits) {
            setRoomExits(Object.keys(data.exits));
        }
        setDiscoveredItems([]);
    }, [mapperRef, setCurrentTerrain, setRoomName, setRoomExits, setDiscoveredItems]);

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
        // Search in roomPlayers (which contains names) and roomNpcs (which contains names/keywords)
        const match = [...roomPlayers, ...roomNpcs].find(name => 
            name.toLowerCase() === id.toLowerCase() || 
            id.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(id.toLowerCase())
        );
        return match || id;
    }, [roomPlayers, roomNpcs]);

    const onCharVitals = useCallback((data: GmcpCharVitals) => {
        if (data.terrain) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
            }
            setCurrentTerrain(data.terrain);
        }

        // --- Combat Info via Vitals ---
        if (data.hp_status) {
            setPlayerHealthStatus(findStatus(data.hp_status));
        }

        if (data.opponent !== undefined) {
            const oppName = getCharNameFromId(data.opponent);
            setOpponentName(oppName);
            if (!oppName) setOpponentHealthStatus(null);
        }

        if (data.buff !== undefined) {
            const buffName = getCharNameFromId(data.buff);
            setBufferName(buffName);
            if (!buffName) setBufferHealthStatus(null);
        }
    }, [setCurrentTerrain, setPlayerHealthStatus, setOpponentName, setOpponentHealthStatus, setBufferName, setBufferHealthStatus, roomPlayers, roomNpcs, findStatus, getCharNameFromId]);

    const onCharInfo = useCallback((data: GmcpCharInfo) => {
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
            gold: data.gold !== undefined ? Number(data.gold) : prev.gold
        }));
    }, [setCharacterInfo]);

    const onRoomCharsCombat = useCallback((data: any[]) => {
        // Find opponent/buffer in room.chars to get their condition
        // This is called when Room.Chars (NPCs/Mobs) updates
        if (!Array.isArray(data)) return;

        // We need to know who we are fighting (opponentName) and who is buffering (bufferName)
        // These are set by onCharVitals (GMCP) or the parser.
        // But GMCP Char.Vitals only gives us IDs/Keywords usually.
        
        // Let's check for matches in the room data
        data.forEach(char => {
            const name = char.name || char.short || char.keyword;
            if (!name) return;

            const status = findStatus(char.health || char.status);
            if (!status) return;

            // Update opponent health if it matches
            // (Comparing names/keywords is a bit fuzzy but necessary if IDs aren't consistent)
            // Ideally we'd match on ID, but GmcpDecoder.ts doesn't store the opponent ID yet.
            if (opponentName && (name.toLowerCase() === opponentName.toLowerCase() || opponentName.toLowerCase().includes(name.toLowerCase()))) {
                setOpponentHealthStatus(status);
            }
            // Update buffer health if it matches
            if (bufferName && (name.toLowerCase() === bufferName.toLowerCase() || bufferName.toLowerCase().includes(name.toLowerCase()))) {
                setBufferHealthStatus(status);
            }
        });
    }, [findStatus, opponentName, bufferName, setOpponentHealthStatus, setBufferHealthStatus]);

    // --- Room Occupants & Items ---

    const onRoomPlayers = useCallback((data: GmcpRoomPlayers) => {
        const players: string[] = [];
        data.forEach(p => {
            if (typeof p === 'string') {
                players.push(p);
            } else {
                const names = [p.name, p.keyword, p.short, p.shortdesc].filter(Boolean) as string[];
                players.push(...names);
            }
        });
        const uniquePlayers = Array.from(new Set(players));
        setRoomPlayers(uniquePlayers);
    }, [setRoomPlayers]);

    const onRoomNpcs = useCallback((data: GmcpRoomNpcs) => {
        const npcs: string[] = [];
        const players: string[] = [];

        data.forEach(p => {
            if (typeof p === 'string') {
                npcs.push(p);
            } else {
                const names = [p.name || p.keyword, p.short, p.shortdesc].filter(Boolean) as string[];
                if (names.length === 0) return;

                const isPc = p.pc || p.type === 'pc' || p.type === 'player';
                if (isPc) {
                    players.push(...names);
                } else {
                    npcs.push(...names);
                }
            }
        });

        const uniqueNpcs = Array.from(new Set(npcs));
        setRoomNpcs(uniqueNpcs);
        if (players.length > 0) {
            const uniquePlayers = Array.from(new Set(players));
            setRoomPlayers(prev => Array.from(new Set([...prev, ...uniquePlayers])));
        }
    }, [setRoomNpcs, setRoomPlayers]);

    const onRoomItems = useCallback((data: GmcpRoomItems) => {
        const items = data.flatMap(i => {
            if (typeof i === 'string') return [i];
            return [i.name, i.short, i.shortdesc, i.keyword].filter(Boolean) as string[];
        });
        setRoomItems(Array.from(new Set(items)));
    }, [setRoomItems]);

    const onAddPlayer = useCallback((data: string | GmcpOccupant) => {
        const names = typeof data === 'string' ? [data] : [data.name, data.keyword, data.short].filter(Boolean) as string[];
        if (names.length > 0) {
            setRoomPlayers(prev => {
                const next = Array.from(new Set([...prev, ...names]));
                return next;
            });
        }
    }, [setRoomPlayers]);

    const onAddNpc = useCallback((data: string | GmcpOccupant) => {
        if (typeof data === 'string') {
            setRoomNpcs(prev => prev.includes(data) ? prev : [...prev, data]);
        } else {
            const names = [data.name || data.keyword, data.short, data.shortdesc].filter(Boolean) as string[];
            if (names.length === 0) return;

            const isPc = data.pc || data.type === 'pc' || data.type === 'player';
            if (isPc) {
                setRoomPlayers(prev => {
                    const next = Array.from(new Set([...prev, ...names]));
                    return next;
                });
            } else {
                setRoomNpcs(prev => {
                    const next = Array.from(new Set([...prev, ...names]));
                    return next;
                });
            }
        }
    }, [setRoomNpcs, setRoomPlayers]);

    const onRemovePlayer = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : (data.name || data.keyword || data.short);
        if (name) {
            setRoomPlayers(prev => {
                const next = prev.filter(p => p !== name);
                return next;
            });
            setRoomNpcs(prev => prev.filter(p => p !== name));
        }
    }, [setRoomPlayers, setRoomNpcs]);

    const onRemoveNpc = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : (data.name || data.keyword || data.short);
        if (name) {
            setRoomNpcs(prev => {
                const next = prev.filter(p => p !== name);
                return next;
            });
            setRoomPlayers(prev => prev.filter(p => p !== name));
        }
    }, [setRoomNpcs, setRoomPlayers]);

    // --- Character Identity ---

    const onCharNameChange = useCallback((name: string | null) => {
        if (characterName && name !== characterName) {
            setAbilities({});
            const msg = `Character changed to ${name}. Abilities reset.`;
            addMessage('system', msg, undefined, undefined, undefined, { textOnly: msg, lower: msg.toLowerCase() });
        }
        setCharacterName(name);
    }, [characterName, setAbilities, addMessage, setCharacterName]);
    
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
        onRoomCharsCombat,
        onPositionChange: (pos: string) => setPlayerPosition(pos)
    };
};
