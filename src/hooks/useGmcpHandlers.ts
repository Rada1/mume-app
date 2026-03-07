import { useCallback } from 'react';
import {
    GmcpOccupant,
    GmcpCharVitals,
    GmcpRoomInfo,
    GmcpUpdateExits,
    GmcpRoomPlayers,
    GmcpRoomNpcs,
    GmcpRoomItems,
    MessageType
} from '../types';
import { MapperRef } from '../components/Mapper/mapperTypes';

interface GmcpHandlersProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<string[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<string[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<string[]>>;
    characterName: string | null;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }) => void;
    setCharacterName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
    setRoomName: (name: string | null) => void;
}

export const useGmcpHandlers = ({
    mapperRef,
    setCurrentTerrain,
    setRoomPlayers,
    setRoomNpcs,
    setRoomItems,
    characterName,
    setAbilities,
    addMessage,
    setCharacterName,
    setPlayerPosition,
    setRoomName
}: GmcpHandlersProps) => {

    // --- Room Info & Exits ---

    const onRoomInfo = useCallback((data: GmcpRoomInfo) => {
        mapperRef.current?.handleRoomInfo(data);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));
        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
        if (data.name) setRoomName(data.name);
    }, [mapperRef, setCurrentTerrain, setRoomName]);

    const onRoomUpdateExits = useCallback((data: GmcpUpdateExits) => {
        mapperRef.current?.handleUpdateExits(data);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-update-exits', { detail: data }));
    }, [mapperRef]);

    // --- Character Status ---

    const onCharVitals = useCallback((data: GmcpCharVitals) => {
        if (data.terrain) {
            mapperRef.current?.handleTerrain(data.terrain);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
            setCurrentTerrain(data.terrain);
        }
    }, [mapperRef, setCurrentTerrain]);

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
        setRoomPlayers(Array.from(new Set(players)));
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

        setRoomNpcs(Array.from(new Set(npcs)));
        if (players.length > 0) setRoomPlayers(prev => Array.from(new Set([...prev, ...players])));
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
        if (names.length > 0) setRoomPlayers(prev => Array.from(new Set([...prev, ...names])));
    }, [setRoomPlayers]);

    const onAddNpc = useCallback((data: string | GmcpOccupant) => {
        if (typeof data === 'string') {
            setRoomNpcs(prev => prev.includes(data) ? prev : [...prev, data]);
        } else {
            const names = [data.name || data.keyword, data.short, data.shortdesc].filter(Boolean) as string[];
            if (names.length === 0) return;

            const isPc = data.pc || data.type === 'pc' || data.type === 'player';
            if (isPc) {
                setRoomPlayers(prev => Array.from(new Set([...prev, ...names])));
            } else {
                setRoomNpcs(prev => Array.from(new Set([...prev, ...names])));
            }
        }
    }, [setRoomNpcs, setRoomPlayers]);

    const onRemovePlayer = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : (data.name || data.keyword || data.short);
        if (name) {
            setRoomPlayers(prev => prev.filter(p => p !== name));
            setRoomNpcs(prev => prev.filter(p => p !== name));
        }
    }, [setRoomPlayers, setRoomNpcs]);

    const onRemoveNpc = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : (data.name || data.keyword || data.short);
        if (name) {
            setRoomNpcs(prev => prev.filter(p => p !== name));
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
        onCharVitals,
        onRoomPlayers,
        onRoomNpcs,
        onRoomItems,
        onAddPlayer,
        onAddNpc,
        onRemovePlayer,
        onRemoveNpc,
        onCharNameChange,
        onPositionChange: (pos: string) => setPlayerPosition(pos)
    };
};
