/**
 * @file ShaperConnectionRenderModel.ts
 * @description Builds Shaper connection and barrier render models.
 */

import type { ShaperDirection, ShaperExitDraft, ShaperRoomDraft, ShaperRoomId } from '../model/shaperTypes';
import { SHAPER_CELL } from '../hooks/useShaperCanvasView';
import { getNodePosition, getOppositeDirection, type ShaperPoint } from './ShaperCanvasGeometry';

// --- Types Section ---
export interface RenderedExit {
    key: string;
    aId: ShaperRoomId;
    bId: ShaperRoomId;
    dirAB: ShaperDirection;
    dirBA: ShaperDirection;
    posA: ShaperPoint;
    posB: ShaperPoint;
    hasReverse: boolean;
    isDotted: boolean;
    offset: number;
}

export interface RenderedBarrier {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface RenderedConnectionHint {
    key: string;
    posA: ShaperPoint;
    posB: ShaperPoint;
}

const directions: ShaperDirection[] = ['n', 'e', 's', 'w', 'u', 'd'];

const cardinalOffsets: Partial<Record<ShaperDirection, { dx: number; dy: number }>> = {
    n: { dx: 0, dy: -1 },
    s: { dx: 0, dy: 1 },
    e: { dx: 1, dy: 0 },
    w: { dx: -1, dy: 0 }
};

// --- Connection Model Section ---
const isCardinalNeighborExit = (
    roomA: ShaperRoomDraft,
    roomB: ShaperRoomDraft,
    direction: ShaperDirection
): boolean => {
    const offset = cardinalOffsets[direction];
    if (!offset || roomA.z !== roomB.z) return false;
    return roomB.x === roomA.x + offset.dx && roomB.y === roomA.y + offset.dy;
};

const getReverseDirection = (
    exit: ShaperExitDraft,
    exits: Record<string, ShaperExitDraft>
): { dirBA: ShaperDirection; hasReverse: boolean } => {
    for (const dir of directions) {
        const reverse = exits[`${exit.toRoomId}:${dir}`];
        if (reverse?.toRoomId === exit.fromRoomId) {
            return { dirBA: dir, hasReverse: true };
        }
    }
    return { dirBA: getOppositeDirection(exit.direction), hasReverse: false };
};

export const buildRenderedExits = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    viewZ: number,
    showExits: boolean
): RenderedExit[] => {
    if (!showExits) return [];
    const list: RenderedExit[] = [];

    for (const exit of Object.values(exits)) {
        if (!exit.toRoomId) continue;
        const roomA = rooms[exit.fromRoomId];
        const roomB = rooms[exit.toRoomId];
        if (!roomA || !roomB) continue;
        if (roomA.inactive || roomB.inactive) continue;
        if (roomA.z !== viewZ && roomB.z !== viewZ) continue;

        const { dirBA, hasReverse } = getReverseDirection(exit, exits);

        list.push({
            key: exit.id,
            aId: exit.fromRoomId,
            bId: exit.toRoomId,
            dirAB: exit.direction,
            dirBA,
            posA: getNodePosition(roomA.x, roomA.y, exit.direction),
            posB: getNodePosition(roomB.x, roomB.y, dirBA),
            hasReverse,
            isDotted: false,
            offset: hasReverse ? 14 : 0
        });
    }
    return list;
};

