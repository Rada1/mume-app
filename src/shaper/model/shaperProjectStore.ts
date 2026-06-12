/**
 * @file shaperProjectStore.ts
 * @description Local project persistence for Shaper foundation builds.
 */

import { createDefaultShaperDocument } from './shaperDocument';
import { autoConnectAllRooms } from './shaperExits';
import { publishShaperProjectEvent, subscribeShaperProjectSync } from './shaperProjectSync';
import type { ShaperAnnotation, ShaperCommandNode, ShaperItemRef, ShaperMobPlacement, ShaperProjectSummary, ShaperRoomDraft, ShaperWorkspaceDoc } from './shaperTypes';

const PROJECTS_KEY = 'mume.shaper.projects';
const DOC_PREFIX = 'mume.shaper.project.';

export type ShaperEntityProjectEvent =
    | { type: 'mob-added'; projectId: string; roomId: string; mob: ShaperMobPlacement; updatedAt: number }
    | { type: 'mob-removed'; projectId: string; roomId: string; mobId: string; updatedAt: number }
    | { type: 'object-added'; projectId: string; roomId: string; object: ShaperItemRef; updatedAt: number }
    | { type: 'object-removed'; projectId: string; roomId: string; objectId: string; updatedAt: number }
    | { type: 'mob-object-added'; projectId: string; roomId: string; mobId: string; object: ShaperItemRef; updatedAt: number }
    | { type: 'mob-object-removed'; projectId: string; roomId: string; mobId: string; objectId: string; updatedAt: number };

export type ShaperLocalEntityEvent = ShaperEntityProjectEvent extends infer Event
    ? Event extends ShaperEntityProjectEvent ? Omit<Event, 'projectId' | 'updatedAt'> : never
    : never;

export type ShaperProjectEvent =
    | { type: 'project-saved'; doc: ShaperWorkspaceDoc }
    | { type: 'project-deleted'; projectId: string }
    | { type: 'room-patched'; projectId: string; roomId: string; patch: Partial<ShaperRoomDraft>; updatedAt: number }
    | { type: 'annotation-added'; projectId: string; roomId: string; annotation: ShaperAnnotation; updatedAt: number }
    | { type: 'annotation-removed'; projectId: string; roomId: string; annotationId: string; updatedAt: number }
    | ShaperEntityProjectEvent;

// --- Storage Helpers Section ---
const readJson = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

const writeJson = (key: string, value: unknown): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
};

const removeStorageItem = (key: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
};

// --- Migration Section ---
const normalizeRoom = (room: ShaperRoomDraft): ShaperRoomDraft => ({
    ...room,
    z: room.z ?? 0,
    kind: room.kind ?? 'grid',
    anchorRoomId: room.anchorRoomId ?? null,
    owner: room.owner ?? '',
    keywords: room.keywords ?? [],
    annotations: room.annotations ?? [],
    mobs: room.mobs ?? [],
    objects: room.objects ?? []
});

const normalizeDocument = (doc: ShaperWorkspaceDoc | null): ShaperWorkspaceDoc | null => {
    if (!doc) return null;
    const rooms = Object.fromEntries(
        Object.entries(doc.rooms)
            .filter(([, room]) => !room.inactive)
            .map(([id, room]) => [id, normalizeRoom(room)])
    ) as Record<string, ShaperRoomDraft>;
    const commandNodes = Object.fromEntries(
        Object.entries(doc.commandNodes ?? {}).map(([id, node], index) => [id, { ...node, order: node.order ?? index }])
    ) as Record<string, ShaperCommandNode>;
    const selectedRoomId = rooms[doc.selectedRoomId] ? doc.selectedRoomId : Object.keys(rooms)[0] ?? '';
    return {
        ...doc,
        selectedRoomId,
        rooms,
        exits: Object.keys(doc.exits).length > 0 ? doc.exits : autoConnectAllRooms(rooms, {}),
        commandNodes,
        libraries: doc.libraries ?? {}
    };
};

// --- Project Section ---
export const listShaperProjects = (): ShaperProjectSummary[] =>
    readJson<ShaperProjectSummary[]>(PROJECTS_KEY, [])
        .sort((a, b) => b.updatedAt - a.updatedAt);

