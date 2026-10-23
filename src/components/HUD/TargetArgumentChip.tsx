/** @file TargetArgumentChip.tsx — Shared interactive command argument chip. */

import React, { FC, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { TacticalArgumentChip as TacticalArgumentChipData } from '../../types';
import { TargetChipPicker } from './TargetChipPicker';
import { useCommandSuggestionAppearance } from '../../hooks/useCommandSuggestionAppearance';
import './TargetArgumentChip.css';

interface Props {
    chip: TacticalArgumentChipData;
    showCommandCaret?: boolean;
}

// --- Logic Section ---

// --- Render Section ---
export const TargetArgumentChip: FC<Props> = ({ chip, showCommandCaret = false }) => {
    const { triggerHaptic } = useGame();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const targetAppearance = useCommandSuggestionAppearance();
    const selected = chip.suggestions.find(entry => entry.value === chip.selectedValue);
    const appearance = selected ? targetAppearance(selected) : undefined;

    return <>
        <button
            ref={anchorRef}
            type="button"
            className={`docked-target-badge has-target docked-argument-chip${showCommandCaret ? ' has-command-caret' : ''}`}
            data-target-kind={appearance?.kind}
            style={{ '--argument-target-color': appearance?.color } as React.CSSProperties}
            aria-label={`${chip.title}: ${chip.displayLabel}. Choose another argument`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            title={`Choose ${chip.title.toLowerCase()}`}
            onPointerDown={event => {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(current => !current);
            }}
            onClick={event => {
                event.stopPropagation();
                if (event.detail === 0) setIsOpen(current => !current);
            }}
        >
            <span className="docked-argument-chip-label">{chip.displayLabel}</span>
        </button>
        <TargetChipPicker
            isOpen={isOpen}
            anchorRef={anchorRef}
            suggestions={chip.suggestions}
            currentTarget={chip.selectedValue}
            title={chip.title}
            selectOnPointerUp
            onChoose={value => {
                chip.onChoose(value);
                if (value !== chip.selectedValue) triggerHaptic?.(15);
                setIsOpen(false);
            }}
            onDismiss={() => setIsOpen(false)}
        />
    </>;
};
