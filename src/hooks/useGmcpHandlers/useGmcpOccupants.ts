import { useCallback } from 'react';
import { GmcpOccupant } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { occupantAnims, getOccupantKey } from '../../components/Mapper/occupantAnimStore';
import { getCategoryForName } from '../../utils/categorizationUtils';

const inferIsPlayer = (data: any, fallbackName: string | null, isPlayersList: boolean): boolean => {
    if (typeof data === 'object' && data !== null) {
        if (data.pc || data.type === 'pc' || data.type === 'player') return true;
        if (data.npc || data.type === 'npc') return false;
    }

    if (isPlayersList) return true;
    if (!fallbackName) return false;

    const source = String(fallbackName).trim();
    const words = source.split(/[ \t,]/).filter(Boolean);
    if (words.length === 0) return false;

    const firstWord = words[0];
    const startsWithArticle = /^(a|an|the|some)$/i.test(firstWord);
    if (startsWithArticle) return false;

    const sanitized = source.replace(/[.,:;!]$/, '');
    if (!/^[A-Z\u00C0-\u00DE]/.test(sanitized)) return false;

    const nameWords = sanitized.split(/\s+/).filter(Boolean);
    const secondWord = nameWords[1] ?? '';
    return nameWords.length === 1 || secondWord.toLowerCase() === 'the';
};

const parseOccupant = (data: any, characterName: string | null): GmcpOccupant | null => {
    if (!data) return null;
    const obj: GmcpOccupant = typeof data === 'string' || typeof data === 'number'
        ? { name: String(data), keyword: String(data), short: String(data) }
        : { ...data, name: data.name || data.keyword || data.short || data.shortdesc };
    if (!obj.name) return null;
    if (characterName && obj.name.toLowerCase() === characterName.toLowerCase()) return null;
    return obj;
};

const createFilterFn = (idStr: string | null, nameStr: string | null) => (p: GmcpOccupant) => {
    if (idStr && p.id !== undefined && p.id !== null && String(p.id) === idStr) return false;
    if (nameStr && (p.name || p.keyword || p.short) === nameStr) return false;
    return true;
};

const updateList = (prev: GmcpOccupant[], obj: GmcpOccupant, idStr: string | null, nameStr: string | null) => {
    const idx = idStr
        ? prev.findIndex(x => x.id !== undefined && x.id !== null && String(x.id) === idStr)
        : prev.findIndex(x => (x.name || x.keyword || x.short) === nameStr);
    if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...obj };
        return next;
    }
    return [...prev, obj];
};

interface UseGmcpOccupantsProps {
    mapperRef: React.RefObject<MapperRef>;
    setRoomPlayers: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    characterName: string | null;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    setIsRiding?: (val: boolean) => void;
    lastRoomChangeTimeRef: React.MutableRefObject<number>;
    inlineCategories: import('../../types').InlineCategoryConfig[];
}

