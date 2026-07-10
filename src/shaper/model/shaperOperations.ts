/**
 * @file shaperOperations.ts
 * @description Immutable update helpers for Shaper concept documents.
 */

import { createGridRoom, createShaperRoomId, formatRoomNumber } from './shaperDocument';
import { autoConnectRoom, clearRoomCardinals } from './shaperExits';
import { removeInactiveRoomAt } from './shaperLegacyInactiveRooms';
import type { ShaperExitDraft, ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from './shaperTypes';
// --- Occupancy Section ---
const cellKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;

const buildOccupancy = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exceptId?: ShaperRoomId
): Set<string> => {
    const occupied = new Set<string>();
    for (const room of Object.values(rooms)) {
        if (room.kind !== 'grid') continue;
        if (room.inactive) continue;
        if (room.id === exceptId) continue;
        occupied.add(cellKey(room.x, room.y, room.z));
    }
    return occupied;
};

export const isShaperCellFree = (
    doc: ShaperWorkspaceDoc,
    x: number,
    y: number,
    z: number,
    exceptId?: ShaperRoomId
): boolean => !buildOccupancy(doc.rooms, exceptId).has(cellKey(x, y, z));
// --- Selection Section ---
export const selectShaperRoom = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId
): ShaperWorkspaceDoc => ({
    ...doc,
    selectedRoomId: roomId
});
// --- Room Update Section ---
export const updateShaperRoom = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    patch: Partial<ShaperRoomDraft>
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room) return doc;

    const isActivating = room.inactive && (
        patch.name || patch.description || patch.sector || patch.flags || patch.inactive === false
    );

    return {
        ...doc,
        rooms: {
            ...doc.rooms,
            [roomId]: {
                ...room,
                ...patch,
                inactive: patch.inactive !== undefined ? patch.inactive : (isActivating ? false : room.inactive),
                id: room.id,
                roomNumber: room.roomNumber,
                x: room.x,
                y: room.y,
                z: room.z,
                kind: room.kind,
                anchorRoomId: room.anchorRoomId
            }
        }
    };
};

// --- Relational Grid Room Section ---
// Spiral-search offsets, cardinal neighbours first, used to place a new room
// adjacent to the selected room on the (expandable) coordinate plane.
const NEIGHBOUR_RINGS = 8;
const EXTRA_ROOM_START = 101;

const isRoomNumberFree = (
    doc: ShaperWorkspaceDoc,
    roomNumber: string,
    exceptId?: ShaperRoomId
): boolean => !Object.values(doc.rooms).some(room =>
    room.id !== exceptId && !room.inactive && room.roomNumber === roomNumber
);

const nextAvailableRoomNumber = (doc: ShaperWorkspaceDoc, exceptId?: ShaperRoomId): string => {
    const prefix = `${doc.zoneNumber}:`;
    const used = new Set(Object.values(doc.rooms)
        .filter(room => room.id !== exceptId && !room.inactive && room.roomNumber.startsWith(prefix))
        .map(room => Number(room.roomNumber.slice(prefix.length)))
        .filter(number => Number.isFinite(number)));
    let next = EXTRA_ROOM_START;
    while (used.has(next)) next += 1;
    return `${doc.zoneNumber}:${next}`;
};

const uniqueRoomNumber = (
    doc: ShaperWorkspaceDoc,
    preferred: string,
    exceptId?: ShaperRoomId
): string => isRoomNumberFree(doc, preferred, exceptId) ? preferred : nextAvailableRoomNumber(doc, exceptId);

const findFreeCell = (
    occupied: Set<string>,
    z: number,
    originX: number,
    originY: number
): { x: number; y: number } => {
    for (let ring = 1; ring <= NEIGHBOUR_RINGS; ring += 1) {
        // Cardinal directions take priority, then the rest of the ring.
        const candidates: Array<[number, number]> = [
            [originX, originY - ring],
            [originX + ring, originY],
            [originX, originY + ring],
            [originX - ring, originY]
        ];
        for (let dx = -ring; dx <= ring; dx += 1) {
            for (let dy = -ring; dy <= ring; dy += 1) {
                if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
                candidates.push([originX + dx, originY + dy]);
            }
        }
        for (const [x, y] of candidates) {
            if (!occupied.has(cellKey(x, y, z))) return { x, y };
        }
    }
    return { x: originX + NEIGHBOUR_RINGS + 1, y: originY };
};

