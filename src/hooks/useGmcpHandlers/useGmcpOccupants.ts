import { useCallback } from 'react';
import { GmcpOccupant } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { occupantAnims, getOccupantKey } from '../../components/Mapper/occupantAnimStore';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';

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

const knownRoomChars = new Map<string, GmcpOccupant>();

const rememberOccupant = (occupant: GmcpOccupant) => {
    if (occupant.id === undefined) return;
    const key = String(occupant.id);
    knownRoomChars.set(key, { ...(knownRoomChars.get(key) || {}), ...occupant });
};

const hydrateOccupant = (occupant: GmcpOccupant): GmcpOccupant => {
    if (occupant.id === undefined) return occupant;
    const cached = knownRoomChars.get(String(occupant.id));
    const hydrated = cached ? { ...cached, ...occupant } : occupant;
    if (!hydrated.name) {
        hydrated.name = hydrated.short || hydrated.shortdesc || hydrated.keyword || hydrated.desc;
    }
    return hydrated;
};

const parseOccupant = (data: any, characterName: string | null): GmcpOccupant | null => {
    if (!data) return null;
    let obj: GmcpOccupant;
    const normalizedType = normalizeOccupantType(data);
    if (typeof data === 'string' || typeof data === 'number') {
        obj = { id: String(data), name: String(data), short: String(data) };
    } else {
        obj = { ...data };
        obj.id = data.id !== undefined ? String(data.id) : (data.name || data.keyword || data.short || data.shortdesc);
        // Only set name if it exists in the data, preserving partial updates
        if (data.name || data.keyword || data.short || data.shortdesc) {
            obj.name = data.name || data.keyword || data.short || data.shortdesc;
        }
    }
    if (normalizedType) obj.type = normalizedType;
    if (obj.name || obj.keyword || obj.short || obj.shortdesc) {
        obj.keyword = getOccupantCommandKeyword(obj, String(obj.id || ''));
    }
    // Normalize MUME's `pc` flag into the canonical `type` field so the
    // classifier (strict on `type`) sees a usable value for NPCs that arrive
    // with only `pc: 0` and no explicit type.

    if (!obj.id) return null;
    const hydrated = hydrateOccupant(obj);
    if (characterName && hydrated.name && hydrated.name.toLowerCase() === characterName.toLowerCase()) return null;

    rememberOccupant(hydrated);
    return hydrated;
};

const parseOccupants = (data: any, characterName: string | null): GmcpOccupant[] => {
    const rawList = Array.isArray(data)
        ? data
        : (data?.chars || data?.char || data?.members || data?.list || data?.npcs || data?.players || [data]);
    return rawList
        .map((entry: any) => parseOccupant(entry, characterName))
        .filter((entry: GmcpOccupant | null): entry is GmcpOccupant => !!entry && entry.id !== undefined);
};

interface UseGmcpOccupantsProps {
    mapperRef: React.RefObject<MapperRef>;
    setRoomChars?: React.Dispatch<React.SetStateAction<Record<number, GmcpOccupant>>>;
    characterName: string | null;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    setIsRiding?: (val: boolean) => void;
    lastRoomChangeTimeRef: React.MutableRefObject<number>;
}