export const useGmcpOccupants = ({
    mapperRef,
    setRoomPlayers,
    setRoomNpcs,
    setRoomItems,
    characterName,
    registerEntity,
    setIsRiding,
    lastRoomChangeTimeRef,
    inlineCategories
}: UseGmcpOccupantsProps) => {

    const handleRoomList = useCallback((data: any, isPlayersList: boolean) => {
        console.log(`[GMCP] Ingesting ${isPlayersList ? 'Players' : 'NPCs'} list:`, data);
        let rawList = Array.isArray(data) ? data : (data.players || data.members || data.chars || data.char || data.npcs || data.list || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) {
            console.warn(`[GMCP] Failed to parse ${isPlayersList ? 'Players' : 'NPCs'} list - rawList is not an array:`, rawList);
            return;
        }

        const pcList: GmcpOccupant[] = [];
        const npcList: GmcpOccupant[] = [];

        rawList.forEach(p => {
            if (!isPlayersList && setIsRiding) {
                const shortStr = (typeof p === 'string' ? p : (p.short || p.shortdesc || p.name || '')).toLowerCase();
                if (shortStr.includes('ridden by you')) setIsRiding(true);
            }

            const obj = parseOccupant(p, characterName);
            if (!obj) return;

            const isPc = inferIsPlayer(p, obj.name || obj.keyword || obj.short || null, isPlayersList);
            obj.category = isPc ? 'player' : 'npc';

            if (isPc) {
                pcList.push(obj);
                if (registerEntity) registerEntity(obj.id ? String(obj.id) : `roomplayers:${obj.name}`, obj.name, 'room', 'player');
            } else {
                npcList.push(obj);
                if (registerEntity) registerEntity(obj.id ? String(obj.id) : `roomnpcs:${obj.name}`, obj.name, 'room', 'npc');
            }
        });

        console.log(`[GMCP] Resolved: ${pcList.length} PCs, ${npcList.length} NPCs`);

        if (isPlayersList) {
            setRoomPlayers(pcList);
            if (npcList.length > 0) {
                setRoomNpcs(prev => {
                    let next = [...prev];
                    npcList.forEach(n => {
                        next = updateList(next, n, n.id !== undefined && n.id !== null ? String(n.id) : null, n.name || n.keyword || n.short || null);
                    });
                    return next;
                });
            }
        } else {
            // Room.Chars.Set is a full snapshot — always replace both lists
            setRoomNpcs(npcList);
            setRoomPlayers(pcList);
        }
        mapperRef.current?.triggerRender?.();
    }, [setRoomPlayers, setRoomNpcs, setIsRiding, characterName, registerEntity, mapperRef]);

    const onRoomPlayers = useCallback((data: any) => {
        handleRoomList(data, true);
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Players', Object.assign(data, { isSnooped: false }));
        });
    }, [handleRoomList]);

    const onRoomNpcs = useCallback((data: any) => {
        handleRoomList(data, false);
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Npcs', Object.assign(data, { isSnooped: false }));
        });
    }, [handleRoomList]);

    const onRoomItems = useCallback((data: any) => {
        console.log('[GMCP] Ingesting Items list:', data);

        // MUME distinguishing between room items and inventory items
        if ((data as any).location && (data as any).location !== 'room' && (data as any).location !== 'objects') {
            console.log('[GMCP] Ignoring non-room items location:', (data as any).location);
            return;
        }

        let rawList = Array.isArray(data) ? data : ((data as any).items || (data as any).objects || (data as any).obj || (data as any).objs || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) {
            console.warn('[GMCP] Failed to parse Items list - rawList is not an array:', rawList);
            return;
        }

        const items: GmcpOccupant[] = rawList.map(i => {
            const obj = typeof i === 'string' ? { name: i, keyword: i, short: i } : { ...i, name: i.name || i.short || i.shortdesc || i.keyword };
            if (registerEntity && obj.name) {
                const id = (obj as any).id ? String((obj as any).id) : `roomitems:${obj.name}`;
                const specCat = getCategoryForName(obj.name, inlineCategories);
                registerEntity(id, obj.name, 'room', specCat || 'obj-room');
            }
            return obj;
        });
        console.log(`[GMCP] Resolved ${items.length} room items`);
        setRoomItems(items);
        
        // --- Store Sync ---
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Items', Object.assign(items, { isSnooped: false }));
        });
    }, [setRoomItems, registerEntity, inlineCategories]);

    const handleAdd = useCallback((data: any, isPlayerDefault: boolean) => {
        if (!data) return;
        const obj = parseOccupant(data, characterName);
        if (!obj) return;

        if (data?.dir && (Date.now() - lastRoomChangeTimeRef.current) > 300) {
            const key = getOccupantKey(obj.id, obj.name);
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'enter', startTime: Date.now(), name: obj.name, id: obj.id, isPlayer: isPlayerDefault });
            mapperRef.current?.triggerRender?.();
        }

        const isPc = inferIsPlayer(data, obj.name || obj.keyword || obj.short || null, isPlayerDefault);
        obj.category = isPc ? 'player' : 'npc';

        const idStr = (obj.id !== undefined && obj.id !== null) ? String(obj.id) : null;
        const nameStr = obj.name || obj.keyword || obj.short || null;
        const filterFn = createFilterFn(idStr, nameStr);

        if (isPc) {
            setRoomNpcs(prev => prev.filter(filterFn));
            if (registerEntity) registerEntity(idStr || `roomplayers:${obj.name}`, obj.name, 'room', 'player');

            setRoomPlayers(prev => updateList(prev, obj, idStr, nameStr));
            
            // --- Store Sync ---
            import('../../events/gmcpBus').then(({ gmcpBus }) => {
                gmcpBus.emit('Room.AddPlayer', { ...obj, isSnooped: false });
            });
        } else {
            setRoomPlayers(prev => prev.filter(filterFn));
            if (registerEntity) registerEntity(idStr || `roomnpcs:${obj.name}`, obj.name, 'room', 'npc');

            setRoomNpcs(prev => updateList(prev, obj, idStr, nameStr));
            
            // --- Store Sync ---
            import('../../events/gmcpBus').then(({ gmcpBus }) => {
                gmcpBus.emit('Room.AddNpc', { ...obj, isSnooped: false });
            });
        }
    }, [setRoomPlayers, setRoomNpcs, characterName, registerEntity, lastRoomChangeTimeRef, mapperRef]);

    const handleRemove = useCallback((data: any, isPlayerDefault: boolean) => {
        if (!data) return;
        const id = (data && typeof data === 'object') ? data.id : data;
        const name = (data && typeof data === 'object') ? (data.name || data.keyword || data.short) : data;
        const idStr = (id !== undefined && id !== null) ? String(id) : null;
        const nameStr = (name !== undefined && name !== null && String(name) !== idStr) ? String(name) : (typeof name === 'string' ? name : null);

        if (data?.dir && (idStr || nameStr)) {
            const key = getOccupantKey(idStr ?? undefined, nameStr ?? '');
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'exit', startTime: Date.now(), name: nameStr ?? '', id: idStr ?? undefined, isPlayer: isPlayerDefault });
        }

        const filterFn = createFilterFn(idStr, nameStr);
        setRoomPlayers(prev => prev.filter(filterFn));
        setRoomNpcs(prev => prev.filter(filterFn));
        mapperRef.current?.triggerRender?.();
        
        // --- Store Sync ---
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            if (isPlayerDefault) gmcpBus.emit('Room.RemovePlayer', { id: idStr || nameStr, isSnooped: false });
            else gmcpBus.emit('Room.RemoveNpc', { id: idStr || nameStr, isSnooped: false });
        });
    }, [setRoomPlayers, setRoomNpcs, mapperRef]);

    const onAddPlayer = useCallback((data: any) => handleAdd(data, true), [handleAdd]);
    const onAddNpc = useCallback((data: any) => handleAdd(data, false), [handleAdd]);
    const onRemovePlayer = useCallback((data: any) => handleRemove(data, true), [handleRemove]);
    const onRemoveNpc = useCallback((data: any) => handleRemove(data, false), [handleRemove]);

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
