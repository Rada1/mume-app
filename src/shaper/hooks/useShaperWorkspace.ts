/**
 * @file useShaperWorkspace.ts
 * @description Local Shaper workspace state hook for the first foundation slice.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    addShaperExtraRoom,
    addShaperGridRoom,
    addShaperRoomAt,
    moveShaperRoom,
    moveShaperRooms,
    removeShaperRoom,
    removeShaperRooms,
    selectShaperRoom,
    updateShaperRoom
} from '../model/shaperOperations';
import {
    createShaperProject,
    deleteShaperProject,
    listShaperProjects,
    loadShaperProject,
    saveShaperAnnotationAdd,
    saveShaperAnnotationRemove,
    saveShaperProject,
    saveShaperRoomPatch,
    subscribeShaperProjectEvents
} from '../model/shaperProjectStore';
import { validateShaperDocument } from '../model/shaperValidation';
import { useShaperComActions } from './useShaperComActions';
import { useShaperEntityActions } from './useShaperEntityActions';
import { useShaperExitActions } from './useShaperExitActions';
import { useShaperLibraryActions } from './useShaperLibraryActions';
import type { ShaperConnectionSelection } from '../model/shaperTypes';
import type { ShaperAnnotation, ShaperProjectSummary, ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from '../model/shaperTypes';

export const useShaperWorkspace = () => {
    const [projects, setProjects] = useState<ShaperProjectSummary[]>(listShaperProjects);
    const [doc, setDoc] = useState<ShaperWorkspaceDoc | null>(null);
    const [viewZ, setViewZ] = useState(0);
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<ShaperRoomId>>(new Set());
    const [selectedConnection, setSelectedConnection] = useState<ShaperConnectionSelection | null>(null);
    const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());

    const selectedRoom = doc?.rooms[doc.selectedRoomId] ?? null;
    const layers = useMemo(
        () => doc ? Array.from(new Set(Object.values(doc.rooms).map(room => room.z))).sort((a, b) => a - b) : [0],
        [doc]
    );
    const issues = useMemo(() => doc ? validateShaperDocument(doc) : [], [doc]);
    const selectedIssues = useMemo(
        () => doc ? issues.filter(issue => issue.targetId === doc.selectedRoomId || issue.roomId === doc.selectedRoomId) : [],
        [issues, doc]
    );

    useEffect(() => subscribeShaperProjectEvents(event => {
        setProjects(listShaperProjects());
        setDoc(current => {
            if (event.type === 'project-deleted') return current?.id === event.projectId ? null : current;
            if (event.type === 'room-patched') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || event.updatedAt <= current.updatedAt) return current;
                return { ...current, updatedAt: event.updatedAt, rooms: { ...current.rooms, [event.roomId]: { ...room, ...event.patch } } };
            }
            if (event.type === 'annotation-added') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || room.annotations.some(item => item.id === event.annotation.id)) return current;
                return { ...current, updatedAt: Math.max(current.updatedAt, event.updatedAt), rooms: { ...current.rooms, [event.roomId]: { ...room, annotations: [...room.annotations, event.annotation] } } };
            }
            if (event.type === 'annotation-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || !room.annotations.some(item => item.id === event.annotationId)) return current;
                return { ...current, updatedAt: Math.max(current.updatedAt, event.updatedAt), rooms: { ...current.rooms, [event.roomId]: { ...room, annotations: room.annotations.filter(item => item.id !== event.annotationId) } } };
            }
            if (event.type === 'mob-added') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || room.mobs.some(mob => mob.id === event.mob.id)) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, mobs: [...room.mobs, event.mob] } } };
            }
            if (event.type === 'mob-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, mobs: room.mobs.filter(mob => mob.id !== event.mobId) } } };
            }
            if (event.type === 'object-added') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room || room.objects.some(obj => obj.id === event.object.id)) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, objects: [...room.objects, event.object] } } };
            }
            if (event.type === 'object-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room) return current;
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, objects: room.objects.filter(obj => obj.id !== event.objectId) } } };
            }
            if (event.type === 'mob-object-added' || event.type === 'mob-object-removed') {
                const room = current?.id === event.projectId ? current.rooms[event.roomId] : null;
                if (!current || !room) return current;
                const mobs = room.mobs.map(mob => {
                    if (mob.id !== event.mobId) return mob;
                    return event.type === 'mob-object-added'
                        ? { ...mob, items: mob.items.some(item => item.id === event.object.id) ? mob.items : [...mob.items, event.object] }
                        : { ...mob, items: mob.items.filter(item => item.id !== event.objectId) };
                });
                return { ...current, rooms: { ...current.rooms, [event.roomId]: { ...room, mobs } } };
            }
            if (current?.id !== event.doc.id || event.doc.updatedAt <= current.updatedAt) return current;
            return event.doc;
        });
    }), []);

    const persist = (nextDoc: ShaperWorkspaceDoc) => {
        saveShaperProject(nextDoc);
        setProjects(listShaperProjects());
        return nextDoc;
    };
    const persistRoomPatch = (nextDoc: ShaperWorkspaceDoc, roomIds: ShaperRoomId[], patch: Partial<ShaperRoomDraft>) => {
        const savedDoc = saveShaperRoomPatch(nextDoc, roomIds, patch);
        setProjects(listShaperProjects());
        return savedDoc;
    };

    const createProject = (name: string, zoneNumber: number) => {
        const nextDoc = createShaperProject(name, zoneNumber);
        setProjects(listShaperProjects());
        setViewZ(0);
        setSelectedRoomIds(new Set());
        setDoc(nextDoc);
    };

    const openProject = (projectId: string) => {
        const nextDoc = loadShaperProject(projectId);
        if (nextDoc) {
            setViewZ(nextDoc.rooms[nextDoc.selectedRoomId]?.z ?? 0);
            setSelectedRoomIds(new Set());
            setDoc(nextDoc);
        }
    };

    const deleteProject = (projectId: string) => {
        deleteShaperProject(projectId);
        setProjects(listShaperProjects());
        setDoc(current => current?.id === projectId ? null : current);
    };

    const renameProject = (projectId: string, newName: string) => {
        setDoc(current => {
            if (current?.id === projectId) {
                const next = { ...current, name: newName };
                persist(next);
                return next;
            } else {
                const targetDoc = loadShaperProject(projectId);
                if (targetDoc) {
                    targetDoc.name = newName;
                    saveShaperProject(targetDoc);
                    setProjects(listShaperProjects());
                }
                return current;
            }
        });
    };

    const closeProject = () => setDoc(null);

    const selectRoom = (roomId: ShaperRoomId) => {
        setSelectedConnection(null);
        setSelectedConnectionIds(new Set());
        const nextZ = doc?.rooms[roomId]?.z;
        if (typeof nextZ === 'number') setViewZ(nextZ);
        setSelectedRoomIds(new Set([roomId]));
        setDoc(current => current ? persist(selectShaperRoom(current, roomId)) : current);
    };

    // Shift-click: toggle a room in the multi-selection and make it primary.
    const toggleSelectRoom = (roomId: ShaperRoomId) => {
        setSelectedConnection(null);
        setSelectedConnectionIds(new Set());
        setSelectedRoomIds(prev => {
            const next = new Set(prev);
            if (next.size === 0 && doc) next.add(doc.selectedRoomId);
            if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
            return next;
        });
        setDoc(current => current ? persist(selectShaperRoom(current, roomId)) : current);
    };

    const selectConnection = (conn: ShaperConnectionSelection | null) => {
        setSelectedRoomIds(new Set());
        if (!conn) {
            setSelectedConnection(null);
            setSelectedConnectionIds(new Set());
        } else {
            setSelectedConnection(conn);
            setSelectedConnectionIds(new Set([`${conn.aId}:${conn.dirAB}`]));
        }
    };

    const toggleSelectConnection = (conn: ShaperConnectionSelection) => {
        setSelectedRoomIds(new Set());
        setSelectedConnection(conn);
        setSelectedConnectionIds(prev => {
            const next = new Set(prev);
            const key = `${conn.aId}:${conn.dirAB}`;
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedConnection(null);
        setSelectedConnectionIds(new Set());
        setSelectedRoomIds(new Set());
    };

    // Apply an inspector patch to every selected room when 2+ are selected,
    // otherwise just the primary room.
    const updateRoom = (patch: Partial<ShaperRoomDraft>) => {
        setDoc(current => {
            if (!current) return current;
            const ids = selectedRoomIds.size > 1 ? [...selectedRoomIds] : [current.selectedRoomId];
            let next = current;
            for (const id of ids) next = updateShaperRoom(next, id, patch);
            return persistRoomPatch(next, ids, patch);
        });
    };

    const addAnnotation = (annotation: ShaperAnnotation) =>
        setDoc(current => current ? saveShaperAnnotationAdd(current, current.selectedRoomId, annotation) : current);
    const removeAnnotation = (annotationId: string) =>
        setDoc(current => current ? saveShaperAnnotationRemove(current, current.selectedRoomId, annotationId) : current);

    const addRoom = () => {
        setDoc(current => current ? persist(addShaperGridRoom(current, viewZ)) : current);
    };

    const addExtraRoom = () => {
        setDoc(current => current ? persist(addShaperExtraRoom(current, viewZ)) : current);
    };

    const addRoomAt = (x: number, y: number, z: number) => {
        setDoc(current => current ? persist(addShaperRoomAt(current, x, y, z)) : current);
    };

    const moveRoom = (roomId: ShaperRoomId, x: number, y: number, z: number) => {
        setDoc(current => current ? persist(moveShaperRoom(current, roomId, x, y, z)) : current);
    };

    const removeRoom = (roomId: ShaperRoomId) => {
        setDoc(current => current ? persist(removeShaperRoom(current, roomId)) : current);
    };

    const moveRooms = (roomIds: ShaperRoomId[], dx: number, dy: number, z: number) => {
        setDoc(current => current ? persist(moveShaperRooms(current, roomIds, dx, dy, z)) : current);
    };

    const removeRooms = (roomIds: ShaperRoomId[]) => {
        setSelectedRoomIds(new Set());
        setDoc(current => current ? persist(removeShaperRooms(current, roomIds)) : current);
    };

    const entityActions = useShaperEntityActions({ persist, setDoc });
    const comActions = useShaperComActions({ persist, setDoc });
    const exitActions = useShaperExitActions({ persist, selectedConnectionIds, setDoc });
    const libraryActions = useShaperLibraryActions({ persist, setDoc });

    return {
        doc,
        selectedRoom,
        selectedRoomIds,
        selectedConnection,
        selectedConnectionIds,
        setSelectedConnection: selectConnection,
        onToggleSelectConnection: toggleSelectConnection,
        layers,
        viewZ,
        projects,
        issues,
        selectedIssues,
        setViewZ,
        addRoom,
        addExtraRoom,
        addRoomAt,
        moveRoom,
        moveRooms,
        removeRoom,
        removeRooms,
        createProject,
        openProject,
        deleteProject,
        renameProject,
        closeProject,
        selectRoom,
        toggleSelectRoom,
        clearSelection,
        updateRoom,
        addAnnotation,
        removeAnnotation,
        ...comActions,
        ...entityActions,
        ...exitActions,
        ...libraryActions
    };
};
