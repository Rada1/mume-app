/**
 * @file CommandArgumentText.tsx
 * @description Renders accepted command arguments as chips in input highlight layers.
 */

import React, { FC, Fragment } from 'react';
import type { CommandArgumentChipRange } from '../../utils/commandTargetSuggestionResolver';
import type { TacticalArgumentChip } from '../../types';
import { TargetArgumentChip } from '../HUD/TargetArgumentChip';

// --- Logic Section ---

interface Props {
    text: string;
    offset: number;
    chips: CommandArgumentChipRange[];
    caretKey: string | null;
    onChooseChip: (key: string, value: string) => void;
}

export const CommandArgumentText: FC<Props> = ({ text, offset, chips, caretKey, onChooseChip }) => {
    const visibleChips = chips
        .filter(chip => chip.start >= offset && chip.start <= offset + text.length)
        .sort((left, right) => left.start - right.start);
    if (!visibleChips.length) return <>{text}</>;

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    visibleChips.forEach(chip => {
        const start = Math.max(cursor, chip.start - offset);
        const end = Math.min(text.length, Math.max(start, chip.end - offset));
        if (start > cursor) parts.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor, start)}</Fragment>);
        const targetChip: TacticalArgumentChip = {
            id: chip.key,
            title: 'Target argument',
            displayLabel: chip.label,
            selectedValue: chip.value,
            suggestions: chip.suggestions,
            onChoose: value => onChooseChip(chip.key, value)
        };
        parts.push(<TargetArgumentChip key={chip.key} chip={targetChip} showCommandCaret={caretKey === chip.key} />);
        cursor = end;
    });
    if (cursor < text.length) parts.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor)}</Fragment>);
    return <>{parts}</>;
};
