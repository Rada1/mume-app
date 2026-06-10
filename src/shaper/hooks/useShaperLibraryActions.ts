/**
 * @file useShaperLibraryActions.ts
 * @description Headless /lib install/parameter actions for Shaper.
 */

import type { Dispatch, SetStateAction } from 'react';
import {
    addShaperLibrary,
    removeShaperLibrary,
    removeShaperLibraryParam,
    setShaperLibraryParam,
    toggleShaperLibraryLoad,
    updateShaperLibraryNotes
} from '../model/shaperLibraries';
import type { ShaperLibraryTargetType, ShaperWorkspaceDoc } from '../model/shaperTypes';

interface UseShaperLibraryActionsParams {
    persist: (doc: ShaperWorkspaceDoc) => ShaperWorkspaceDoc;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

// --- Hook Section ---
export const useShaperLibraryActions = ({ persist, setDoc }: UseShaperLibraryActionsParams) => {
    const addLibrary = (targetType: ShaperLibraryTargetType, targetId: string, name: string) =>
        setDoc(current => current ? persist(addShaperLibrary(current, targetType, targetId, name)) : current);
    const removeLibrary = (id: string) =>
        setDoc(current => current ? persist(removeShaperLibrary(current, id)) : current);
    const setLibraryParam = (id: string, key: string, value: string) =>
        setDoc(current => current ? persist(setShaperLibraryParam(current, id, key, value)) : current);
    const removeLibraryParam = (id: string, key: string) =>
        setDoc(current => current ? persist(removeShaperLibraryParam(current, id, key)) : current);
    const toggleLibraryLoad = (id: string) =>
        setDoc(current => current ? persist(toggleShaperLibraryLoad(current, id)) : current);
    const updateLibraryNotes = (id: string, notes: string) =>
        setDoc(current => current ? persist(updateShaperLibraryNotes(current, id, notes)) : current);

    return { addLibrary, removeLibrary, setLibraryParam, removeLibraryParam, toggleLibraryLoad, updateLibraryNotes };
};