export const useGmcpOccupants = ({
    mapperRef,
    setRoomChars,
    characterName,
    registerEntity,
    setIsRiding,
    lastRoomChangeTimeRef,
}: UseGmcpOccupantsProps) => {

    const onRoomChars = useCallback((data: any) => {
        console.groupCollapsed('[GMCP Room.Chars] full-set payload');
        // console.log('raw:', data);
        let rawList = Array.isArray(data)
            ? data
            : (data.chars || data.char || data.members || data.list || data.npcs || data.players || [data]);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        if (!Array.isArray(rawList)) {
            console.warn(`[GMCP] Failed to parse Room.Chars list - rawList is not an array:`, rawList);
            return;
        }

        const parsedChars = parseOccupants(rawList, characterName).reduce<Record<number, GmcpOccupant>>((acc, obj) => {
            acc[getRoomCharKey(obj.id!)] = obj;
            return acc;
        }, {});

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
            const parsedCount = Object.keys(parsedChars).length;
            const shouldPreserveExisting = parsedCount > 0 && (prevCount > parsedCount || looksLikePartialCombatUpdate);
            const newChars: Record<number, GmcpOccupant> = shouldPreserveExisting ? { ...prev } : {};

            Object.entries(parsedChars).forEach(([key, obj]) => {
                const id = Number(key);
                const merged = { ...(prev[id] || {}), ...obj };
                newChars[id] = merged;
                rememberOccupant(merged);

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

        // console.log('parsed:', Object.values(parsedChars));
        // console.log(`resolved count: ${Object.keys(parsedChars).length}`);
        console.groupEnd();
        if (setRoomChars) setRoomChars(prev => mergeChars(prev));
        mapperRef.current?.triggerRender?.();

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Chars', Object.assign(data, { isSnooped: false }));
        });
    }, [setRoomChars, setIsRiding, characterName, registerEntity, mapperRef]);

    const onAddChar = useCallback((data: any) => {
        console.groupCollapsed('[GMCP Room.Chars.Add] payload');
        // console.log('raw:', data);
        const occupants = parseOccupants(data, characterName);
        // console.log('parsed:', occupants);
        console.groupEnd();
        if (occupants.length === 0) return;

        occupants.forEach(obj => {
            const isNpc = obj.type === 'npc' || obj.type === 'mount';
            const dir = (obj as { dir?: string }).dir;
            if (dir && (Date.now() - lastRoomChangeTimeRef.current) > 300) {
                const key = getOccupantKey(obj.id, obj.name);
                occupantAnims.set(key, { dir: String(dir).toLowerCase(), type: 'enter', startTime: Date.now(), name: obj.name || String(obj.id), id: String(obj.id), isPlayer: !isNpc });
            }
            if (registerEntity) {
                registerEntity(`roomchars:${obj.id}`, obj.name || String(obj.id), 'room', obj.type);
            }
        });

        setRoomChars?.(prev => {
            const next = { ...prev };
            occupants.forEach(obj => {
                const id = getRoomCharKey(obj.id!);
                const merged = { ...(next[id] || {}), ...obj };
                rememberOccupant(merged);
                next[id] = merged;
            });
            return next;
        });
        mapperRef.current?.triggerRender?.();

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            occupants.forEach(obj => gmcpBus.emit('Room.AddChar', { ...obj, isSnooped: false }));
        });
    }, [setRoomChars, characterName, registerEntity, lastRoomChangeTimeRef, mapperRef]);

    const onUpdateChar = useCallback((data: any) => {
        console.groupCollapsed('[GMCP Room.Chars.Update] payload');
        // console.log('raw:', data);
        const occupants = parseOccupants(data, characterName);
        // console.log('parsed:', occupants);
        console.groupEnd();
        if (occupants.length === 0) return;

        if (setRoomChars) setRoomChars(prev => {
            const next = { ...prev };
            occupants.forEach(obj => {
                const id = getRoomCharKey(obj.id!);
                const merged = { ...(next[id] || {}), ...obj };
                rememberOccupant(merged);
                next[id] = merged;
            });
            return next;
        });
        mapperRef.current?.triggerRender?.();

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            occupants.forEach(obj => gmcpBus.emit('Room.UpdateChar', { ...obj, isSnooped: false }));
        });
    }, [setRoomChars, characterName, mapperRef]);

    const onRemoveChar = useCallback((data: any) => {
        console.groupCollapsed('[GMCP Room.Chars.Remove] payload');
        // console.log('raw:', data);
        console.groupEnd();
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
        mapperRef.current?.triggerRender?.();

        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.RemoveChar', { id, isSnooped: false });
        });
    }, [setRoomChars, mapperRef]);

    return {
        onRoomChars,
        onAddChar,
        onUpdateChar,
        onRemoveChar
    };
};
