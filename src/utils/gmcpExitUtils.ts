/**
 * @file gmcpExitUtils.ts
 * @description Helpers for applying partial GMCP Room.UpdateExits payloads.
 */

import type { GmcpExitInfo } from '../types';

export type GmcpExitMap = Record<string, GmcpExitInfo | number | false>;

// --- Logic Section ---

export const mergeGmcpExitUpdate = (
    current: GmcpExitMap = {},
    update: GmcpExitMap = {}
): GmcpExitMap => {
    const next: GmcpExitMap = { ...current };

    Object.entries(update).forEach(([dir, exit]) => {
        if (exit === false) {
            delete next[dir];
            return;
        }

        next[dir] = exit;
    });

    return next;
};
