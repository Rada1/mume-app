/**
 * @file useShaperExitActions.ts
 * @description Headless Shaper exit mutation actions for workspace state.
 */

import type { Dispatch, SetStateAction } from 'react';
import {
    cycleShaperExit,
    removeShaperExit,
    setShaperExitState,
    type ShaperExitState,
    toggleShaperExitDoor,
    upsertShaperDirectedExit
} from '../model/shaperExits';
import type { ShaperDirection, ShaperExitDraft, ShaperRoomId, ShaperWorkspaceDoc } from '../model/shaperTypes';

interface UseShaperExitActionsParams {
    persist: (doc: ShaperWorkspaceDoc) => ShaperWorkspaceDoc;
    selectedConnectionIds: Set<string>;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

// --- Hook Section ---
export const useShaperExitActions = ({
    persist,
    selectedConnectionIds,
    setDoc
}: UseShaperExitActionsParams) => {
    const cycleExit = (aId: ShaperRoomId, bId: ShaperRoomId, dirAB: ShaperDirection, dirBA: ShaperDirection) =>
        setDoc(current => current ? persist(cycleShaperExit(current, aId, bId, dirAB, dirBA)) : current);

    const connectExits = (aId: ShaperRoomId, bId: ShaperRoomId, dirAB: ShaperDirection, dirBA: ShaperDirection, state: ShaperExitState) =>
        setDoc(current => current ? persist(setShaperExitState(current, aId, bId, dirAB, dirBA, state)) : current);

    const connectDirectedExit = (fromRoomId: ShaperRoomId, toRoomId: ShaperRoomId, direction: ShaperDirection) =>
        setDoc(current => current ? persist(upsertShaperDirectedExit(current, fromRoomId, toRoomId, direction)) : current);

    const toggleExitDoor = (fromRoomId: ShaperRoomId, direction: ShaperDirection) =>
        setDoc(current => current ? persist(toggleShaperExitDoor(current, fromRoomId, direction)) : current);

    const updateExit = (exitId: string, patch: Partial<ShaperExitDraft>) => {
        setDoc(current => {
            if (!current) return current;
            const ids = selectedConnectionIds.size > 1 ? [...selectedConnectionIds] : [exitId];
            const next = { ...current, exits: { ...current.exits } };
            for (const id of ids) {
                const exit = next.exits[id];
                if (exit) next.exits[id] = { ...exit, ...patch };
            }
            return persist(next);
        });
    };

    const removeExit = (fromRoomId: ShaperRoomId, direction: ShaperDirection) =>
        setDoc(current => current ? persist(removeShaperExit(current, fromRoomId, direction)) : current);

    const removeExits = (exitIds: string[]) => {
        setDoc(current => {
            if (!current) return current;
            const nextExits = { ...current.exits };
            for (const id of exitIds) delete nextExits[id];
            return persist({ ...current, exits: nextExits });
        });
    };

    return { cycleExit, connectExits, connectDirectedExit, toggleExitDoor, updateExit, removeExit, removeExits };
};
