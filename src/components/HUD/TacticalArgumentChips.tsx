/** @file TacticalArgumentChips.tsx — Renders staged tactical arguments beside the command preview. */

import React from 'react';
import { useTacticalArgumentChipStore } from '../../stores/useTacticalArgumentChipStore';
import { TargetArgumentChip } from './TargetArgumentChip';

// --- Render Section ---
export const TacticalArgumentChips: React.FC = () => {
    const command = useTacticalArgumentChipStore(state => state.command);
    const chips = useTacticalArgumentChipStore(state => state.chips);
    if (!command || !chips.length) return null;

    return <>
        <span className="docked-command-preview docked-argument-command">{command}</span>
        {chips.map(chip => <TargetArgumentChip key={chip.id} chip={chip} />)}
    </>;
};
