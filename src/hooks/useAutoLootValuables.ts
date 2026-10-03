/** @file useAutoLootValuables.ts — Starts one safe valuables transfer at a time after combat. */
import { useEffect, useRef } from 'react';

export interface AutoLootCorpse {
    id: string;
    containerId: string;
    commandTarget: string;
}

interface UseAutoLootValuablesArgs {
    enabled: boolean;
    roomId: number | string | null;
    combatIsActive: boolean;
    isBusy: boolean;
    hasMount: boolean;
    corpses: AutoLootCorpse[];
    mountTarget: string;
    lootValuables: (corpseId: string, corpseTarget: string, mountTarget: string) => void;
}

// --- Logic Section ---
export const useAutoLootValuables = ({
    enabled, roomId, combatIsActive, isBusy, hasMount, corpses, mountTarget, lootValuables
}: UseAutoLootValuablesArgs): void => {
    const handledRoom = useRef<{ id: string; corpseIds: Set<string> } | null>(null);

    useEffect(() => {
        const roomKey = String(roomId ?? '');
        if (!handledRoom.current || handledRoom.current.id !== roomKey) {
            handledRoom.current = { id: roomKey, corpseIds: new Set() };
        }
        if (!enabled || combatIsActive || isBusy || !hasMount) return;

        const nextCorpse = corpses.find(corpse => !handledRoom.current?.corpseIds.has(corpse.id));
        if (!nextCorpse || !handledRoom.current) return;
        handledRoom.current.corpseIds.add(nextCorpse.id);
        lootValuables(nextCorpse.containerId, nextCorpse.commandTarget, mountTarget);
    }, [combatIsActive, corpses, enabled, hasMount, isBusy, lootValuables, mountTarget, roomId]);
};
