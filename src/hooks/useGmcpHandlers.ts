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
    addMessage: (type: MessageType, text: string) => void;
    setCharacterName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
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
    setPlayerPosition
}: GmcpHandlersProps) => {

    // --- Room Info & Exits ---

    const onRoomInfo = useCallback((data: GmcpRoomInfo) => {
        mapperRef.current?.handleRoomInfo(data);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));
        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
    }, [mapperRef, setCurrentTerrain]);

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
        let players: string[] = [];
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        players = data.map(parseOccupant).filter(Boolean) as string[];
        setRoomPlayers(players);
    }, [setRoomPlayers]);

    const onRoomNpcs = useCallback((data: GmcpRoomNpcs) => {
        let npcs: string[] = [];
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        npcs = data.map(parseOccupant).filter(Boolean) as string[];
        setRoomNpcs(npcs);
    }, [setRoomNpcs]);

    const onRoomItems = useCallback((data: GmcpRoomItems) => {
        let items: string[] = [];
        const parseItem = (i: string | GmcpOccupant): string[] => {
            if (typeof i === 'string') return [i];
            const names = [];
            if (i.name) names.push(i.name);
            if (i.short) names.push(i.short);
            if (i.shortdesc) names.push(i.shortdesc);
            return names;
        };
        items = data.flatMap(parseItem).filter(Boolean);
        setRoomItems(items);
    }, [setRoomItems]);

    const onAddPlayer = useCallback((data: string | GmcpOccupant) => {
        const name = typeof data === 'string' ? data : data.name;
        if (name) setRoomPlayers(prev => prev.includes(name) ? prev : [...prev, name]);
    }, [setRoomPlayers]);

    const onAddNpc = useCallback((data: string | GmcpOccupant) => {
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        const name = parseOccupant(data);
        if (name) setRoomNpcs(prev => prev.includes(name) ? prev : [...prev, name]);
    }, [setRoomNpcs]);

    const onRemovePlayer = useCallback((data: string | GmcpOccupant) => {
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        const name = parseOccupant(data);
        if (name) setRoomPlayers(prev => prev.filter(p => p !== name));
    }, [setRoomPlayers]);

    const onRemoveNpc = useCallback((data: string | GmcpOccupant) => {
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        const name = parseOccupant(data);
        if (name) setRoomNpcs(prev => prev.filter(p => p !== name));
    }, [setRoomNpcs]);

    // --- Character Identity ---

    const onCharNameChange = useCallback((name: string | null) => {
        if (characterName && name !== characterName) {
            setAbilities({});
            addMessage('system', `Character changed to ${name}. Abilities reset.`);
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
