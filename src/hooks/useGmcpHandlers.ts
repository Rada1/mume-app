import { useCallback } from 'react';
import { GmcpOccupant } from '../types';
import { MapperRef } from '../components/Mapper/mapperTypes';

interface GmcpHandlersProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<string[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<string[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<string[]>>;
    characterName: string | null;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    addMessage: (type: any, text: string) => void;
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

    const onRoomInfo = useCallback((data: any) => {
        mapperRef.current?.handleRoomInfo(data);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));
        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
    }, [mapperRef, setCurrentTerrain]);

    const onRoomUpdateExits = useCallback((data: any) => {
        mapperRef.current?.handleUpdateExits(data);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-update-exits', { detail: data }));
    }, [mapperRef]);

    const onCharVitals = useCallback((data: any) => {
        if (data.terrain) {
            mapperRef.current?.handleTerrain(data.terrain);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
            setCurrentTerrain(data.terrain);
        }
    }, [mapperRef, setCurrentTerrain]);

    const onRoomPlayers = useCallback((data: any) => {
        let players: string[] = [];
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        if (Array.isArray(data)) players = data.map(parseOccupant).filter(Boolean) as string[];
        else players = (data.players || data.members || []).map(parseOccupant).filter(Boolean) as string[];
        setRoomPlayers(players);
    }, [setRoomPlayers]);

    const onRoomNpcs = useCallback((data: any) => {
        let npcs: string[] = [];
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        const items = Array.isArray(data) ? data : (data.chars || []);
        npcs = items.map(parseOccupant).filter(Boolean) as string[];
        setRoomNpcs(npcs);
    }, [setRoomNpcs]);

    const onRoomItems = useCallback((data: any) => {
        let items: string[] = [];
        const parseItem = (i: string | GmcpOccupant): string[] => {
            if (typeof i === 'string') return [i];
            const names = [];
            if (i.name) names.push(i.name);
            if (i.short) names.push(i.short);
            if (i.shortdesc) names.push(i.shortdesc);
            return names;
        };
        if (Array.isArray(data)) items = data.flatMap(parseItem).filter(Boolean);
        else items = (data.items || data.objects || []).flatMap(parseItem).filter(Boolean);
        setRoomItems(items);
    }, [setRoomItems]);

    const onAddPlayer = useCallback((data: any) => {
        const name = typeof data === 'string' ? data : data.name;
        if (name) setRoomPlayers(prev => prev.includes(name) ? prev : [...prev, name]);
    }, [setRoomPlayers]);

    const onAddNpc = useCallback((data: any) => {
        const parseOccupant = (p: string | GmcpOccupant): string | null => {
            if (typeof p === 'string') return p;
            return p.name || p.keyword || p.short || p.shortdesc || null;
        };
        const name = parseOccupant(data);
        if (name) setRoomNpcs(prev => prev.includes(name) ? prev : [...prev, name]);
    }, [setRoomNpcs]);

    const onRemovePlayer = useCallback((data: any) => {
        const name = typeof data === 'string' ? data : data.name;
        if (name) setRoomPlayers(prev => prev.filter(p => p !== name));
    }, [setRoomPlayers]);

    const onRemoveNpc = useCallback((data: any) => {
        const name = typeof data === 'string' ? data : data.name;
        if (name) setRoomNpcs(prev => prev.filter(p => p !== name));
    }, [setRoomNpcs]);

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
