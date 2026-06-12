/**
 * @file shaperExitFlags.ts
 * @description Shared predicates for exit flags and legacy exit booleans.
 */

import type { ShaperDoorFlag, ShaperExitDraft } from './shaperTypes';

// --- Flag Section ---
export const hasShaperExitFlag = (exit: ShaperExitDraft, flag: ShaperDoorFlag): boolean =>
    exit.doorFlags?.includes(flag) ?? false;

export const hasShaperExitDoor = (exit: ShaperExitDraft): boolean =>
    hasShaperExitFlag(exit, 'door') || exit.hasDoor === true;

export const hasShaperExitClimb = (exit: ShaperExitDraft): boolean =>
    hasShaperExitFlag(exit, 'climb_up') || hasShaperExitFlag(exit, 'climb_down') || exit.isClimb === true;

export const syncShaperExitDoorFlag = (exit: ShaperExitDraft, enabled: boolean): ShaperDoorFlag[] => {
    const flags = exit.doorFlags ?? [];
    if (enabled) return flags.includes('door') ? flags : [...flags, 'door'];
    return flags.filter(flag => flag !== 'door');
};
