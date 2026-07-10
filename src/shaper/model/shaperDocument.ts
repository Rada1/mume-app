/**
 * @file shaperDocument.ts
 * @description Creates default Shaper concept documents.
 */

import { autoConnectAllRooms } from './shaperExits';
import type { ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from './shaperTypes';

// --- Room Factory Section ---
export const createRoomId = (x: number, y: number, z = 0): ShaperRoomId => `room-${x}-${y}-${z}`;

let roomIdCounter = 0;
// Unique id for rooms created or relocated at runtime, decoupled from coordinates
// so a freed cell can be reused without colliding with a room that moved away.
export const createShaperRoomId = (): ShaperRoomId =>
    `room-${Date.now().toString(36)}-${(roomIdCounter += 1)}`;

export const formatRoomNumber = (zoneNumber: number, x: number, y: number): string =>
    x < 10 && y < 10 ? `${zoneNumber}:${x}${y}` : `${zoneNumber}:${x}-${y}`;

export const createGridRoom = (
    zoneNumber: number,
    x: number,
    y: number,
    z = 0
): ShaperRoomDraft => ({
    id: createRoomId(x, y, z),
    x,
    y,
    z,
    kind: 'grid',
    anchorRoomId: null,
    roomNumber: formatRoomNumber(zoneNumber, x, y),
    status: 'new-draft',
    name: '',
    preposition: '',
    description: '',
    sector: '',
    flags: [],
    owner: '',
    keywords: [],
    notes: '',
    annotations: [],
    mobs: [],
    objects: [],
    liveSnapshot: undefined
});

interface ShaperDocumentOptions {
    id?: string;
    name?: string;
    zoneNumber?: number;
}

// --- Document Factory Section ---
export const createDefaultShaperDocument = (options: ShaperDocumentOptions = {}): ShaperWorkspaceDoc => {
    const zoneNumber = options.zoneNumber ?? 300;
    const rooms = {} as Record<ShaperRoomId, ShaperRoomDraft>;

    for (let y = 0; y < 10; y += 1) {
        for (let x = 0; x < 10; x += 1) {
            const room = createGridRoom(zoneNumber, x, y);
            rooms[room.id] = room;
        }
    }

    return {
        id: options.id ?? 'local-shaper-workspace',
        name: options.name ?? 'Concept Zone Draft',
        zoneNumber,
        updatedAt: Date.now(),
        selectedRoomId: createRoomId(0, 0),
        rooms,
        exits: autoConnectAllRooms(rooms, {}),
        commandNodes: {},
        libraries: {},
        zoneInfoKeywords: {}
    };
};
