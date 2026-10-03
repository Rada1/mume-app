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
    commonTargets?: CommandTargetSuggestion[];
    currentTarget: string | null;
    title?: string;
    showMeta?: boolean;
    selectOnPointerUp?: boolean;
    onChoose: (target: string) => void;
    onManualEntry?: () => void;
    onDismiss: () => void;
}

interface PickerPointerGesture {
    list: HTMLDivElement;
    startX: number;
    startY: number;
    startScrollTop: number;
    didScroll: boolean;
}

// --- Render Section ---
export const TargetChipPicker: FC<Props> = ({
    isOpen, anchorRef, suggestions, commonTargets = [], currentTarget, title = 'Room entities', showMeta = true,
    selectOnPointerUp = false, onChoose, onManualEntry, onDismiss
}) => {
    const isClassicMode = useSettingsStore(state => state.isClassicMode);
    const pickerRef = useRef<HTMLDivElement>(null);
    const pointerStartsRef = useRef(new Map<number, { value: string; x: number; y: number }>());
    const scrollPointersRef = useRef(new Map<number, PickerPointerGesture>());
    const suppressedClickRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const [position, setPosition] = useState({ left: 12, top: 12, bottom: undefined as number | undefined, width: 240, maxHeight: 300 });

    const trackPointerDown = (event: React.PointerEvent<HTMLButtonElement>, value: string) => {
        const list = event.currentTarget.closest<HTMLDivElement>('.docked-target-picker-list');
        if (list) {
            scrollPointersRef.current.set(event.pointerId, {
                list,
                startX: event.clientX,
                startY: event.clientY,
                startScrollTop: list.scrollTop,
                didScroll: false
            });
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture may be unavailable for synthetic events. */ }
        }
        if (!selectOnPointerUp || (event.pointerType === 'mouse' && event.button !== 0)) return;
        pointerStartsRef.current.set(event.pointerId, { value, x: event.clientX, y: event.clientY });
    };
    const chooseOnPointerUp = (event: React.PointerEvent<HTMLButtonElement>, value: string) => {
        const gesture = scrollPointersRef.current.get(event.pointerId);
        scrollPointersRef.current.delete(event.pointerId);
        if (gesture?.didScroll) {
            suppressedClickRef.current = { x: event.clientX, y: event.clientY, time: Date.now() };
            pointerStartsRef.current.delete(event.pointerId);
            return;
        }
        if (!selectOnPointerUp) return;
        const start = pointerStartsRef.current.get(event.pointerId);
        pointerStartsRef.current.delete(event.pointerId);
        if (start?.value !== value || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
        event.preventDefault();
        onChoose(value);
    };
    const scrollFromPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const gesture = scrollPointersRef.current.get(event.pointerId);
        if (!gesture) return;
        const deltaX = event.clientX - gesture.startX;
        const deltaY = event.clientY - gesture.startY;
        if (!gesture.didScroll && Math.abs(deltaY) > 7 && Math.abs(deltaY) > Math.abs(deltaX)) {
            gesture.didScroll = true;
        }
        if (!gesture.didScroll) return;
        gesture.list.scrollTop = gesture.startScrollTop - deltaY;
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
    };
    const chooseOnClick = (event: React.MouseEvent<HTMLButtonElement>, value: string) => {
        const suppressedClick = suppressedClickRef.current;
        if (event.detail > 0 && suppressedClick
            && Date.now() - suppressedClick.time < 500
            && Math.hypot(event.clientX - suppressedClick.x, event.clientY - suppressedClick.y) < 28) {
            suppressedClickRef.current = null;
            event.preventDefault();
            return;
        }
        onChoose(value);
    };

    useLayoutEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();
            const width = Math.min(commonTargets.length ? 420 : 260, window.innerWidth - 24);
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
    }, [anchorRef, commonTargets.length, isOpen]);

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
    const largestColumnLength = Math.max(suggestions.length, commonTargets.length);
    const rowsHeight = largestColumnLength > 0 ? largestColumnLength * 34 : 36;
    const pickerHeight = Math.min(
        position.maxHeight,
        34 + (commonTargets.length ? 18 : 0) + rowsHeight + (onManualEntry ? 40 : 0)
    );

    return createPortal(
        <div
            ref={pickerRef}
            className="docked-target-picker"
            role="listbox"
            aria-label={title}
            style={{ left: position.left, top: position.bottom === undefined ? position.top : undefined, bottom: position.bottom, width: position.width, height: pickerHeight, maxHeight: position.maxHeight }}
            onPointerDown={event => event.stopPropagation()}
            onPointerUp={event => event.stopPropagation()}
            onPointerMove={scrollFromPointerMove}
        >
            <div className="docked-target-picker-title">{title}</div>
            <div className={`docked-target-picker-columns${commonTargets.length ? ' has-common-targets' : ''}`}>
                <section className="docked-target-picker-column">
                    {commonTargets.length > 0 && <div className="docked-target-picker-column-title">Room targets</div>}
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
                        onPointerDown={event => trackPointerDown(event, suggestion.value)}
                        onPointerUp={event => chooseOnPointerUp(event, suggestion.value)}
                        onPointerCancel={event => {
                            pointerStartsRef.current.delete(event.pointerId);
                            scrollPointersRef.current.delete(event.pointerId);
                        }}
                        onClick={event => chooseOnClick(event, suggestion.value)}
                    >
                        <span className={getTargetItemTierClassName(suggestion.label)}>{suggestion.label}</span>
                        {showMeta && <small>{suggestion.meta}</small>}
                    </button>;
                }) : <div className="docked-target-picker-empty">No entities in the room</div>}
                    </div>
                </section>
                {commonTargets.length > 0 && <section className="docked-target-picker-column">
                    <div className="docked-target-picker-column-title">Common PvP</div>
                    <div className="docked-target-picker-list">
                        {commonTargets.map(suggestion => {
                            const isSelected = normalizedTarget === suggestion.value.trim().toLowerCase();
                            return <button
                                key={suggestion.key}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`docked-target-picker-item${isSelected ? ' is-selected' : ''}`}
                                data-target-value={suggestion.value}
                                onPointerDown={event => trackPointerDown(event, suggestion.value)}
                                onPointerUp={event => chooseOnPointerUp(event, suggestion.value)}
                                onPointerCancel={event => {
                                    pointerStartsRef.current.delete(event.pointerId);
                                    scrollPointersRef.current.delete(event.pointerId);
                                }}
                                onClick={event => chooseOnClick(event, suggestion.value)}
                            ><span>{suggestion.label}</span></button>;
                        })}
                    </div>
                </section>}
            </div>
            {onManualEntry && <button type="button" className="docked-target-picker-manual" onClick={onManualEntry}>
                Enter target manually…
            </button>}
        </div>,
        document.body
    );
};
