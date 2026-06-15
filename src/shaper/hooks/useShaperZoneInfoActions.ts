/**
 * @file useShaperZoneInfoActions.ts
 * @description Headless action hook for managing Shaper zone info keywords.
 */

import type { Dispatch, SetStateAction } from 'react';
import { addZoneInfoKeyword, deleteZoneInfoKeyword, updateZoneInfoKeyword } from '../model/shaperZoneInfo';
import { importFromAsciiMap } from '../model/shaperAsciiMap';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface UseShaperZoneInfoActionsParams {
    persist: (doc: ShaperWorkspaceDoc) => ShaperWorkspaceDoc;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

// --- Logic Section ---
export const useShaperZoneInfoActions = ({ persist, setDoc }: UseShaperZoneInfoActionsParams) => {
    const addZoneKeyword = (keyword: string, body: string) =>
        setDoc(current => current ? persist(addZoneInfoKeyword(current, keyword, body)) : current);

    const updateZoneKeyword = (id: string, keyword: string, body: string) =>
        setDoc(current => current ? persist(updateZoneInfoKeyword(current, id, keyword, body)) : current);

    const deleteZoneKeyword = (id: string) =>
        setDoc(current => current ? persist(deleteZoneInfoKeyword(current, id)) : current);

    const importAsciiMap = (text: string, z: number) =>
        setDoc(current => current ? persist(importFromAsciiMap(current, text, z)) : current);

    return { addZoneKeyword, updateZoneKeyword, deleteZoneKeyword, importAsciiMap };
};

