/**
 * @file gmcpExitUtils.ts
 * @description Helpers for applying partial GMCP Room.UpdateExits payloads.
 */

import type { GmcpExitInfo } from '../types';

export type GmcpExitMap = Record<string, GmcpExitInfo | number | false>;

// --- Logic Section ---

// Exit directions arrive from GMCP/text in mixed spellings (short "n", long "north").
// Everything downstream — the joystick allowlist, getGateState, the renderer — assumes
// the short canonical form, so collapse keys to it at the store boundary.
const DIR_SHORT: Record<string, string> = {
    n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
    u: 'u', up: 'u', d: 'd', down: 'd',
    ne: 'ne', northeast: 'ne', nw: 'nw', northwest: 'nw',
    se: 'se', southeast: 'se', sw: 'sw', southwest: 'sw'
};

export const normalizeExitKey = (dir: string): string => DIR_SHORT[dir.toLowerCase()] || dir.toLowerCase();

export const normalizeExitMap = (map: GmcpExitMap | undefined | null): GmcpExitMap => {
    const out: GmcpExitMap = {};
    if (!map) return out;
    for (const key of Object.keys(map)) {
        out[normalizeExitKey(key)] = map[key];
    }
    return out;
};

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
