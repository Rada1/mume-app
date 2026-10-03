/** @file useGmcpOccupants.ts — Synchronizes GMCP room occupants with client room state. */

// --- Logic Section ---
import { useCallback, useEffect } from 'react';
import { GmcpOccupant } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { occupantAnims, getOccupantKey } from '../../components/Mapper/occupantAnimStore';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';
import { initFollowerSync, cancelArrival, cancelDeparture } from '../../utils/followerSync';
import { getRoomCharKey, parseOccupants, rememberOccupant } from './roomOccupantParser';

interface UseGmcpOccupantsProps {
    mapperRef: React.RefObject<MapperRef>;
    setRoomChars?: React.Dispatch<React.SetStateAction<Record<number, GmcpOccupant>>>;
    characterName: string | null;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    setIsRiding?: (val: boolean) => void;
    lastRoomChangeTimeRef: React.MutableRefObject<number>;
    lastRoomNumRef?: React.MutableRefObject<number | string | null>;
}

export const useGmcpOccupants = ({
    mapperRef,
    setRoomChars,
    characterName,
    registerEntity,
    setIsRiding,
    lastRoomChangeTimeRef,
    lastRoomNumRef,
}: UseGmcpOccupantsProps) => {
    const tagRoom = (occ: GmcpOccupant): GmcpOccupant => {
        const room = lastRoomNumRef?.current;
        if (room == null) return occ;
        return { ...occ, _roomNum: room };
    };

    // Wire followerSync: synthesize Add/Remove from text lines when GMCP is silent.
    useEffect(() => {
        const synthAdd = (name: string, dir: string | null) => {
            const synId = `syn:${name.toLowerCase()}`;
            const isNpc = /^(a|an|some)\s/i.test(name);
            const occ: GmcpOccupant = tagRoom({
                id: synId,
                name,
                type: isNpc ? 'npc' : 'player',
                keyword: getOccupantCommandKeyword({ name } as any, synId)
            });
            const key = getRoomCharKey(synId);
            if (dir) {
                occupantAnims.set(getOccupantKey(synId, name), {
                    dir: dir.toLowerCase(),
                    type: 'enter',
                    startTime: Date.now(),
                    name,
                    id: synId,
                    isPlayer: !isNpc
                });
            }
            setRoomChars?.(prev => {
                if (Object.values(prev).some(o => (o.name || '').toLowerCase() === name.toLowerCase())) return prev;
                return { ...prev, [key]: occ };
            });
            if (registerEntity) registerEntity(`roomchars:${synId}`, name, 'room', occ.type);
            mapperRef.current?.triggerRender?.();
        };

        const synthRemove = (name: string) => {
            setRoomChars?.(prev => {
                const next = { ...prev };
                let removed = false;
                Object.entries(next).forEach(([key, occ]) => {
                    if (!removed
                        && typeof occ.id === 'string' && occ.id.startsWith('syn:')
                        && (occ.name || '').toLowerCase() === name.toLowerCase()) {
                        delete next[Number(key)];
                        removed = true;
                    }
                });
                return removed ? next : prev;
            });
            mapperRef.current?.triggerRender?.();
        };

        initFollowerSync(synthAdd, synthRemove);
    }, [setRoomChars, registerEntity, mapperRef, lastRoomNumRef]);

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

        const parsedChars = parseOccupants(rawList, characterName).reduce<Record<number, GmcpOccupant>>((acc, obj, index) => {
            obj._roomOrder = index;
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
            const hasCompleteRoster = parsedCount >= prevCount
                && Object.keys(prev).every(key => parsedChars[Number(key)] !== undefined);
            const newChars: Record<number, GmcpOccupant> = shouldPreserveExisting ? { ...prev } : {};
            let nextRoomOrder = Object.values(prev).reduce(
                (maximum, occupant) => Math.max(maximum, occupant._roomOrder ?? -1),
                -1
            ) + 1;

            Object.entries(parsedChars).forEach(([key, obj]) => {
                const id = Number(key);
                const roomOrder = !shouldPreserveExisting || hasCompleteRoster
                    ? obj._roomOrder
                    : prev[id]?._roomOrder ?? nextRoomOrder++;
                const merged = tagRoom({ ...(prev[id] || {}), ...obj, _roomOrder: roomOrder });
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
            if (obj.name) cancelArrival(obj.name);
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
            let nextRoomOrder = Object.values(prev).reduce(
                (maximum, occupant) => Math.max(maximum, occupant._roomOrder ?? -1),
                -1
            ) + 1;
            occupants.forEach(obj => {
                const id = getRoomCharKey(obj.id!);
                const existing = next[id];
                const roomOrder = existing?._roomOrder ?? nextRoomOrder++;
                const merged = tagRoom({ ...(existing || {}), ...obj, _roomOrder: roomOrder });
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
                const merged = tagRoom({ ...(next[id] || {}), ...obj });
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
        if (name) cancelDeparture(name);
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
