import { useCallback } from 'react';
import { GmcpOccupant } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { occupantAnims, getOccupantKey } from '../../components/Mapper/occupantAnimStore';
import { getCategoryForName } from '../../utils/categorizationUtils';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';

const parseOccupant = (data: any, characterName: string | null): GmcpOccupant | null => {
    if (!data) return null;
    let obj: GmcpOccupant;
    if (typeof data === 'string' || typeof data === 'number') {
        obj = { id: String(data), name: String(data), keyword: String(data), short: String(data) };
    } else {
        obj = { ...data };
        obj.id = data.id !== undefined ? String(data.id) : (data.name || data.keyword || data.short || data.shortdesc);
        // Only set name if it exists in the data, preserving partial updates
        if (data.name || data.keyword || data.short || data.shortdesc) {
            obj.name = data.name || data.keyword || data.short || data.shortdesc;
        }
    }
    if (!obj.id) return null;
    if (characterName && obj.name && obj.name.toLowerCase() === characterName.toLowerCase()) return null;

    // Normalize MUME's `pc` flag into the canonical `type` field so the
    // classifier (strict on `type`) sees a usable value for NPCs that arrive
    // with only `pc: 0` and no explicit type.
    const normalizedType = normalizeOccupantType(data);
    if (normalizedType) obj.type = normalizedType;

    return obj;
};

interface UseGmcpOccupantsProps {
    mapperRef: React.RefObject<MapperRef>;
    setRoomChars?: React.Dispatch<React.SetStateAction<Record<number, GmcpOccupant>>>;
    setRoomItems?: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    characterName: string | null;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    setIsRiding?: (val: boolean) => void;
    lastRoomChangeTimeRef: React.MutableRefObject<number>;
    inlineCategories: import('../../types').InlineCategoryConfig[];
}

export const useGmcpOccupants = ({
    mapperRef,
    setRoomChars,
    setRoomItems,
    characterName,
    registerEntity,
    setIsRiding,
    lastRoomChangeTimeRef,
    inlineCategories
}: UseGmcpOccupantsProps) => {

    const onRoomChars = useCallback((data: any) => {
        console.log(`[GMCP] Ingesting Room.Chars list:`, data);
        let rawList = Array.isArray(data) ? data : (data.chars || data.char || data.members || data.list || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) {
            console.warn(`[GMCP] Failed to parse Room.Chars list - rawList is not an array:`, rawList);
            return;
        }

        const newChars: Record<number, GmcpOccupant> = {};

        rawList.forEach(p => {
            const obj = parseOccupant(p, characterName);
            if (!obj || obj.id === undefined) return;

            const isNpc = obj.type === 'npc';
            if (setIsRiding && isNpc) {
                const shortStr = (obj.short || obj.shortdesc || obj.name || '').toLowerCase();
                if (shortStr.includes('ridden by you')) setIsRiding(true);
            }

            newChars[Number(obj.id)] = obj;

            if (registerEntity) {
                const entityId = `roomchars:${obj.id}`;
                registerEntity(entityId, obj.name || String(obj.id), 'room', obj.type);
            }
        });

        console.log(`[GMCP] Resolved ${Object.keys(newChars).length} Room.Chars`);
        if (setRoomChars) setRoomChars(newChars);
        mapperRef.current?.triggerRender?.();

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Chars', Object.assign(data, { isSnooped: false }));
        });
    }, [setRoomChars, setIsRiding, characterName, registerEntity, mapperRef]);

    const onAddChar = useCallback((data: any) => {
        if (!data) return;
        const obj = parseOccupant(data, characterName);
        if (!obj || obj.id === undefined) return;

        const isNpc = obj.type === 'npc';

        if (data?.dir && (Date.now() - lastRoomChangeTimeRef.current) > 300) {
            const key = getOccupantKey(obj.id, obj.name);
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'enter', startTime: Date.now(), name: obj.name || String(obj.id), id: String(obj.id), isPlayer: !isNpc });
            mapperRef.current?.triggerRender?.();
        }

        if (setRoomChars) setRoomChars(prev => ({ ...prev, [Number(obj.id)]: obj }));

        if (registerEntity) {
            const entityId = `roomchars:${obj.id}`;
            registerEntity(entityId, obj.name || String(obj.id), 'room', obj.type);
        }

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.AddChar', { ...obj, isSnooped: false });
        });
    }, [setRoomChars, characterName, registerEntity, lastRoomChangeTimeRef, mapperRef]);

    const onUpdateChar = useCallback((data: any) => {
        if (!data) return;
        const obj = parseOccupant(data, characterName);
        if (!obj || obj.id === undefined) return;

        if (setRoomChars) setRoomChars(prev => {
            const id = Number(obj.id);
            const existing = prev[id];
            if (existing) {
                return { ...prev, [id]: { ...existing, ...obj } };
            }
            return { ...prev, [id]: obj };
        });

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.UpdateChar', { ...obj, isSnooped: false });
        });
    }, [setRoomChars, characterName]);

    const onRemoveChar = useCallback((data: any) => {
        if (!data) return;
        const id = (data && typeof data === 'object') ? data.id : data;
        if (id === undefined || id === null) return;

        const name = (data && typeof data === 'object') ? (data.name || data.keyword || data.short) : undefined;
        const idStr = String(id);

        if (data?.dir) {
            const key = getOccupantKey(idStr, name);
            occupantAnims.set(key, { dir: String(data.dir).toLowerCase(), type: 'exit', startTime: Date.now(), name: name || idStr, id: idStr, isPlayer: data.type !== 'npc' });
            mapperRef.current?.triggerRender?.();
        }

        if (setRoomChars) setRoomChars(prev => {
            const next = { ...prev };
            delete next[Number(id)];
            return next;
        });

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.RemoveChar', { id, isSnooped: false });
        });
    }, [setRoomChars, mapperRef]);

    const onRoomItems = useCallback((data: any) => {
        console.log('[GMCP] Ingesting Items list:', data);

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
        setRoomItems?.(items);
        
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Items', Object.assign(items, { isSnooped: false }));
        });
    }, [setRoomItems, registerEntity, inlineCategories]);

    return {
        onRoomChars,
        onRoomItems,
        onAddChar,
        onUpdateChar,
        onRemoveChar
    };
};
