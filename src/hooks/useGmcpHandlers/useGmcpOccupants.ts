import { useCallback } from 'react';
import { GmcpOccupant } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { occupantAnims, getOccupantKey } from '../../components/Mapper/occupantAnimStore';

interface UseGmcpOccupantsProps {
    mapperRef: React.RefObject<MapperRef>;
    setRoomPlayers: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    characterName: string | null;
    isSpectateMode?: boolean;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    setIsRiding?: (val: boolean) => void;
    lastRoomChangeTimeRef: React.MutableRefObject<number>;
}

export const useGmcpOccupants = ({
    mapperRef,
    setRoomPlayers,
    setRoomNpcs,
    setRoomItems,
    characterName,
    isSpectateMode,
    registerEntity,
    setIsRiding,
    lastRoomChangeTimeRef
}: UseGmcpOccupantsProps) => {

    const onRoomPlayers = useCallback((data: any) => {
        if (isSpectateMode) return;
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
        mapperRef.current?.triggerRender?.();
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity, mapperRef, isSpectateMode]);

    const onRoomNpcs = useCallback((data: any) => {
        if (isSpectateMode) return;
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
        setRoomPlayers(players);
        mapperRef.current?.triggerRender?.();
    }, [setRoomNpcs, setRoomPlayers, setIsRiding, characterName, registerEntity, isSpectateMode, mapperRef]);

    const onRoomItems = useCallback((data: any) => {
        if (isSpectateMode) return;

        // MUME distinguishing between room items and inventory items
        if ((data as any).location && (data as any).location !== 'room' && (data as any).location !== 'objects') {
           return;
        }

        let rawList = Array.isArray(data) ? data : ((data as any).items || (data as any).objects || (data as any).obj || (data as any).objs || []);
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
    }, [setRoomItems, registerEntity, isSpectateMode]);

    const onAddPlayer = useCallback((data: any) => {
        if (isSpectateMode) return;
        if (!data) return;
        const obj: GmcpOccupant = typeof data === 'string' || typeof data === 'number'
            ? { name: String(data), keyword: String(data), short: String(data) }
            : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };

        if (!obj.name) return;
        if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return;

        if (data?.dir && (Date.now() - lastRoomChangeTimeRef.current) > 300) {
            const key = getOccupantKey(obj.id, obj.name);
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'enter', startTime: Date.now(), name: obj.name, id: obj.id, isPlayer: true });
            mapperRef.current?.triggerRender?.();
        }

        const isExplicitPc = typeof data === 'object' && (data.pc || data.type === 'pc' || data.type === 'player');
        const isExplicitNpc = typeof data === 'object' && (data.npc || data.type === 'npc');

        const idStr = (obj.id !== undefined && obj.id !== null) ? String(obj.id) : null;
        const nameStr = obj.name || obj.keyword || obj.short;

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };

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

        setRoomNpcs(prev => prev.filter(filterFn));

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
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity, isSpectateMode, lastRoomChangeTimeRef, mapperRef]);

    const onAddNpc = useCallback((data: any) => {
        if (isSpectateMode) return;
        if (!data) return;
        const obj: GmcpOccupant = typeof data === 'string' || typeof data === 'number'
            ? { name: String(data), keyword: String(data), short: String(data) }
            : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };

        if (!obj.name) return;
        if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return;

        if (data?.dir && (Date.now() - lastRoomChangeTimeRef.current) > 300) {
            const key = getOccupantKey(obj.id, obj.name);
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'enter', startTime: Date.now(), name: obj.name, id: obj.id, isPlayer: false });
            mapperRef.current?.triggerRender?.();
        }

        const isExplicitPc = typeof data === 'object' && (data.pc || data.type === 'pc' || data.type === 'player');

        const idStr = (obj.id !== undefined && obj.id !== null) ? String(obj.id) : null;
        const nameStr = obj.name || obj.keyword || obj.short;

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };

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

        setRoomPlayers(prev => prev.filter(filterFn));

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
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity, isSpectateMode, lastRoomChangeTimeRef, mapperRef]);

    const onRemovePlayer = useCallback((data: any) => {
        if (isSpectateMode) return;
        if (!data) return;
        const id = (data && typeof data === 'object' && data !== null) ? data.id : data;
        const name = (data && typeof data === 'object' && data !== null) ? (data.name || data.keyword || data.short) : data;
        const idStr = (id !== undefined && id !== null) ? String(id) : null;
        const nameStr = (name !== undefined && name !== null && String(name) !== idStr) ? String(name) : (typeof name === 'string' ? name : null);

        if (data?.dir && (idStr || nameStr)) {
            const key = getOccupantKey(idStr ?? undefined, nameStr ?? '');
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'exit', startTime: Date.now(), name: nameStr ?? '', id: idStr ?? undefined, isPlayer: true });
        }

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };
        setRoomPlayers(prev => prev.filter(filterFn));
        setRoomNpcs(prev => prev.filter(filterFn));
        if (mapperRef.current?.triggerRender) mapperRef.current.triggerRender();
    }, [setRoomPlayers, setRoomNpcs, mapperRef, isSpectateMode]);

    const onRemoveNpc = useCallback((data: any) => {
        if (isSpectateMode) return;
        if (!data) return;
        const id = (data && typeof data === 'object' && data !== null) ? data.id : data;
        const name = (data && typeof data === 'object' && data !== null) ? (data.name || data.keyword || data.short) : data;
        const idStr = (id !== undefined && id !== null) ? String(id) : null;
        const nameStr = (name !== undefined && name !== null && String(name) !== idStr) ? String(name) : (typeof name === 'string' ? name : null);

        if (data?.dir && (idStr || nameStr)) {
            const key = getOccupantKey(idStr ?? undefined, nameStr ?? '');
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'exit', startTime: Date.now(), name: nameStr ?? '', id: idStr ?? undefined, isPlayer: false });
        }

        const filterFn = (p: GmcpOccupant) => {
            if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
            if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
            return true;
        };
        setRoomPlayers(prev => prev.filter(filterFn));
        setRoomNpcs(prev => prev.filter(filterFn));
        if (mapperRef.current?.triggerRender) mapperRef.current.triggerRender();
    }, [setRoomPlayers, setRoomNpcs, mapperRef, isSpectateMode]);

    return {
        onRoomPlayers,
        onRoomNpcs,
        onRoomItems,
        onAddPlayer,
        onAddNpc,
        onRemovePlayer,
        onRemoveNpc
    };
};