const withGridRoom = (doc: ShaperWorkspaceDoc, room: ShaperRoomDraft): ShaperWorkspaceDoc => {
    const rooms = {
        ...doc.rooms,
        [room.id]: room
    };
    return {
        ...doc,
        selectedRoomId: room.id,
        rooms,
        exits: autoConnectRoom(rooms, doc.exits, room.id)
    };
};

export const addShaperGridRoom = (doc: ShaperWorkspaceDoc, z: number): ShaperWorkspaceDoc => {
    const anchor = doc.rooms[doc.selectedRoomId];
    const originX = anchor && anchor.z === z ? anchor.x : 0;
    const originY = anchor && anchor.z === z ? anchor.y : 0;
    const { x, y } = findFreeCell(buildOccupancy(doc.rooms), z, originX, originY);
    const draft = createGridRoom(doc.zoneNumber, x, y, z);
    const room = { ...draft, id: createShaperRoomId(), roomNumber: uniqueRoomNumber(doc, draft.roomNumber) };
    return withGridRoom(doc, room);
};

// Add a grid room at an exact coordinate (used by right-click "add room here").
export const addShaperRoomAt = (
    doc: ShaperWorkspaceDoc,
    x: number,
    y: number,
    z: number
): ShaperWorkspaceDoc => {
    const baseDoc = removeInactiveRoomAt(doc, x, y, z);
    if (!isShaperCellFree(baseDoc, x, y, z)) return doc;
    const draft = createGridRoom(doc.zoneNumber, x, y, z);
    const room = { ...draft, id: createShaperRoomId(), roomNumber: uniqueRoomNumber(baseDoc, draft.roomNumber) };
    return withGridRoom(baseDoc, room);
};

// --- Move / Place Section ---
// Relocate a room to a grid coordinate. Used for both dragging a grid tile and
// dropping an extra room onto the plane (which converts it to a grid room).
export const moveShaperRoom = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    x: number,
    y: number,
    z: number
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room) return doc;
    if (!isShaperCellFree(doc, x, y, z, roomId)) return doc;

    const preferredRoomNumber = formatRoomNumber(doc.zoneNumber, x, y);
    const nextRoomNumber = isRoomNumberFree(doc, preferredRoomNumber, roomId)
        ? preferredRoomNumber
        : uniqueRoomNumber(doc, room.roomNumber, roomId);
    const clearedExits = clearRoomCardinals(doc.exits, roomId);
    const rooms = {
        ...doc.rooms,
        [roomId]: {
            ...room,
            x,
            y,
            z,
            kind: 'grid' as const,
            anchorRoomId: null,
            roomNumber: nextRoomNumber
        }
    };
    const exits = autoConnectRoom(rooms, clearedExits, roomId);

    return {
        ...doc,
        selectedRoomId: roomId,
        rooms,
        exits
    };
};

