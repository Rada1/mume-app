/**
 * @file shaperExits.ts
 * @description Directed-edge exit model for the concept grid. A connection
 *              between two adjacent rooms is represented by directed exits.
 *              A two-way path is two one-way exits in opposite directions.
 */

import type { ShaperDirection, ShaperExitDraft, ShaperRoomId, ShaperRoomDraft, ShaperWorkspaceDoc } from './shaperTypes';

// --- Types Section ---
export type ShaperExitState = 'none' | 'two-way' | 'forward' | 'reverse';

const exitKey = (fromRoomId: ShaperRoomId, direction: ShaperDirection): string =>
    `${fromRoomId}:${direction}`;

// --- Read Section ---
// Connection state between A and B, where dirAB is the direction A->B and dirBA
// is the reverse. "forward" = A->B only, "reverse" = B->A only.
export const getExitState = (
    exits: Record<string, ShaperExitDraft>,
    aId: ShaperRoomId,
    bId: ShaperRoomId,
    dirAB: ShaperDirection,
    dirBA: ShaperDirection
): ShaperExitState => {
    const ab = exits[exitKey(aId, dirAB)]?.toRoomId === bId;
    const ba = exits[exitKey(bId, dirBA)]?.toRoomId === aId;
    if (ab && ba) return 'two-way';
    if (ab) return 'forward';
    if (ba) return 'reverse';
    return 'none';
};

// --- Write Section ---
const makeExit = (
    fromRoomId: ShaperRoomId,
    direction: ShaperDirection,
    toRoomId: ShaperRoomId,
    isTwoWay: boolean
): ShaperExitDraft => ({ id: exitKey(fromRoomId, direction), fromRoomId, direction, toRoomId, isTwoWay });

const writeExits = (
    exits: Record<string, ShaperExitDraft>,
    state: ShaperExitState,
    aId: ShaperRoomId,
    bId: ShaperRoomId,
    dirAB: ShaperDirection,
    dirBA: ShaperDirection
): Record<string, ShaperExitDraft> => {
    const next = { ...exits };
    delete next[exitKey(aId, dirAB)];
    delete next[exitKey(bId, dirBA)];
    if (state === 'two-way') {
        next[exitKey(aId, dirAB)] = makeExit(aId, dirAB, bId, false);
        next[exitKey(bId, dirBA)] = makeExit(bId, dirBA, aId, false);
    } else if (state === 'forward') {
        next[exitKey(aId, dirAB)] = makeExit(aId, dirAB, bId, false);
    } else if (state === 'reverse') {
        next[exitKey(bId, dirBA)] = makeExit(bId, dirBA, aId, false);
    }
    return next;
};

const NEXT_STATE: Record<ShaperExitState, ShaperExitState> = {
    none: 'two-way',
    'two-way': 'forward',
    forward: 'reverse',
    reverse: 'none'
};

// Advance the connection between A and B to the next state in the cycle.
export const cycleShaperExit = (
    doc: ShaperWorkspaceDoc,
    aId: ShaperRoomId,
    bId: ShaperRoomId,
    dirAB: ShaperDirection,
    dirBA: ShaperDirection
): ShaperWorkspaceDoc => {
    const current = getExitState(doc.exits, aId, bId, dirAB, dirBA);
    const next = NEXT_STATE[current];
    return { ...doc, exits: writeExits(doc.exits, next, aId, bId, dirAB, dirBA) };
};

// Explicitly set the connection state between A and B.
export const setShaperExitState = (
    doc: ShaperWorkspaceDoc,
    aId: ShaperRoomId,
    bId: ShaperRoomId,
    dirAB: ShaperDirection,
    dirBA: ShaperDirection,
    state: ShaperExitState
): ShaperWorkspaceDoc => {
    return { ...doc, exits: writeExits(doc.exits, state, aId, bId, dirAB, dirBA) };
};

export const upsertShaperDirectedExit = (
    doc: ShaperWorkspaceDoc,
    fromRoomId: ShaperRoomId,
    toRoomId: ShaperRoomId,
    direction: ShaperDirection
): ShaperWorkspaceDoc => {
    const key = exitKey(fromRoomId, direction);
    const existing = doc.exits[key];
    return {
        ...doc,
        exits: {
            ...doc.exits,
            [key]: {
                ...existing,
                id: key,
                fromRoomId,
                direction,
                toRoomId,
                isTwoWay: false
            }
        }
    };
};

export const removeShaperExit = (
    doc: ShaperWorkspaceDoc,
    fromRoomId: ShaperRoomId,
    direction: ShaperDirection
): ShaperWorkspaceDoc => {
    const next = { ...doc.exits };
    delete next[exitKey(fromRoomId, direction)];
    return { ...doc, exits: next };
};

export const clearRoomCardinals = (
    exits: Record<string, ShaperExitDraft>,
    roomId: ShaperRoomId
): Record<string, ShaperExitDraft> => {
    const next = { ...exits };
    for (const [key, exit] of Object.entries(next)) {
        if (exit.fromRoomId === roomId || exit.toRoomId === roomId) {
            if (['n', 's', 'e', 'w'].includes(exit.direction)) {
                delete next[key];
            }
        }
    }
    return next;
};

export const autoConnectRoom = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    roomId: ShaperRoomId
): Record<string, ShaperExitDraft> => {
    const room = rooms[roomId];
    if (!room || room.kind !== 'grid' || room.inactive) return exits;

    const nextExits = { ...exits };
    const neighbors: { dir: ShaperDirection; oppDir: ShaperDirection; dx: number; dy: number }[] = [
        { dir: 'n', oppDir: 's', dx: 0, dy: -1 },
        { dir: 's', oppDir: 'n', dx: 0, dy: 1 },
        { dir: 'e', oppDir: 'w', dx: 1, dy: 0 },
        { dir: 'w', oppDir: 'e', dx: -1, dy: 0 }
    ];

    for (const n of neighbors) {
        const nx = room.x + n.dx;
        const ny = room.y + n.dy;
        const neighborRoom = Object.values(rooms).find(
            r => r.kind === 'grid' && r.x === nx && r.y === ny && r.z === room.z && !r.inactive
        );
        if (neighborRoom) {
            const keyAB = `${roomId}:${n.dir}`;
            const keyBA = `${neighborRoom.id}:${n.oppDir}`;
            nextExits[keyAB] = {
                id: keyAB,
                fromRoomId: roomId,
                direction: n.dir,
                toRoomId: neighborRoom.id,
                isTwoWay: false
            };
            nextExits[keyBA] = {
                id: keyBA,
                fromRoomId: neighborRoom.id,
                direction: n.oppDir,
                toRoomId: roomId,
                isTwoWay: false
            };
        }
    }
    return nextExits;
};

export const autoConnectAllRooms = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>
): Record<string, ShaperExitDraft> => {
    let nextExits = { ...exits };
    for (const roomId of Object.keys(rooms)) {
        nextExits = autoConnectRoom(rooms, nextExits, roomId);
    }
    return nextExits;
};

export const toggleShaperExitDoor = (
    doc: ShaperWorkspaceDoc,
    fromRoomId: ShaperRoomId,
    direction: ShaperDirection
): ShaperWorkspaceDoc => {
    const key = `${fromRoomId}:${direction}`;
    const exit = doc.exits[key];
    if (!exit) return doc;
    return {
        ...doc,
        exits: {
            ...doc.exits,
            [key]: {
                ...exit,
                hasDoor: !exit.hasDoor
            }
        }
    };
};
