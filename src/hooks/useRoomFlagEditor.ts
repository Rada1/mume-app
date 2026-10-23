/** @file Compact room and exit flag choices, selection, and updates. */
import { useState } from 'react';
import type { RoomFlagOption } from '../types';
import type { MapperRoom } from '../components/Mapper/mapperTypes';
import { getRoomPortableState, getRoomRidableState } from '../components/Mapper/mapperUtils';
import { DOOR_FLAG, EXIT_FLAG } from '../components/Mapper/performance/webcockpit/model';
import { mapRoomFlagChoices, normalizeMapRoomFlag } from '../utils/mapRoomFlags';

// --- Shared Choices ---
const attributes: RoomFlagOption[] = [
    { id: 'good', label: 'Good', field: 'align', value: 1 },
    { id: 'neutral', label: 'Neutral', field: 'align', value: 2 },
    { id: 'evil', label: 'Evil', field: 'align', value: 3 },
    { id: 'dark', label: 'Dark', field: 'light', value: 1 },
    { id: 'lit', label: 'Lit', field: 'light', value: 2 },
    { id: 'portable', label: 'Portable', field: 'portable', value: 1 },
    { id: 'no-port', label: 'No port', field: 'portable', value: 2 },
    { id: 'ridable', label: 'Ridable', field: 'ridable', value: 1 },
    { id: 'no-ride', label: 'No ride', field: 'ridable', value: 2 }
].map(option => ({ ...option, kind: 'attribute', group: 'Distinctions' } as RoomFlagOption));
const labelFor = (flag: string) => flag.toLowerCase().replaceAll('_', ' ');
const exitOptions = [
    ...Object.keys(EXIT_FLAG).filter(flag => !['EXIT', 'DOOR'].includes(flag)).map(flag => ({ id: `flags:${flag}`, flag, kind: 'flags' as const, label: labelFor(flag), group: 'Exit flags' })),
    ...Object.keys(DOOR_FLAG).map(flag => ({ id: `doorFlags:${flag}`, flag, kind: 'doorFlags' as const, label: labelFor(flag), group: 'Door flags' }))
];

// --- Editor Model ---
export const useRoomFlagEditor = (room: MapperRoom | undefined, updateRoom: (patch: Partial<MapperRoom>) => void) => {
    const [direction, setDirection] = useState('');
    const directions = Object.keys(room?.exits ?? {});
    const activeDirection = directions.includes(direction) ? direction : directions[0] ?? '';
    const exit = room?.exits[activeDirection];
    const roomOptions = [...attributes, ...(['mobFlags', 'loadFlags'] as const).flatMap(kind =>
        mapRoomFlagChoices(room?.[kind] ?? [], kind).map(flag => ({ id: `${kind}:${flag}`, label: labelFor(flag),
            group: kind === 'mobFlags' ? 'Characters & services' : 'Objects & resources', kind, flag })))];
    const valueFor = (field: RoomFlagOption['field']) => {
        if (!room || !field) return 0;
        if (field === 'portable' || field === 'ridable') {
            const state = field === 'portable' ? getRoomPortableState(room.portable) : getRoomRidableState(room.ridable);
            return state === null ? 0 : state ? 1 : 2;
        }
        const value = room[field];
        const name = String(value).toLowerCase();
        return ({ good: 1, neutral: 2, evil: 3, dark: 1, lit: 2 } as Record<string, number>)[name] ?? (Number(value) || 0);
    };
    const selectedRoom = roomOptions.filter(option => option.kind === 'attribute'
        ? valueFor(option.field) === option.value : (room?.[option.kind] ?? []).map(normalizeMapRoomFlag).includes(option.flag ?? ''));
    const changeRoomFlag = (id: string, remove = false) => {
        const option = roomOptions.find(item => item.id === id);
        if (!option || !room) return;
        if (option.kind === 'attribute' && option.field) updateRoom({ [option.field]: remove ? 0 : option.value });
        else if (option.kind !== 'attribute' && option.flag) {
            const flags = (room[option.kind] ?? []).map(normalizeMapRoomFlag).filter(flag => flag !== option.flag);
            updateRoom({ [option.kind]: remove ? flags : [...flags, option.flag] });
        }
    };
    const selectedExit = exitOptions.filter(option => option.flag === 'DOOR' && option.kind === 'flags'
        ? exit?.hasDoor : (exit?.[option.kind] ?? []).map(normalizeMapRoomFlag).includes(option.flag));
    const changeExitFlag = (id: string, remove = false) => {
        const option = exitOptions.find(item => item.id === id);
        if (!option || !exit || !room) return;
        const flags = (exit[option.kind] ?? []).map(normalizeMapRoomFlag).filter(flag => flag !== option.flag);
        const next = { ...exit, [option.kind]: remove ? flags : [...flags, option.flag], mapFlagsEdited: true };
        if (option.flag === 'DOOR') {
            next.hasDoor = !remove;
            if (remove) { next.doorFlags = []; next.doorName = undefined; next.name = undefined; next.closed = false; }
        } else if (option.kind === 'doorFlags' && !remove) next.hasDoor = true;
        updateRoom({ exits: { ...room.exits, [activeDirection]: next } });
    };
    return { selectedRoom, roomOptions: roomOptions.filter(option => !selectedRoom.includes(option)), changeRoomFlag,
        directions, direction: activeDirection, setDirection, selectedExit,
        exitOptions: exitOptions.filter(option => !selectedExit.includes(option)), changeExitFlag };
};
