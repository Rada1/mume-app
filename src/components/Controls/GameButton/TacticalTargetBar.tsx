/**
 * @file TacticalTargetBar.tsx
 * @description Sleek vertical terminal target menu docked on the left during mobile button holds.
 */

// --- Logic Section ---
import React, { FC, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GmcpOccupant } from '../../../types';
import { getRoomTargetSuggestions, CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import './TacticalTargetBar.css';

export interface TacticalTargetColumn {
    title: string;
    suggestions: CommandTargetSuggestion[];
    selectedTarget: string | null;
    selectedKey?: string | null;
    emptyText?: string;
}

export interface TacticalTargetBarProps {
    isOpen: boolean;
    currentTarget: string | null;
    selectedTarget: string | null;
    onSelectTarget: (targetValue: string) => void;
    roomOccupants: GmcpOccupant[];
    roomItems?: GmcpOccupant[];
    characterName?: string;
    suggestions?: CommandTargetSuggestion[];
    title?: string;
    commandLabel?: string;
    isInteractive?: boolean;
    isBlurred?: boolean;
    onHoverTarget?: (targetValue: string | null) => void;
    onDismiss?: () => void;
    columns?: TacticalTargetColumn[];
    onSelectColumnTarget?: (targetValue: string, columnIndex: number, suggestion: CommandTargetSuggestion) => void;
}

const TARGET_SECTION_LABELS: Record<string, string> = {
    ally: 'Allies', allies: 'Allies',
    enemy: 'Enemies', enemies: 'Enemies',
    npc: 'NPCs', npcs: 'NPCs',
    pc: 'Players', player: 'Players', players: 'Players', who: 'Players',
    characters: 'Characters',
    object: 'Room Objects', objects: 'Room Objects', room: 'Room Objects',
    exit: 'Exits',
    inventory: 'Inventory', worn: 'Worn', self: 'Self', source: 'Sources',
    spell: 'Spells', 'magic-key': 'Keys', social: 'Commands', mount: 'Mounts'
};

const getTargetSection = (meta: string): string => {
    const normalized = meta.toLowerCase();
    return TARGET_SECTION_LABELS[normalized] || normalized.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export const TacticalTargetBar: FC<TacticalTargetBarProps> = ({
    isOpen,
    currentTarget,
    selectedTarget,
    onSelectTarget,
    roomOccupants,
    roomItems = [],
    characterName = '',
    suggestions,
    title = 'TARGETS',
    commandLabel,
    isInteractive = true,
    isBlurred = false,
    onHoverTarget,
    onDismiss,
    columns,
    onSelectColumnTarget
}) => {
    const touchRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const dragRef = useRef<{ y: number; scrollDistance: number; isScrolling: boolean; x: number; list: HTMLDivElement } | null>(null);
    const settleTimerRef = useRef<number | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);
    const candidates: CommandTargetSuggestion[] = useMemo(() => {
        if (!isOpen) return [];
        return suggestions ?? getRoomTargetSuggestions(roomOccupants, roomItems, 'characters', characterName);
    }, [isOpen, roomOccupants, roomItems, characterName, suggestions]);
    const groupSections = (items: CommandTargetSuggestion[]) => {
        const grouped = new Map<string, CommandTargetSuggestion[]>();
        items.forEach(candidate => {
            const section = getTargetSection(candidate.meta || 'targets');
            grouped.set(section, [...(grouped.get(section) || []), candidate]);
        });
        return Array.from(grouped.entries());
    };

    const renderTargetList = (items: CommandTargetSuggestion[], selectedValue: string | null, columnIndex?: number, emptyText?: string, selectedKey?: string | null) => {
        const sections = groupSections(items);
        if (items.length === 0) return <div className="tactical-target-bar-empty">{emptyText || 'Choose from the other list'}</div>;
        return sections.map(([section, sectionCandidates]) => (
            <div className="tactical-target-bar-section" key={section}>
                {sections.length > 1 && <div className="tactical-target-bar-section-header">{section}</div>}
                {sectionCandidates.map(cand => {
                    const cleanLock = currentTarget ? currentTarget.replace(/[*']/g, '').trim().toLowerCase() : '';
                    const cleanSel = selectedValue ? selectedValue.replace(/[*']/g, '').trim().toLowerCase() : '';
                    const cleanVal = cand.value.replace(/[*']/g, '').trim().toLowerCase();
                    const cleanLabel = cand.label.replace(/[*']/g, '').trim().toLowerCase();
                    const lockWords = cleanLock ? cleanLock.split(/\s+/) : [];
                    const isLocked = Boolean(cleanLock && (
                        cleanLock === cleanVal || cleanLabel === cleanLock || cleanLabel.split(/\s+/).includes(cleanLock) || lockWords.includes(cleanVal)
                    ));
                    const isSelected = selectedKey
                        ? selectedKey === cand.key
                        : cleanSel
                            ? cleanSel === cleanVal || cleanSel === cleanLabel
                            : isLocked;

                    return <div
                        key={cand.key}
                        role="button"
                        tabIndex={0}
                        data-target-value={cand.value}
                        data-target-column={columnIndex}
                        className={`tactical-target-bar-item ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`}
                        onPointerEnter={() => onHoverTarget?.(cand.value)}
                        onPointerLeave={() => onHoverTarget?.(null)}
                        onPointerDown={event => {
                            event.stopPropagation();
                            touchRef.current = { x: event.clientX, y: event.clientY, moved: false };
                        }}
                        onPointerUp={event => event.stopPropagation()}
                        onClick={event => {
                            event.stopPropagation();
                            if (!touchRef.current && onHoverTarget) return;
                            if (!touchRef.current?.moved) {
                                if (columnIndex !== undefined) onSelectColumnTarget?.(cand.value, columnIndex, cand);
                                else onSelectTarget(cand.value);
                            }
                            touchRef.current = null;
                        }}
                        onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                if (columnIndex !== undefined) onSelectColumnTarget?.(cand.value, columnIndex, cand);
                                else onSelectTarget(cand.value);
                            }
                        }}
                    ><span className="tactical-target-bar-name" title={cand.label}>{cand.label}</span></div>;
                })}
            </div>
        ));
    };

    useEffect(() => {
        if (!isOpen) {
            dragRef.current = null;
            return;
        }

        const clearSettleTimer = () => {
            if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
            settleTimerRef.current = null;
        };

        // Game buttons capture the initiating touch for swipe gestures. Track its
        // screen position globally so the target list can still be picked or scrolled.
        const handleHeldPointerMove = (event: PointerEvent) => {
            // Some mobile browsers report buttons=0 for touch pointermove after
            // a captured long press. The pointer is still down, so keep routing
            // that movement through the target list's scroll/hover handling.
            if (event.pointerType !== 'touch' && event.buttons === 0) return;
            const hit = document.elementFromPoint?.(event.clientX, event.clientY) as HTMLElement | null | undefined;
            const list = hit?.closest('.tactical-target-bar-list') as HTMLDivElement | null;
            if (!list) {
                dragRef.current = null;
                clearSettleTimer();
                return;
            }

            const previous = dragRef.current;
            if (!previous) {
                list.dataset.scrolling = 'false';
                dragRef.current = { y: event.clientY, x: event.clientX, scrollDistance: 0, isScrolling: false, list };
                const item = hit?.closest('.tactical-target-bar-item') as HTMLElement | null;
                onHoverTarget?.(item?.dataset.targetValue ?? null);
                return;
            }

            const deltaY = event.clientY - previous.y;
            const scrollDistance = previous.scrollDistance + Math.abs(deltaY);
            const isScrolling = previous.isScrolling || scrollDistance > 24;
            dragRef.current = { y: event.clientY, x: event.clientX, scrollDistance, isScrolling, list };

            if (isScrolling) {
                list.dataset.scrolling = 'true';
                list.scrollTop -= deltaY;
                onHoverTarget?.(null);
                clearSettleTimer();
                settleTimerRef.current = window.setTimeout(() => {
                    const current = dragRef.current;
                    if (!current?.isScrolling) return;
                    current.list.dataset.scrolling = 'false';
                    dragRef.current = { ...current, scrollDistance: 0, isScrolling: false };
                    const settledHit = document.elementFromPoint?.(current.x, current.y) as HTMLElement | null | undefined;
                    const settledItem = settledHit?.closest('.tactical-target-bar-item') as HTMLElement | null;
                    onHoverTarget?.(settledItem?.dataset.targetValue ?? null);
                    settleTimerRef.current = null;
                }, 180);
                return;
            }

            const item = hit?.closest('.tactical-target-bar-item') as HTMLElement | null;
            onHoverTarget?.(item?.dataset.targetValue ?? null);
        };

        const resetHeldPointer = () => {
            clearSettleTimer();
            dragRef.current = null;
            document.querySelectorAll<HTMLElement>('.tactical-target-bar-list').forEach(list => {
                list.dataset.scrolling = 'false';
            });
        };

        window.addEventListener('pointermove', handleHeldPointerMove, true);
        window.addEventListener('pointerup', resetHeldPointer);
        window.addEventListener('pointercancel', resetHeldPointer);
        return () => {
            window.removeEventListener('pointermove', handleHeldPointerMove, true);
            window.removeEventListener('pointerup', resetHeldPointer);
            window.removeEventListener('pointercancel', resetHeldPointer);
            clearSettleTimer();
        };
    }, [isOpen, onHoverTarget]);

    useEffect(() => {
        if (!isOpen || !onDismiss) return;
        const dismissOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !barRef.current?.contains(event.target)) onDismiss();
        };
        document.addEventListener('pointerdown', dismissOutside);
        return () => document.removeEventListener('pointerdown', dismissOutside);
    }, [isOpen, onDismiss]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={barRef}
            className={`tactical-target-bar${columns?.length ? ' has-columns' : ''}${commandLabel ? ' has-command' : ''}${isInteractive ? '' : ' is-held'}${isBlurred ? ' is-blurred' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => {
                e.stopPropagation();
                const touch = touchRef.current;
                if (touch && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > 8) touch.moved = true;
            }}
            onPointerCancel={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="tactical-target-bar-header">
                <span className="tactical-target-bar-title">
                    <span>▸ {title}</span>
                    <span className="tactical-target-bar-count">({columns?.length ? columns.reduce((count, column) => count + column.suggestions.length, 0) : candidates.length})</span>
                </span>
            </div>
            <div className="tactical-target-bar-body">
                {commandLabel && <div className="tactical-target-bar-command" aria-label={`Command: ${commandLabel}`}>
                    <span>{commandLabel}</span>
                </div>}
                {columns?.length ? (
                    <div className="tactical-target-bar-columns">
                        {columns.map((column, index) => <section className="tactical-target-bar-column" key={`${column.title}-${index}`}>
                            <h3 className="tactical-target-bar-column-title">{column.title}</h3>
                            <div className="tactical-target-bar-list" onScroll={() => {
                                if (touchRef.current) touchRef.current.moved = true;
                            }}>
                                {renderTargetList(column.suggestions, column.selectedTarget, index, column.emptyText, column.selectedKey)}
                            </div>
                        </section>)}
                    </div>
                ) : (
                    <div className="tactical-target-bar-list" onScroll={() => {
                        if (touchRef.current) touchRef.current.moved = true;
                    }}>
                        {candidates.length === 0
                            ? <div className="tactical-target-bar-empty">{title === 'WHO LIST' ? 'No players in WHO list' : title === 'SOCIAL COMMANDS' ? 'No social commands' : 'No viable targets'}</div>
                            : renderTargetList(candidates, selectedTarget)}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
