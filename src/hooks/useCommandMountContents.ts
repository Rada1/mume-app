/** @file useCommandMountContents.ts — Loads mount cargo through the existing examine capture pipeline. */
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import { getResolvedTraitSections } from '../utils/inlineActionModel';
import { isLikelyCargoLine } from '../utils/mountCargoUtils';
import { toGearRow } from '../utils/gearPanelUtils';
import type { GearRow } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getMountObjectTargets } from '../objects/mountObjectTargets';

// --- Mount Contents ---
export const useCommandMountContents = (entry: CommandActionTargetEntry) => {
    const game = useGame();
    const [open, setOpen] = useState(false);
    const containerId = `command-mount:${game.roomNum}:${entry.id}`;
    useEffect(() => setOpen(false), [containerId, entry.context]);
    const lines = useCorpseContentsStore(state => state.contents[containerId]);
    const isMount = entry.scope === 'room' && entry.group !== 'objects'
        && getResolvedTraitSections(entry.category, entry.label, game.inlineCategories || [])
            .some(section => section.trait.id === 'trait-mount');
    const toggle = () => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (!nextOpen) return;
        const command = `examine ${entry.context}`;
        useCorpseContentsStore.getState().requestContents(containerId, entry.context);
        game.parser.setPendingFlags(true, true, command);
        game.executeCommand(command, true, true, false, true, { shouldFocus: false, fromUi: true });
    };
    const rows = (lines || []).filter(isLikelyCargoLine).map(toGearRow)
        .filter((row): row is GearRow => row !== null);
    return { isMount, open, toggle, rows, containerId, targets: getMountObjectTargets(entry, rows, containerId), loading: lines === undefined };
};
