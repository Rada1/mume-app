/**
 * @file shaperRoomProse.ts
 * @description Agent-facing helpers for Shaper room names and descriptions.
 */

import { listShaperComRoomEntities } from './shaperComCommands';
import { hasShaperExitClimb, hasShaperExitDoor } from './shaperExitFlags';
import { listShaperLibraries } from './shaperLibraries';
import type { ShaperDirection, ShaperDoorFlag, ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from './shaperTypes';

// --- Type Section ---
export type ShaperRoomProsePatch = {
    name?: string;
    preposition?: string;
    description?: string;
};

export type ShaperRoomNeighborContext = {
    direction: ShaperDirection;
    roomNumber: string;
    name: string;
    sector: string;
};

export type ShaperRoomExitContext = {
    direction: ShaperDirection;
    toRoomId: ShaperRoomId | null;
    toRoomNumber: string | null;
    toName: string;
    hasDoor: boolean;
    doorName: string;
    doorFlags: ShaperDoorFlag[];
    exitType: string;
    exitDescription: string;
    isClimb: boolean;
};

export type ShaperRoomLibraryContext = {
    name: string;
    parameters: Record<string, string | number | boolean>;
    notes: string;
};

export type ShaperRoomEntityContext = {
    vnum: string;
    name: string;
    resetType: string;
    resetDetail: string;
};

export type ShaperRoomProseContext = {
    roomId: ShaperRoomId;
    roomNumber: string;
    kind: string;
    coordinates: { x: number; y: number; z: number };
    name: string;
    preposition: string;
    description: string;
    sector: string;
    flags: string[];
    notes: string;
    libraries: ShaperRoomLibraryContext[];
    mobs: ShaperRoomEntityContext[];
    objects: ShaperRoomEntityContext[];
    exits: ShaperRoomExitContext[];
    neighbors: ShaperRoomNeighborContext[];
    lore?: string;
};

export type ShaperProjectProseContext = {
    projectId: string;
    projectName: string;
    zoneNumber: number;
    lore?: string;
    rooms: ShaperRoomProseContext[];
};

// --- Patch Section ---
const normalizeDescription = (value: string): string =>
    value.replace(/\r\n/g, '\n').trim();

const entityContext = (entity: { vnum: string; name: string; resetType?: string; resetDetail?: string }): ShaperRoomEntityContext => ({
    vnum: entity.vnum,
    name: entity.name,
    resetType: entity.resetType ?? '',
    resetDetail: entity.resetDetail ?? ''
});

export const applyShaperRoomProse = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    patch: ShaperRoomProsePatch
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room) return doc;
    const nextRoom: ShaperRoomDraft = {
        ...room,
        name: patch.name !== undefined ? patch.name.trim() : room.name,
        preposition: patch.preposition !== undefined ? patch.preposition.trim() : room.preposition,
        description: patch.description !== undefined ? normalizeDescription(patch.description) : room.description
    };
    return { ...doc, rooms: { ...doc.rooms, [roomId]: nextRoom } };
};

// --- Context Section ---
export const buildShaperRoomProseContext = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId
): ShaperRoomProseContext | null => {
    const room = doc.rooms[roomId];
    if (!room) return null;
    const roomExits = Object.values(doc.exits).filter(exit => exit.fromRoomId === roomId);
    const neighbors = roomExits.flatMap(exit => {
        if (!exit.toRoomId || !doc.rooms[exit.toRoomId]) return [];
        const target = doc.rooms[exit.toRoomId];
        return [{ direction: exit.direction, roomNumber: target.roomNumber, name: target.name, sector: target.sector }];
    });
    const entities = listShaperComRoomEntities(doc.commandNodes, roomId);
    const lore = doc.zoneInfoKeywords?.lore?.body ?? undefined;
    return {
        roomId,
        roomNumber: room.roomNumber,
        kind: room.kind,
        coordinates: { x: room.x, y: room.y, z: room.z },
        name: room.name,
        preposition: room.preposition,
        description: room.description,
        sector: room.sector,
        flags: room.flags,
        notes: room.notes,
        libraries: listShaperLibraries(doc, 'room', roomId)
            .map(install => ({ name: install.name, parameters: install.parameters, notes: install.notes })),
        mobs: entities.mobs.map(entityContext),
        objects: entities.objects.map(entityContext),
        exits: roomExits.map(exit => {
            const target = exit.toRoomId ? doc.rooms[exit.toRoomId] : null;
            return {
                direction: exit.direction,
                toRoomId: exit.toRoomId,
                toRoomNumber: target?.roomNumber ?? null,
                toName: target?.name ?? '',
                hasDoor: hasShaperExitDoor(exit),
                doorName: exit.doorName ?? '',
                doorFlags: exit.doorFlags ?? [],
                exitType: exit.exitType ?? '',
                exitDescription: exit.exitDescription ?? '',
                isClimb: hasShaperExitClimb(exit)
            };
        }),
        neighbors,
        lore
    };
};

export const buildShaperProjectProseContext = (doc: ShaperWorkspaceDoc): ShaperProjectProseContext => ({
    projectId: doc.id,
    projectName: doc.name,
    zoneNumber: doc.zoneNumber,
    lore: doc.zoneInfoKeywords?.lore?.body ?? undefined,
    rooms: Object.values(doc.rooms)
        .filter(room => !room.inactive)
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
        .map(room => buildShaperRoomProseContext(doc, room.id))
        .filter((room): room is ShaperRoomProseContext => room !== null)
});