export const loadShaperProject = (id: string): ShaperWorkspaceDoc | null =>
    normalizeDocument(readJson<ShaperWorkspaceDoc | null>(`${DOC_PREFIX}${id}`, null));

const writeShaperProject = (doc: ShaperWorkspaceDoc, touchUpdatedAt: boolean): ShaperWorkspaceDoc => {
    const nextDoc = touchUpdatedAt ? { ...doc, updatedAt: Date.now() } : doc;
    const summaries = listShaperProjects().filter(project => project.id !== doc.id);
    summaries.push({
        id: nextDoc.id,
        name: nextDoc.name,
        zoneNumber: nextDoc.zoneNumber,
        updatedAt: nextDoc.updatedAt,
        shared: nextDoc.shared ?? false
    });
    writeJson(`${DOC_PREFIX}${doc.id}`, nextDoc);
    writeJson(PROJECTS_KEY, summaries);
    return nextDoc;
};

export const saveShaperProject = (doc: ShaperWorkspaceDoc): void => {
    const saved = writeShaperProject(doc, true);
    // Private projects never leave the device; only shared ones publish to the relay.
    if (saved.shared) publishShaperProjectEvent({ type: 'project-saved', doc: saved });
};

export const saveShaperRoomPatch = (
    doc: ShaperWorkspaceDoc,
    roomIds: string[],
    patch: Partial<ShaperRoomDraft>
): ShaperWorkspaceDoc => {
    const nextDoc = writeShaperProject(doc, true);
    if (nextDoc.shared) {
        for (const roomId of roomIds) {
            publishShaperProjectEvent({ type: 'room-patched', projectId: nextDoc.id, roomId, patch, updatedAt: nextDoc.updatedAt });
        }
    }
    return nextDoc;
};

const applyAnnotationAdd = (
    doc: ShaperWorkspaceDoc,
    roomId: string,
    annotation: ShaperAnnotation,
    updatedAt: number
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room || room.annotations.some(item => item.id === annotation.id)) return doc;
    return {
        ...doc,
        updatedAt: Math.max(doc.updatedAt, updatedAt),
        rooms: { ...doc.rooms, [roomId]: { ...room, annotations: [...room.annotations, annotation] } }
    };
};

const applyAnnotationRemove = (
    doc: ShaperWorkspaceDoc,
    roomId: string,
    annotationId: string,
    updatedAt: number
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room || !room.annotations.some(item => item.id === annotationId)) return doc;
    return {
        ...doc,
        updatedAt: Math.max(doc.updatedAt, updatedAt),
        rooms: { ...doc.rooms, [roomId]: { ...room, annotations: room.annotations.filter(item => item.id !== annotationId) } }
    };
};

// --- Entity Operation Section ---
const touchRoom = (
    doc: ShaperWorkspaceDoc,
    roomId: string,
    updatedAt: number,
    transform: (room: ShaperRoomDraft) => ShaperRoomDraft
): ShaperWorkspaceDoc => {
    const room = doc.rooms[roomId];
    if (!room) return doc;
    return { ...doc, updatedAt: Math.max(doc.updatedAt, updatedAt), rooms: { ...doc.rooms, [roomId]: transform(room) } };
};

const applyEntityEvent = (doc: ShaperWorkspaceDoc, event: ShaperEntityProjectEvent): ShaperWorkspaceDoc => {
    if (event.type === 'mob-added') return touchRoom(doc, event.roomId, event.updatedAt, room =>
        room.mobs.some(mob => mob.id === event.mob.id) ? room : { ...room, mobs: [...room.mobs, event.mob] });
    if (event.type === 'mob-removed') return touchRoom(doc, event.roomId, event.updatedAt, room =>
        ({ ...room, mobs: room.mobs.filter(mob => mob.id !== event.mobId) }));
    if (event.type === 'object-added') return touchRoom(doc, event.roomId, event.updatedAt, room =>
        room.objects.some(obj => obj.id === event.object.id) ? room : { ...room, objects: [...room.objects, event.object] });
    if (event.type === 'object-removed') return touchRoom(doc, event.roomId, event.updatedAt, room =>
        ({ ...room, objects: room.objects.filter(obj => obj.id !== event.objectId) }));
    if (event.type === 'mob-object-added') return touchRoom(doc, event.roomId, event.updatedAt, room => ({
        ...room,
        mobs: room.mobs.map(mob => mob.id === event.mobId && !mob.items.some(item => item.id === event.object.id)
            ? { ...mob, items: [...mob.items, event.object] } : mob)
    }));
    if (event.type === 'mob-object-removed') return touchRoom(doc, event.roomId, event.updatedAt, room => ({
        ...room,
        mobs: room.mobs.map(mob => mob.id === event.mobId
            ? { ...mob, items: mob.items.filter(item => item.id !== event.objectId) } : mob)
    }));
    return doc;
};

