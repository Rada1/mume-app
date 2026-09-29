/** @file TacticalTargetList.tsx — Grouped, selectable suggestions for target menus. */

import React from 'react';
import type { CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import type { TargetListTouch } from './useTargetListPointer';
import './TacticalTargetList.css';

// --- Logic Section ---
const getClickPointerId = (event: React.MouseEvent<HTMLDivElement>): number | undefined => {
    const pointerId = (event.nativeEvent as PointerEvent).pointerId;
    return Number.isFinite(pointerId) ? pointerId : undefined;
};

const TARGET_SECTION_LABELS: Record<string, string> = {
    ally: 'Allies', allies: 'Allies', enemy: 'Enemies', enemies: 'Enemies',
    npc: 'NPCs', npcs: 'NPCs', pc: 'Players', player: 'Players', players: 'Players', who: 'Players',
    characters: 'Characters', object: 'Room Objects', objects: 'Room Objects', room: 'Room Objects',
    exit: 'Exits', inventory: 'Inventory', worn: 'Worn', self: 'Self', source: 'Sources',
    spell: 'Spells', 'magic-key': 'Keys', social: 'Commands', mount: 'Mounts'
};

const getTargetSection = (meta: string): string => {
    const normalized = meta.toLowerCase();
    return TARGET_SECTION_LABELS[normalized] || normalized.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

interface Props {
    items: CommandTargetSuggestion[];
    currentTarget: string | null;
    selectedValue: string | null;
    confirmedValue?: string | null;
    columnIndex?: number;
    emptyText?: string;
    selectedKey?: string | null;
    isSwipeTargeting: boolean;
    keepOpenAfterFire: boolean;
    showSendIndicator?: boolean;
    touchesRef: React.MutableRefObject<Map<number, TargetListTouch>>;
    lastPointerUpSelectionRef: React.MutableRefObject<Map<string, number>>;
    onSelectTarget: (targetValue: string, keepOpenAfterFire?: boolean) => void;
    onToggleTargetLock?: (targetValue: string) => void;
    onSelectColumnTarget?: (targetValue: string, columnIndex: number, suggestion: CommandTargetSuggestion, keepOpenAfterFire?: boolean) => void;
    onHoverTarget?: (targetValue: string | null) => void;
}

// --- UI Section ---
export const TacticalTargetList: React.FC<Props> = ({
    items, currentTarget, selectedValue, confirmedValue, columnIndex, emptyText, selectedKey,
    isSwipeTargeting, keepOpenAfterFire, showSendIndicator = false, touchesRef, lastPointerUpSelectionRef,
    onSelectTarget, onSelectColumnTarget, onHoverTarget, onToggleTargetLock
}) => {
    const lockPointerDownsRef = React.useRef(new Map<number, string>());
    if (items.length === 0) return <div className="tactical-target-bar-empty">{emptyText || 'Choose from the other list'}</div>;

    const grouped = new Map<string, CommandTargetSuggestion[]>();
    items.forEach(candidate => {
        const section = getTargetSection(candidate.meta || 'targets');
        grouped.set(section, [...(grouped.get(section) || []), candidate]);
    });
    const sections = Array.from(grouped.entries());

    return <>{sections.map(([section, sectionCandidates]) => (
        <div className="tactical-target-bar-section" key={section}>
            {sections.length > 1 && <div className="tactical-target-bar-section-header">{section}</div>}
            {sectionCandidates.map(candidate => {
                const cleanLock = currentTarget ? currentTarget.replace(/[*']/g, '').trim().toLowerCase() : '';
                const cleanSelected = selectedValue ? selectedValue.replace(/[*']/g, '').trim().toLowerCase() : '';
                const cleanConfirmed = confirmedValue ? confirmedValue.replace(/[*']/g, '').trim().toLowerCase() : '';
                const cleanValue = candidate.value.replace(/[*']/g, '').trim().toLowerCase();
                const cleanLabel = candidate.label.replace(/[*']/g, '').trim().toLowerCase();
                const normalizedLockValue = (value: string | null) => value?.replace(/[*']/g, '').trim().toLowerCase() || '';
                const isTargetLocked = normalizedLockValue(currentTarget) === normalizedLockValue(candidate.value);
                const lockWords = cleanLock ? cleanLock.split(/\s+/) : [];
                const isLocked = Boolean(cleanLock && (
                    cleanLock === cleanValue || cleanLabel === cleanLock || cleanLabel.split(/\s+/).includes(cleanLock) || lockWords.includes(cleanValue)
                ));
                const isSelected = selectedKey
                    ? selectedKey === candidate.key
                    : cleanSelected
                        ? cleanSelected === cleanValue || cleanSelected === cleanLabel
                        : isLocked;
                const isConfirmed = Boolean(cleanConfirmed && (cleanConfirmed === cleanValue || cleanConfirmed === cleanLabel));
                const select = () => columnIndex !== undefined
                    ? onSelectColumnTarget?.(candidate.value, columnIndex, candidate, keepOpenAfterFire)
                    : onSelectTarget(candidate.value, keepOpenAfterFire);

                const canLockTarget = Boolean(onToggleTargetLock)
                    && candidate.meta !== 'social'
                    && !['__blank_target__', '__social_no_target__', '__room__'].includes(candidate.value);

                return <div
                    key={candidate.key}
                    role="button"
                    tabIndex={0}
                    data-target-value={candidate.value}
                    data-target-column={columnIndex}
                    className={`tactical-target-bar-item ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''} ${isConfirmed ? 'is-confirmed' : ''}`}
                    onPointerEnter={() => onHoverTarget?.(candidate.value)}
                    onPointerLeave={() => onHoverTarget?.(null)}
                    onPointerDown={event => {
                        event.stopPropagation();
                        touchesRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: false });
                        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* The pointer may already be captured by the command wheel. */ }
                    }}
                    onPointerUp={event => {
                        event.stopPropagation();
                        const touch = touchesRef.current.get(event.pointerId);
                        if (!isSwipeTargeting || event.pointerType !== 'touch' || !touch || touch.moved) return;
                        select();
                        lastPointerUpSelectionRef.current.set(candidate.value, Date.now());
                        touchesRef.current.delete(event.pointerId);
                    }}
                    onClick={event => {
                        event.stopPropagation();
                        const lastSelectionAt = lastPointerUpSelectionRef.current.get(candidate.value);
                        if (lastSelectionAt !== undefined && Date.now() - lastSelectionAt < 500) {
                            lastPointerUpSelectionRef.current.delete(candidate.value);
                            const pointerId = getClickPointerId(event);
                            if (pointerId !== undefined) touchesRef.current.delete(pointerId);
                            return;
                        }
                        const pointerId = getClickPointerId(event);
                        const touch = pointerId !== undefined ? touchesRef.current.get(pointerId) : undefined;
                        if (!touch && onHoverTarget) return;
                        if (!touch?.moved) select();
                        if (pointerId !== undefined) touchesRef.current.delete(pointerId);
                    }}
                    onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            select();
                        }
                    }}
                ><span className="tactical-target-bar-name" title={candidate.label}>{candidate.label}</span>{canLockTarget && <button
                    type="button"
                    role="checkbox"
                    aria-checked={isTargetLocked}
                    aria-label={`${isTargetLocked ? 'Unlock' : 'Lock'} ${candidate.label} as target`}
                    title={isTargetLocked ? 'Clear locked target' : 'Lock as target'}
                    className={`tactical-target-lock-checkbox${isTargetLocked ? ' is-checked' : ''}`}
                    onPointerDown={event => {
                        event.stopPropagation();
                        lockPointerDownsRef.current.set(event.pointerId, candidate.key);
                    }}
                    onPointerUp={event => {
                        event.stopPropagation();
                        const pressedKey = lockPointerDownsRef.current.get(event.pointerId);
                        lockPointerDownsRef.current.delete(event.pointerId);
                        if (pressedKey === candidate.key) onToggleTargetLock?.(candidate.value);
                    }}
                    onPointerCancel={event => {
                        event.stopPropagation();
                        lockPointerDownsRef.current.delete(event.pointerId);
                    }}
                    onClick={event => {
                        event.stopPropagation();
                        if (event.detail === 0) onToggleTargetLock?.(candidate.value);
                    }}
                    onKeyDown={event => event.stopPropagation()}
                ><span aria-hidden="true">{isTargetLocked ? '✓' : ''}</span></button>}{showSendIndicator && <span className="tactical-target-bar-send" aria-label="Sends command">➤</span>}</div>;
            })}
        </div>
    ))}</>;
};
