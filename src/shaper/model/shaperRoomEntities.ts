/**
 * @file shaperRoomEntities.ts
 * @description Immutable helpers for the mobs and objects placed in a room, and
 *              the objects loaded on each placed mob.
 */

import { createShaperRoomId } from './shaperDocument';
import type {
    ShaperItemRef,
    ShaperMobPlacement,
    ShaperRoomDraft,
    ShaperRoomId,
    ShaperWorkspaceDoc
} from './shaperTypes';

// --- Helpers Section ---
export const makeShaperItem = (vnum: string, name: string): ShaperItemRef => ({
    id: createShaperRoomId(),
    vnum: vnum.trim(),
    name: name.trim()
});

export const makeShaperMob = (vnum: string, name: string): ShaperMobPlacement => ({
    id: createShaperRoomId(),
    vnum: vnum.trim(),
    name: name.trim(),
    items: []
});

// Apply a transform to one room and write it back into the document.
const patchRoom = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    transform: (room: ShaperRoomDraft) => ShaperRoomDraft
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room) return doc;
    return { ...doc, rooms: { ...doc.rooms, [roomId]: transform(room) } };
};

// --- Room Mob Section ---
export const addRoomMob = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    vnum: string,
    name: string
): ShaperWorkspaceDoc => {
    return patchRoom(doc, roomId, room => ({ ...room, mobs: [...room.mobs, makeShaperMob(vnum, name)] }));
};

export const removeRoomMob = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    mobId: string
): ShaperWorkspaceDoc =>
    patchRoom(doc, roomId, room => ({ ...room, mobs: room.mobs.filter(mob => mob.id !== mobId) }));

// --- Room Object Section ---
export const addRoomObject = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    vnum: string,
    name: string
): ShaperWorkspaceDoc =>
    patchRoom(doc, roomId, room => ({ ...room, objects: [...room.objects, makeShaperItem(vnum, name)] }));

export const removeRoomObject = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    objectId: string
): ShaperWorkspaceDoc =>
    patchRoom(doc, roomId, room => ({ ...room, objects: room.objects.filter(obj => obj.id !== objectId) }));

// --- Mob Item Section ---
export const addMobItem = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    mobId: string,
    vnum: string,
    name: string
): ShaperWorkspaceDoc =>
    patchRoom(doc, roomId, room => ({
        ...room,
        mobs: room.mobs.map(mob =>
            mob.id === mobId ? { ...mob, items: [...mob.items, makeShaperItem(vnum, name)] } : mob
        )
    }));

export const removeMobItem = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    mobId: string,
    itemId: string
): ShaperWorkspaceDoc =>
    patchRoom(doc, roomId, room => ({
        ...room,
        mobs: room.mobs.map(mob =>
            mob.id === mobId ? { ...mob, items: mob.items.filter(item => item.id !== itemId) } : mob
        )
    }));
