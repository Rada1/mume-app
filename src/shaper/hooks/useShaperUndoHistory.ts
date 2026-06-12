/**
 * @file useShaperUndoHistory.ts
 * @description Undo stack for persisted Shaper project edits.
 */

import { useCallback, useRef } from 'react';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

// --- History Section ---
const MAX_UNDO_DEPTH = 50;

const snapshotKey = (doc: ShaperWorkspaceDoc | null): string =>
    doc ? JSON.stringify({ ...doc, updatedAt: 0, selectedRoomId: '' }) : '';

export const useShaperUndoHistory = (doc: ShaperWorkspaceDoc | null) => {
    const pastRef = useRef<ShaperWorkspaceDoc[]>([]);
    const lastKeyRef = useRef(snapshotKey(doc));

    const resetUndo = useCallback((nextDoc: ShaperWorkspaceDoc | null) => {
        pastRef.current = [];
        lastKeyRef.current = snapshotKey(nextDoc);
    }, []);

    const rememberUndo = useCallback((current: ShaperWorkspaceDoc, next: ShaperWorkspaceDoc) => {
        const currentKey = snapshotKey(current);
        const nextKey = snapshotKey(next);
        if (currentKey !== nextKey) {
            pastRef.current = [...pastRef.current.slice(-(MAX_UNDO_DEPTH - 1)), current];
        }
        lastKeyRef.current = nextKey;
        return next;
    }, []);

    const syncSelection = useCallback((nextDoc: ShaperWorkspaceDoc | null) => {
        lastKeyRef.current = snapshotKey(nextDoc);
    }, []);

    const popUndo = useCallback((): ShaperWorkspaceDoc | null => {
        const previous = pastRef.current[pastRef.current.length - 1] ?? null;
        if (!previous) return null;
        pastRef.current = pastRef.current.slice(0, -1);
        lastKeyRef.current = snapshotKey(previous);
        return previous;
    }, []);

    return {
        canUndo: pastRef.current.length > 0,
        rememberUndo,
        resetUndo,
        syncSelection,
        popUndo
    };
};
