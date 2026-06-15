/**
 * @file useShaperWorkspace.ts
 * @description Local Shaper workspace state hook for the first foundation slice.
 */

import { useMemo, useState } from 'react';
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
    saveShaperRoomPatch
} from '../model/shaperProjectStore';
import { downloadShaperProjectFile, parseShaperProjectFile } from '../model/shaperProjectFiles';
import { changeShaperProjectZone } from '../model/shaperProjectZone';
import { publishRawSocketMessage } from '../model/shaperProjectSync';
import { validateShaperDocument } from '../model/shaperValidation';
import { useShaperComActions } from './useShaperComActions';
import { useShaperEntityActions } from './useShaperEntityActions';
import { useShaperExitActions } from './useShaperExitActions';
import { useShaperLibraryActions } from './useShaperLibraryActions';
import { useShaperLiveImportRunner } from './useShaperLiveImportRunner';
import { useShaperProjectSubscription } from './useShaperProjectSubscription';
import { useShaperUndoHistory } from './useShaperUndoHistory';
import { useShaperZoneInfoActions } from './useShaperZoneInfoActions';
import type { ShaperConnectionSelection } from '../model/shaperTypes';
import type { ShaperAnnotation, ShaperProjectSummary, ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from '../model/shaperTypes';

interface ShaperWorkspaceOptions {
    sendCommand: (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const useShaperWorkspace = ({ sendCommand }: ShaperWorkspaceOptions) => {
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
    const undoHistory = useShaperUndoHistory(doc);
    useShaperProjectSubscription({ setProjects, setDoc });
    const persist = (nextDoc: ShaperWorkspaceDoc) => {
        const trackedDoc = doc?.id === nextDoc.id ? undoHistory.rememberUndo(doc, nextDoc) : nextDoc;
        saveShaperProject(trackedDoc);
        setProjects(listShaperProjects());
        return trackedDoc;
    };
    const persistSelection = (nextDoc: ShaperWorkspaceDoc) => {
        saveShaperProject(nextDoc);
        undoHistory.syncSelection(nextDoc);
        setProjects(listShaperProjects());
        return nextDoc;
    };
    const persistRoomPatch = (nextDoc: ShaperWorkspaceDoc, roomIds: ShaperRoomId[], patch: Partial<ShaperRoomDraft>) => {
        const trackedDoc = doc?.id === nextDoc.id ? undoHistory.rememberUndo(doc, nextDoc) : nextDoc;
        const savedDoc = saveShaperRoomPatch(trackedDoc, roomIds, patch);
        setProjects(listShaperProjects());
        return savedDoc;
    };

    const createProject = (name: string, zoneNumber: number) => {
        const nextDoc = createShaperProject(name, zoneNumber);
        setProjects(listShaperProjects());
        setViewZ(0);
        setSelectedRoomIds(new Set());
        undoHistory.resetUndo(nextDoc);
        setDoc(nextDoc);
    };
    const openProject = (projectId: string) => {
        const nextDoc = loadShaperProject(projectId);
        if (nextDoc) {
            setViewZ(nextDoc.rooms[nextDoc.selectedRoomId]?.z ?? 0);
            setSelectedRoomIds(new Set());
            undoHistory.resetUndo(nextDoc);
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
    const changeProjectZone = (projectId: string, zoneNumber: number) => {
        setDoc(current => {
            const target = current?.id === projectId ? current : loadShaperProject(projectId);
            if (!target) return current;
            const nextTarget = changeShaperProjectZone(target, zoneNumber);
            if (current?.id === projectId) return persist(nextTarget);
            saveShaperProject(nextTarget);
            setProjects(listShaperProjects());
            return current;
        });
    };
    const exportProject = (projectId: string) => {
        const target = doc?.id === projectId ? doc : loadShaperProject(projectId);
        if (target) downloadShaperProjectFile(target);
    };
    const importProject = async (file: File) => {
        const nextDoc = parseShaperProjectFile(await file.text());
        saveShaperProject(nextDoc);
        const loadedDoc = loadShaperProject(nextDoc.id) ?? nextDoc;
        setProjects(listShaperProjects());
        setViewZ(loadedDoc.rooms[loadedDoc.selectedRoomId]?.z ?? 0);
        setSelectedRoomIds(new Set());
        undoHistory.resetUndo(loadedDoc);
        setDoc(loadedDoc);
    };
    const closeProject = () => setDoc(null);
    const setProjectShared = (projectId: string, shared: boolean) => {
        setDoc(current => {
            const target = current?.id === projectId ? current : loadShaperProject(projectId);
            if (!target) return current;
            const nextTarget = { ...target, shared };
            saveShaperProject(nextTarget);
            if (!shared) publishRawSocketMessage({ type: 'project-unshare', projectId });
            setProjects(listShaperProjects());
            return current?.id === projectId ? nextTarget : current;
        });
    };

    const shareProject = (projectId: string) => setProjectShared(projectId, true);
    const unshareProject = (projectId: string) => setProjectShared(projectId, false);
    const selectRoom = (roomId: ShaperRoomId) => {
        setSelectedConnection(null);
        setSelectedConnectionIds(new Set());
        const nextZ = doc?.rooms[roomId]?.z;
        if (typeof nextZ === 'number') setViewZ(nextZ);
        setSelectedRoomIds(new Set([roomId]));
        setDoc(current => current ? persistSelection(selectShaperRoom(current, roomId)) : current);
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
        setDoc(current => current ? persistSelection(selectShaperRoom(current, roomId)) : current);
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
        setDoc(current => current ? undoHistory.rememberUndo(current, saveShaperAnnotationAdd(current, current.selectedRoomId, annotation)) : current);
    const removeAnnotation = (annotationId: string) =>
        setDoc(current => current ? undoHistory.rememberUndo(current, saveShaperAnnotationRemove(current, current.selectedRoomId, annotationId)) : current);
    const addExtraRoom = () => setDoc(current => current ? persist(addShaperExtraRoom(current, viewZ)) : current);
    const addRoomAt = (x: number, y: number, z: number) => setDoc(current => current ? persist(addShaperRoomAt(current, x, y, z)) : current);
    const moveRoom = (roomId: ShaperRoomId, x: number, y: number, z: number) =>
        setDoc(current => current ? persist(moveShaperRoom(current, roomId, x, y, z)) : current);
    const removeRoom = (roomId: ShaperRoomId) => setDoc(current => current ? persist(removeShaperRoom(current, roomId)) : current);
    const moveRooms = (roomIds: ShaperRoomId[], dx: number, dy: number, z: number) =>
        setDoc(current => current ? persist(moveShaperRooms(current, roomIds, dx, dy, z)) : current);
    const removeRooms = (roomIds: ShaperRoomId[]) => {
        setSelectedRoomIds(new Set());
        setDoc(current => current ? persist(removeShaperRooms(current, roomIds)) : current);
    };
    const undo = () => {
        const previous = undoHistory.popUndo();
        if (!previous) return;
        saveShaperProject(previous);
        setProjects(listShaperProjects());
        setViewZ(previous.rooms[previous.selectedRoomId]?.z ?? 0);
        setSelectedRoomIds(new Set([previous.selectedRoomId]));
        setSelectedConnection(null);
        setSelectedConnectionIds(new Set());
        setDoc(previous);
    };
    const entityActions = useShaperEntityActions({ persist, setDoc });
    const comActions = useShaperComActions({ persist, setDoc });
    const exitActions = useShaperExitActions({ persist, selectedConnectionIds, setDoc });
    const libraryActions = useShaperLibraryActions({ persist, setDoc });
    const zoneInfoActions = useShaperZoneInfoActions({ persist, setDoc });
    const liveImport = useShaperLiveImportRunner({ send: sendCommand, persist, setDoc });

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
        canUndo: undoHistory.canUndo,
        liveImportStatus: liveImport.status,
        liveImportKeywordOptions: liveImport.keywordOptions,
        setViewZ,
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
        changeProjectZone,
        exportProject,
        importProject,
        startLiveImport: () => { if (doc) void liveImport.start(doc); },
        startRoomLiveImport: (roomNumber: string) => { if (doc) void liveImport.startRoom(doc, roomNumber); },
        startKeywordLiveImport: (keyword: string) => { if (doc) void liveImport.startKeyword(doc, keyword); },
        startKeywordListLiveImport: () => { if (doc) void liveImport.startKeywordList(doc); },
        shareProject,
        unshareProject,
        closeProject,
        selectRoom,
        toggleSelectRoom,
        clearSelection,
        undo,
        updateRoom,
        addAnnotation,
        removeAnnotation,
        ...comActions,
        ...entityActions,
        ...exitActions,
        ...libraryActions,
        ...zoneInfoActions
    };
};
