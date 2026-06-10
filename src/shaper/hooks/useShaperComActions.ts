/**
 * @file useShaperComActions.ts
 * @description Headless editable /com tree actions for Shaper.
 */

import type { Dispatch, SetStateAction } from 'react';
import { addShaperComNode, deleteShaperComBranch, moveShaperComNode, reparentShaperComNode, updateShaperComFields, updateShaperComLimit, updateShaperComNode } from '../model/shaperComCommands';
import type { ShaperCommandLimit, ShaperCommandNode, ShaperCommandType, ShaperRoomId, ShaperWorkspaceDoc } from '../model/shaperTypes';

interface UseShaperComActionsParams {
    persist: (doc: ShaperWorkspaceDoc) => ShaperWorkspaceDoc;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

// --- Hook Section ---
export const useShaperComActions = ({ persist, setDoc }: UseShaperComActionsParams) => {
    const addComNode = (roomId: ShaperRoomId, type: ShaperCommandType, parentId: string | null, vnum: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, roomId, type, parentId, vnum)) : current);
    const deleteComNode = (nodeId: string) =>
        setDoc(current => current ? persist(deleteShaperComBranch(current, nodeId)) : current);
    const moveComNode = (nodeId: string, delta: -1 | 1) =>
        setDoc(current => current ? persist(moveShaperComNode(current, nodeId, delta)) : current);
    const reparentComNode = (nodeId: string, parentId: string | null) =>
        setDoc(current => current ? persist(reparentShaperComNode(current, nodeId, parentId)) : current);
    const updateComLimit = (nodeId: string, patch: Partial<ShaperCommandLimit>) =>
        setDoc(current => current ? persist(updateShaperComLimit(current, nodeId, patch)) : current);
    const updateComFields = (nodeId: string, patch: Partial<ShaperCommandNode['fields']>) =>
        setDoc(current => current ? persist(updateShaperComFields(current, nodeId, patch)) : current);
    const updateComNode = (
        nodeId: string,
        patch: Pick<Partial<ShaperCommandNode>, 'type' | 'parentId'> & {
            fields?: Partial<ShaperCommandNode['fields']>;
        }
    ) => setDoc(current => current ? persist(updateShaperComNode(current, nodeId, patch)) : current);

    return { addComNode, deleteComNode, moveComNode, reparentComNode, updateComLimit, updateComFields, updateComNode };
};