export const saveShaperAnnotationAdd = (
    doc: ShaperWorkspaceDoc,
    roomId: string,
    annotation: ShaperAnnotation
): ShaperWorkspaceDoc => {
    const updatedAt = Date.now();
    const nextDoc = writeShaperProject(applyAnnotationAdd(doc, roomId, annotation, updatedAt), false);
    if (nextDoc.shared) publishShaperProjectEvent({ type: 'annotation-added', projectId: nextDoc.id, roomId, annotation, updatedAt });
    return nextDoc;
};

export const saveShaperAnnotationRemove = (
    doc: ShaperWorkspaceDoc,
    roomId: string,
    annotationId: string
): ShaperWorkspaceDoc => {
    const updatedAt = Date.now();
    const nextDoc = writeShaperProject(applyAnnotationRemove(doc, roomId, annotationId, updatedAt), false);
    if (nextDoc.shared) publishShaperProjectEvent({ type: 'annotation-removed', projectId: nextDoc.id, roomId, annotationId, updatedAt });
    return nextDoc;
};

export const saveShaperEntityEvent = (
    doc: ShaperWorkspaceDoc,
    event: ShaperLocalEntityEvent
): ShaperWorkspaceDoc => {
    const updatedAt = Date.now();
    const fullEvent = { ...event, projectId: doc.id, updatedAt } as ShaperEntityProjectEvent;
    const nextDoc = writeShaperProject(applyEntityEvent(doc, fullEvent), false);
    if (nextDoc.shared) publishShaperProjectEvent(fullEvent);
    return nextDoc;
};

const removeShaperProject = (id: string): void => {
    const summaries = listShaperProjects().filter(project => project.id !== id);
    removeStorageItem(`${DOC_PREFIX}${id}`);
    writeJson(PROJECTS_KEY, summaries);
};

export const deleteShaperProject = (id: string): void => {
    removeShaperProject(id);
    publishShaperProjectEvent({ type: 'project-deleted', projectId: id });
};

export const createShaperProject = (name: string, zoneNumber: number): ShaperWorkspaceDoc => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `project-${Date.now()}`;
    const doc = createDefaultShaperDocument({ id, name, zoneNumber });
    saveShaperProject(doc);
    return doc;
};

export const subscribeShaperProjectEvents = (
    onEvent: (event: ShaperProjectEvent) => void
): (() => void) => subscribeShaperProjectSync(event => {
    if (event.type === 'project-saved') writeShaperProject(event.doc, false);
    if (event.type === 'project-deleted') removeShaperProject(event.projectId);
    if (event.type === 'room-patched') {
        const doc = loadShaperProject(event.projectId);
        const room = doc?.rooms[event.roomId];
        if (doc && room && event.updatedAt > doc.updatedAt) {
            writeShaperProject({
                ...doc,
                updatedAt: event.updatedAt,
                rooms: { ...doc.rooms, [event.roomId]: { ...room, ...event.patch } }
            }, false);
        }
    }
    if (event.type === 'annotation-added') {
        const doc = loadShaperProject(event.projectId);
        if (doc) writeShaperProject(applyAnnotationAdd(doc, event.roomId, event.annotation, event.updatedAt), false);
    }
    if (event.type === 'annotation-removed') {
        const doc = loadShaperProject(event.projectId);
        if (doc) writeShaperProject(applyAnnotationRemove(doc, event.roomId, event.annotationId, event.updatedAt), false);
    }
    if (event.type === 'mob-added' || event.type === 'mob-removed' || event.type === 'object-added' ||
        event.type === 'object-removed' || event.type === 'mob-object-added' || event.type === 'mob-object-removed') {
        const doc = loadShaperProject(event.projectId);
        if (doc) writeShaperProject(applyEntityEvent(doc, event), false);
    }
    onEvent(event);
});
