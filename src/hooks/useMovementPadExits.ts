/** @file useMovementPadExits.ts — Consistent direction and door indicators from live exit data. */
import { useMemo } from 'react';
import { normalizeExitKey, normalizeExitMap, type GmcpExitMap } from '../utils/gmcpExitUtils';

// --- Exit state normalization ---
export const useMovementPadExits = (exits: string[], rawExits: GmcpExitMap) => {
    return useMemo(() => {
        const details = normalizeExitMap(rawExits);
        const normalizedExitSet = new Set(exits.map(direction => normalizeExitKey(direction.trim())));
        Object.entries(details).forEach(([direction, value]) => {
            if (value === false) normalizedExitSet.delete(direction);
            else normalizedExitSet.add(direction);
        });
        const getDoorState = (direction: string) => {
            const value: unknown = details[normalizeExitKey(direction)];
            if (!value || typeof value !== 'object') return null;
            const exit = value as Record<string, unknown>;
            const flags = Array.isArray(exit.flags) ? exit.flags.map((flag: unknown) => String(flag).toLowerCase()) : [];
            const isLocked = exit.locked === true || flags.includes('locked');
            const isClosed = exit.closed === true || flags.includes('closed') || isLocked;
            const hasDoor = exit.hasDoor === true || exit.door === true
                || (typeof exit.door === 'number' && exit.door > 0)
                || Boolean(exit.doorName || exit.name) || isClosed
                || flags.some(flag => /door|gate|portcullis/i.test(flag));
            return { hasDoor, isLocked, isClosed };
        };
        return { normalizedExitSet, getDoorState, isExitClosed: (direction: string) => Boolean(getDoorState(direction)?.isClosed) };
    }, [exits, rawExits]);
};
