import { useCallback } from 'react';
import { GmcpOccupant } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { occupantAnims, getOccupantKey } from '../../components/Mapper/occupantAnimStore';
import { getCategoryForName } from '../../utils/categorizationUtils';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';

const getRoomCharKey = (id: string | number): number => {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) return numericId;

    const idString = String(id);
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
        hash = ((hash << 5) - hash + idString.charCodeAt(i)) | 0;
    }
    return hash || -1;
};

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

        const parsedChars: Record<number, GmcpOccupant> = {};

        rawList.forEach(p => {
            const obj = parseOccupant(p, characterName);
            if (!obj || obj.id === undefined) return;
            parsedChars[getRoomCharKey(obj.id)] = obj;
        });

        const mergeChars = (prev: Record<number, GmcpOccupant>) => {
            const prevCount = Object.keys(prev).length;
            const parsedValues = Object.values(parsedChars);
            const looksLikePartialCombatUpdate = parsedValues.some(obj =>
                obj.hp !== undefined ||
                obj.maxhp !== undefined ||
                obj.status !== undefined ||
                (!obj.name && !obj.short && !obj.shortdesc && !obj.keyword) ||
                !obj.type
            );
            const shouldPreserveExisting = prevCount > Object.keys(parsedChars).length || looksLikePartialCombatUpdate;
            const newChars: Record<number, GmcpOccupant> = shouldPreserveExisting ? { ...prev } : {};

            Object.entries(parsedChars).forEach(([key, obj]) => {
                const id = Number(key);
                const merged = { ...(prev[id] || {}), ...obj };
                newChars[id] = merged;

                const isNpc = merged.type === 'npc';
                if (setIsRiding && isNpc) {
                    const shortStr = (merged.short || merged.shortdesc || merged.name || '').toLowerCase();
                    if (shortStr.includes('ridden by you')) setIsRiding(true);
                }

                if (registerEntity) {
                    const entityId = `roomchars:${merged.id}`;
                    registerEntity(entityId, merged.name || String(merged.id), 'room', merged.type);
                }
            });

            return newChars;
        };

        console.log(`[GMCP] Resolved ${Object.keys(parsedChars).length} Room.Chars`);
        if (setRoomChars) setRoomChars(prev => mergeChars(prev));
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

        if (setRoomChars) setRoomChars(prev => ({ ...prev, [getRoomCharKey(obj.id)]: obj }));

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
            const id = getRoomCharKey(obj.id);
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
            delete next[getRoomCharKey(id)];
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