export const buildRenderedConnectionHints = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    viewZ: number,
    showExits: boolean
): RenderedConnectionHint[] => {
    if (showExits) return [];
    const list: RenderedConnectionHint[] = [];
    const seen = new Set<string>();

    for (const exit of Object.values(exits)) {
        if (!exit.toRoomId) continue;
        const roomA = rooms[exit.fromRoomId];
        const roomB = rooms[exit.toRoomId];
        if (!roomA || !roomB) continue;
        if (roomA.inactive || roomB.inactive) continue;
        if (roomA.z !== viewZ || roomB.z !== viewZ) continue;

        const { dirBA, hasReverse } = getReverseDirection(exit, exits);
        const isDirectCardinalNeighbor = isCardinalNeighborExit(roomA, roomB, exit.direction);
        if (isDirectCardinalNeighbor && hasReverse) continue;

        const roomPair = [exit.fromRoomId, exit.toRoomId].sort().join(':');
        const hintKey = hasReverse ? `hint:${roomPair}` : `hint:${exit.id}`;
        if (seen.has(hintKey)) continue;
        seen.add(hintKey);

        list.push({
            key: hintKey,
            posA: getNodePosition(roomA.x, roomA.y, exit.direction),
            posB: getNodePosition(roomB.x, roomB.y, dirBA)
        });
    }
    return list;
};

// --- Barrier Model Section ---
export const buildRenderedBarriers = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    viewZ: number,
    showExits: boolean
): RenderedBarrier[] => {
    if (showExits) return [];
    const list: RenderedBarrier[] = [];
    const roomByCoords = new Map<string, ShaperRoomDraft>();
    for (const room of Object.values(rooms)) {
        if (room.z === viewZ && room.kind === 'grid' && !room.inactive) {
            roomByCoords.set(`${room.x},${room.y}`, room);
        }
    }

    for (const room of roomByCoords.values()) {
        const rx = room.x * SHAPER_CELL;
        const ry = room.y * SHAPER_CELL;
        const northNeighbor = roomByCoords.get(`${room.x},${room.y - 1}`);
        const westNeighbor = roomByCoords.get(`${room.x - 1},${room.y}`);

        if (!northNeighbor && !exits[`${room.id}:n`]?.toRoomId) {
            list.push({ key: `barrier-edge-n-${room.id}`, x1: rx, y1: ry, x2: rx + SHAPER_CELL, y2: ry });
        }

        if (!westNeighbor && !exits[`${room.id}:w`]?.toRoomId) {
            list.push({ key: `barrier-edge-w-${room.id}`, x1: rx, y1: ry, x2: rx, y2: ry + SHAPER_CELL });
        }

        const eastNeighbor = roomByCoords.get(`${room.x + 1},${room.y}`);
        if (eastNeighbor) {
            const hasConnection = exits[`${room.id}:e`]?.toRoomId === eastNeighbor.id ||
                exits[`${eastNeighbor.id}:w`]?.toRoomId === room.id;
            if (!hasConnection) {
                const midX = (room.x + 1) * SHAPER_CELL;
                list.push({ key: `barrier-h-${room.id}-${eastNeighbor.id}`, x1: midX, y1: ry, x2: midX, y2: ry + SHAPER_CELL });
            }
        } else if (!exits[`${room.id}:e`]?.toRoomId) {
            const midX = (room.x + 1) * SHAPER_CELL;
            list.push({ key: `barrier-edge-e-${room.id}`, x1: midX, y1: ry, x2: midX, y2: ry + SHAPER_CELL });
        }

        const southNeighbor = roomByCoords.get(`${room.x},${room.y + 1}`);
        if (southNeighbor) {
            const hasConnection = exits[`${room.id}:s`]?.toRoomId === southNeighbor.id ||
                exits[`${southNeighbor.id}:n`]?.toRoomId === room.id;
            if (!hasConnection) {
                const midY = (room.y + 1) * SHAPER_CELL;
                list.push({ key: `barrier-v-${room.id}-${southNeighbor.id}`, x1: rx, y1: midY, x2: rx + SHAPER_CELL, y2: midY });
            }
        } else if (!exits[`${room.id}:s`]?.toRoomId) {
            const midY = (room.y + 1) * SHAPER_CELL;
            list.push({ key: `barrier-edge-s-${room.id}`, x1: rx, y1: midY, x2: rx + SHAPER_CELL, y2: midY });
        }
    }
    return list;
};
