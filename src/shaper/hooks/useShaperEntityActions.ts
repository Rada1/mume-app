/**
 * @file useShaperEntityActions.ts
 * @description Headless Shaper mob and object actions backed by /com nodes.
 */

import type { Dispatch, SetStateAction } from 'react';
import { addShaperComNode, deleteShaperComBranch } from '../model/shaperComCommands';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface UseShaperEntityActionsParams {
    persist: (doc: ShaperWorkspaceDoc) => ShaperWorkspaceDoc;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

// --- Hook Section ---
export const useShaperEntityActions = ({ persist, setDoc }: UseShaperEntityActionsParams) => {
    const addMob = (vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'mobile', null, vnum, name)) : current);
    const removeMob = (mobId: string) =>
        setDoc(current => current ? persist(deleteShaperComBranch(current, mobId)) : current);
    const addObject = (vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'object', null, vnum, name)) : current);
    const removeObject = (objectId: string) =>
        setDoc(current => current ? persist(deleteShaperComBranch(current, objectId)) : current);
    const addMobObject = (mobId: string, vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'give', mobId, vnum, name)) : current);
    const removeMobObject = (mobId: string, objectId: string) =>
        setDoc(current => current ? persist(deleteShaperComBranch(current, objectId)) : current);

    return { addMob, removeMob, addObject, removeObject, addMobObject, removeMobObject };
};
