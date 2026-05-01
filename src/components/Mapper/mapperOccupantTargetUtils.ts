/**
 * @file mapperOccupantTargetUtils.ts
 * @description Command-target helpers for GMCP room occupants on the mapper.
 */

import type { GmcpOccupant } from '../../types';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';

// --- Logic Section ---

export const getOccupantCommandBase = (occupant: GmcpOccupant, fallback: string): string => (
    getOccupantCommandKeyword(occupant, fallback)
);

export const getOccupantCommandTarget = (
    occupant: GmcpOccupant,
    occupants: GmcpOccupant[],
    fallback: string
): string => {
    const base = getOccupantCommandBase(occupant, fallback);
    const matching = occupants.filter(candidate => getOccupantCommandBase(candidate, fallback) === base);
    const index = matching.findIndex(candidate => String(candidate.id) === String(occupant.id));
    return matching.length > 1 && index >= 0 ? `${index + 1}.${base}` : base;
};