// Move a group of rooms by a cell offset, keeping their relative layout. The
// whole move is rejected if any destination cell is occupied by a room outside
// the moving group, so a multi-selected drag never overlaps existing rooms.
export const moveShaperRooms = (
    doc: ShaperWorkspaceDoc,
    roomIds: ShaperRoomId[],
    dx: number,
    dy: number,
    z: number
): ShaperWorkspaceDoc => {
    const moving = roomIds.filter(id => doc.rooms[id]);
    if (moving.length === 0 || (dx === 0 && dy === 0)) return doc;

    const movingSet = new Set(moving);
    const occupied = new Set<string>();
    for (const room of Object.values(doc.rooms)) {
        if (room.kind !== 'grid' || movingSet.has(room.id)) continue;
        occupied.add(cellKey(room.x, room.y, room.z));
    }
    for (const id of moving) {
        const room = doc.rooms[id];
        if (occupied.has(cellKey(room.x + dx, room.y + dy, z))) return doc;
    }

    let exits = { ...doc.exits };
    for (const id of moving) {
        exits = clearRoomCardinals(exits, id);
    }

    const rooms = { ...doc.rooms };
    for (const id of moving) {
        const room = doc.rooms[id];
        const x = room.x + dx;
        const y = room.y + dy;
        const preferredRoomNumber = formatRoomNumber(doc.zoneNumber, x, y);
        const nextRoomNumber = isRoomNumberFree({ ...doc, rooms }, preferredRoomNumber, id)
            ? preferredRoomNumber
            : uniqueRoomNumber({ ...doc, rooms }, room.roomNumber, id);
        rooms[id] = {
            ...room,
            x,
            y,
            z,
            kind: 'grid' as const,
            anchorRoomId: null,
            roomNumber: nextRoomNumber
        };
    }

    for (const id of moving) {
        exits = autoConnectRoom(rooms, exits, id);
    }

    return { ...doc, rooms, exits };
};

export const moveShaperRoomToLayer = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    z: number
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room || room.z === z) return doc;
    if (room.kind === 'grid' && !isShaperCellFree(doc, room.x, room.y, z, roomId)) return doc;

    const rooms = {
        ...doc.rooms,
        [roomId]: {
            ...room,
            z
        }
    };

    const clearedExits = room.kind === 'grid'
        ? clearRoomCardinals(doc.exits, roomId)
        : doc.exits;
    const exits = room.kind === 'grid'
        ? autoConnectRoom(rooms, clearedExits, roomId)
        : clearedExits;

    return {
        ...doc,
        selectedRoomId: roomId,
        rooms,
        exits
    };
};

// --- Remove Section ---
export const removeShaperRooms = (doc: ShaperWorkspaceDoc, roomIds: ShaperRoomId[]): ShaperWorkspaceDoc => {
    const removing = new Set(roomIds.filter(id => doc.rooms[id]));
    if (removing.size === 0) return doc;

    const rooms = { ...doc.rooms };
    for (const id of removing) {
        delete rooms[id];
    }

    const exits: Record<string, ShaperExitDraft> = {};
    for (const [id, exit] of Object.entries(doc.exits)) {
        if (removing.has(exit.fromRoomId) || (exit.toRoomId && removing.has(exit.toRoomId))) continue;
        exits[id] = exit;
    }

    const activeRooms = Object.values(rooms).filter(r => !r.inactive);
    const fallbackId = removing.has(doc.selectedRoomId)
        ? activeRooms[0]?.id ?? Object.keys(rooms)[0] ?? ''
        : doc.selectedRoomId;

    return { ...doc, rooms, exits, selectedRoomId: fallbackId };
};

export const removeShaperRoom = (doc: ShaperWorkspaceDoc, roomId: ShaperRoomId): ShaperWorkspaceDoc =>
    removeShaperRooms(doc, [roomId]);
// --- Extra Room Section ---
export const addShaperExtraRoom = (doc: ShaperWorkspaceDoc, z: number): ShaperWorkspaceDoc => {
    const extraIndex = Object.values(doc.rooms).filter(room => room.kind === 'extra').length + 1;
    const id = createShaperRoomId();
    const room: ShaperRoomDraft = {
        id,
        x: extraIndex,
        y: 0,
        z,
        kind: 'extra',
        anchorRoomId: doc.selectedRoomId,
        roomNumber: nextAvailableRoomNumber(doc),
        status: 'new-draft',
        name: '',
        preposition: 'in',
        description: '',
        sector: '',
        flags: [],
        owner: '',
        keywords: [],
        notes: '',
        annotations: [],
        mobs: [],
        objects: []
    };
    return {
        ...doc,
        selectedRoomId: id,
        rooms: {
            ...doc.rooms,
            [id]: room
        }
    };
};
