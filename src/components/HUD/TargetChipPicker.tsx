/**
 * @file TargetChipPicker.tsx
 * @description Room entity dropdown opened from the command bar target chip.
 */

// --- Logic Section ---
import React, { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import { getTargetItemTierClassName } from '../../utils/itemTier';
import { useSettingsStore } from '../../stores/useSettingsStore';
import './LogDockedInput.css';

interface Props {
    isOpen: boolean;
    anchorRef: React.RefObject<HTMLElement | null>;
    suggestions: CommandTargetSuggestion[];
    currentTarget: string | null;
    title?: string;
    showMeta?: boolean;
    onChoose: (target: string) => void;
    onManualEntry?: () => void;
    onDismiss: () => void;
}

// --- Render Section ---
export const TargetChipPicker: FC<Props> = ({
    isOpen, anchorRef, suggestions, currentTarget, title = 'Room entities', showMeta = true, onChoose, onManualEntry, onDismiss
}) => {
    const isClassicMode = useSettingsStore(state => state.isClassicMode);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: 12, top: 12, bottom: undefined as number | undefined, width: 240, maxHeight: 300 });

    useLayoutEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();
            const width = Math.min(260, window.innerWidth - 24);
            const availableAbove = rect.top - 12;
            const fitsAbove = availableAbove >= 150;
            setPosition({
                left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
                top: fitsAbove ? 12 : rect.bottom + 4,
                bottom: fitsAbove ? window.innerHeight - rect.top + 4 : undefined,
                width,
                maxHeight: Math.max(120, Math.min(300, fitsAbove ? availableAbove : window.innerHeight - rect.bottom - 16)),
            });
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRef, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const dismissOutside = (event: PointerEvent) => {
            const node = event.target;
            if (node instanceof Node && !pickerRef.current?.contains(node) && !anchorRef.current?.contains(node)) onDismiss();
        };
        const dismissEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onDismiss();
        };
        document.addEventListener('pointerdown', dismissOutside);
        document.addEventListener('keydown', dismissEscape);
        return () => {
            document.removeEventListener('pointerdown', dismissOutside);
            document.removeEventListener('keydown', dismissEscape);
        };
    }, [anchorRef, isOpen, onDismiss]);

    if (!isOpen || isClassicMode || typeof document === 'undefined') return null;
    const normalizedTarget = currentTarget?.trim().toLowerCase() ?? '';

    return createPortal(
        <div
            ref={pickerRef}
            className="docked-target-picker"
            role="listbox"
            aria-label={title}
            style={{ left: position.left, top: position.bottom === undefined ? position.top : undefined, bottom: position.bottom, width: position.width, maxHeight: position.maxHeight }}
            onPointerDown={event => event.stopPropagation()}
        >
            <div className="docked-target-picker-title">{title}</div>
            <div className="docked-target-picker-list">
                {suggestions.length ? suggestions.map(suggestion => {
                    const isSelected = normalizedTarget === suggestion.value.trim().toLowerCase();
                    return <button
                        key={suggestion.key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`docked-target-picker-item${isSelected ? ' is-selected' : ''}`}
                        data-target-value={suggestion.value}
                        onClick={() => onChoose(suggestion.value)}
                    >
                        <span className={getTargetItemTierClassName(suggestion.label)}>{suggestion.label}</span>
                        {showMeta && <small>{suggestion.meta}</small>}
                    </button>;
                }) : <div className="docked-target-picker-empty">No entities in the room</div>}
            </div>
            {onManualEntry && <button type="button" className="docked-target-picker-manual" onClick={onManualEntry}>
                Enter target manually…
            </button>}
        </div>,
        document.body
    );
};
