/** @file roomOccupantReconciliation.ts — Reconciles text arrivals with authoritative room identities. */
import type { GmcpOccupant } from '../types';
import { stripAnsiCodes } from './ansi';

// --- Occupant Identity ---
const normalizeName = (name: string): string => stripAnsiCodes(name).trim().toLowerCase()
    .replace(/^(?:a|an|the|some)\s+/, '').replace(/\s+/g, ' ');

const occupantNames = (occupant: GmcpOccupant): string[] =>
    [occupant.name, occupant.short, occupant.shortdesc]
        .filter((name): name is string => Boolean(name))
        .map(normalizeName).filter(Boolean);

export const isSyntheticRoomOccupant = (occupant: GmcpOccupant): boolean =>
    String(occupant.id || '').startsWith('syn:');

export const hasSameRoomOccupantName = (left: GmcpOccupant, right: GmcpOccupant): boolean => {
    const names = new Set(occupantNames(left));
    return occupantNames(right).some(name => names.has(name));
};

// --- Text Arrival Reconciliation ---
/** Only discard synthetic arrivals; two real occupants with the same name remain distinct. */
export const reconcileSyntheticRoomOccupants = (
    chars: Record<number, GmcpOccupant>
): Record<number, GmcpOccupant> => {
    const authoritative = Object.values(chars).filter(occupant => !isSyntheticRoomOccupant(occupant));
    const duplicates = Object.entries(chars).filter(([, occupant]) => isSyntheticRoomOccupant(occupant)
        && authoritative.some(real => hasSameRoomOccupantName(occupant, real)));
    if (!duplicates.length) return chars;
    const result = { ...chars };
    duplicates.forEach(([key]) => { delete result[Number(key)]; });
    return result;
};
