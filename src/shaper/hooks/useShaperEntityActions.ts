/**
 * @file useShaperEntityActions.ts
 * @description Headless Shaper mob and object actions backed by /com nodes.
 */

import type { Dispatch, SetStateAction } from 'react';
import { addShaperComNode, deleteShaperComBranch, updateShaperComFields } from '../model/shaperComCommands';
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

    const addFollower = (mobId: string, vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'follow', mobId, vnum, name)) : current);

    const addObject = (vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'object', null, vnum, name)) : current);

    const addHiddenObject = (vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'hide', null, vnum, name)) : current);

    const removeObject = (objectId: string) =>
        setDoc(current => current ? persist(deleteShaperComBranch(current, objectId)) : current);

    const addMobObject = (mobId: string, vnum: string, name: string, type: 'give' | 'equip' = 'give', position = 'wield') => {
        setDoc(current => {
            if (!current) return current;
            let doc = addShaperComNode(current, current.selectedRoomId, type, mobId, vnum, name);
            if (type === 'equip') {
                const nodes = Object.values(doc.commandNodes);
                // find the newly added equip node to set its position
                const newlyAdded = nodes.find(n => n.roomId === current.selectedRoomId && n.parentId === mobId && n.type === 'equip' && n.fields.vnum === vnum);
                if (newlyAdded) {
                    doc = updateShaperComFields(doc, newlyAdded.id, { position });
                }
            }
            return persist(doc);
        });
    };

    const removeMobObject = (mobId: string, objectId: string) =>
        setDoc(current => current ? persist(deleteShaperComBranch(current, objectId)) : current);

    const addObjectPut = (containerId: string, vnum: string, name: string) =>
        setDoc(current => current ? persist(addShaperComNode(current, current.selectedRoomId, 'put', containerId, vnum, name)) : current);

    return {
        addMob,
        removeMob,
        addFollower,
        addObject,
        addHiddenObject,
        removeObject,
        addMobObject,
        removeMobObject,
        addObjectPut
    };
};
