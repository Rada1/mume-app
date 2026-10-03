/** @file useRoomLootCandidates.ts — Projects catalog matches into command-ready ground loot rows. */
import { useMemo } from 'react';
import type { GmcpOccupant } from '../types';
import { createObjectTargetEntries, getRoomObjectCandidates, hasObjectTrait } from '../objects/objectTargetModel';
import { isLikelyLootableRoomItem } from '../utils/roomLootCatalog';

// --- Logic Section ---
export interface GroundLootCandidate {
    id: string;
    label: string;
    commandTarget: string;
}

export const useRoomLootCandidates = (
    roomItems: GmcpOccupant[],
    dismissedIds: ReadonlySet<string>
): GroundLootCandidate[] => useMemo(() => createObjectTargetEntries(getRoomObjectCandidates(roomItems))
    .filter(entry => !hasObjectTrait(entry.source, 'trait-corpse') &&
        isLikelyLootableRoomItem(entry.label) && !dismissedIds.has(entry.id))
    .map(entry => ({ id: entry.id, label: entry.label, commandTarget: entry.selector })),
[dismissedIds, roomItems]);
