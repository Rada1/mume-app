/** @file TacticalTargetList.tsx — Grouped, selectable suggestions for target menus. */

import React from 'react';
import type { CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import { useGame } from '../../../context/GameContext';
import type { EntityColorMap } from '../../../utils/inlineActionModel';
import { getTargetClassificationColor } from '../../../utils/targetClassificationColor';
import { getTargetItemTierClassName } from '../../../utils/itemTier';
import { formatMagicKeyRemaining, getMagicKeyId, renameMagicKeyTarget } from '../../../utils/magicKeyUtils';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import type { TargetListTouch } from './useTargetListPointer';
import './TacticalTargetList.css';

// --- Logic Section ---
const getClickPointerId = (event: React.MouseEvent<HTMLDivElement>): number | undefined => {
    const pointerId = (event.nativeEvent as PointerEvent).pointerId;
    return Number.isFinite(pointerId) ? pointerId : undefined;
};

const TARGET_SECTION_LABELS: Record<string, string> = {
    self: 'Allies', ally: 'Allies', allies: 'Allies', 'group-member': 'Group', enemy: 'Enemies', enemies: 'Enemies',
    npc: 'NPCs', npcs: 'NPCs', pc: 'Players', player: 'Players', players: 'Players', who: 'Players',
    characters: 'Characters', object: 'Room Objects', objects: 'Room Objects', room: 'Room Objects',
    exit: 'Exits', inventory: 'Inventory', worn: 'Worn', source: 'Sources',
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
    showWornLocation?: boolean;
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
    showWornLocation = false, isSwipeTargeting, keepOpenAfterFire, showSendIndicator = false, touchesRef, lastPointerUpSelectionRef,
    onSelectTarget, onSelectColumnTarget, onHoverTarget, onToggleTargetLock
}) => {
    const { triggerHaptic } = useGame();
    const [now, setNow] = React.useState(Date.now());
    const hasExpiringTargets = items.some(item => item.expiresAt !== undefined);
    const visibleItems = items.filter(item => item.expiresAt === undefined || item.expiresAt > now);
    React.useEffect(() => {
        if (!hasExpiringTargets) return;
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, [hasExpiringTargets]);
    const inlineCategories = useSettingsStore(state => state.inlineCategories);
    const objectColor = useSettingsStore(state => state.objectColor);
    const playerColor = useSettingsStore(state => state.playerColor);
    const npcColor = useSettingsStore(state => state.npcColor);
    const enemyColor = useSettingsStore(state => state.enemyColor);
    const neutralColor = useSettingsStore(state => state.neutralColor);
    const theme = useSettingsStore(state => state.theme);
    const teleportTargets = useSettingsStore(state => state.teleportTargets);
    const setTeleportTargets = useSettingsStore(state => state.setTeleportTargets);
    const entityColors: EntityColorMap = {
        object: objectColor,
        player: playerColor,
        npc: npcColor,
        enemy: enemyColor,
        neutral: neutralColor
    };
    const lockPointerDownsRef = React.useRef(new Map<number, string>());
    if (visibleItems.length === 0) return <div className="tactical-target-bar-empty">{emptyText || 'No active saved keys'}</div>;

    const getClassificationColor = (meta: string, objectLocation?: CommandTargetSuggestion['objectLocation']): string | undefined => {
        return getTargetClassificationColor(meta, inlineCategories, entityColors, theme, objectLocation) || undefined;
    };

    const grouped = new Map<string, CommandTargetSuggestion[]>();
    visibleItems.forEach(candidate => {
        const section = getTargetSection(candidate.meta || 'targets');
        grouped.set(section, [...(grouped.get(section) || []), candidate]);
    });
    const sections = Array.from(grouped.entries());

    return <>{sections.map(([section, sectionCandidates]) => (
        <div className="tactical-target-bar-section" key={section}>
            {sections.length > 1 && <div
                className="tactical-target-bar-section-header"
                style={{ color: getClassificationColor(sectionCandidates[0]?.meta || '', sectionCandidates[0]?.objectLocation) }}
            >{section}</div>}
            {sectionCandidates.map(candidate => {
                const classificationColor = getClassificationColor(candidate.meta, candidate.objectLocation);
                const itemTierClassName = getTargetItemTierClassName(candidate.label);
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
                const clearMagicKey = () => {
                    triggerHaptic(8);
                    setTeleportTargets(current => current.filter(target => getMagicKeyId(target) !== candidate.value));
                };

                const canLockTarget = Boolean(onToggleTargetLock)
                    && candidate.meta !== 'social'
                    && !['__blank_target__', '__social_no_target__', '__room__'].includes(candidate.value);

                return <div
                    key={candidate.key}
                    role="button"
                    tabIndex={0}
                    data-target-value={candidate.value}
                    data-target-column={columnIndex}
                    data-target-meta={candidate.meta}
                    className={`tactical-target-bar-item ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''} ${isConfirmed ? 'is-confirmed' : ''}`}
                    style={{ '--target-classification-color': classificationColor || undefined } as React.CSSProperties}
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
                >{showWornLocation && candidate.meta === 'worn' && candidate.wornLocation && <span className="tactical-target-bar-worn-location">{candidate.wornLocation}</span>}<span
                    className="tactical-target-bar-name"
                    title={candidate.label}
                    style={{ color: classificationColor }}
                ><span className={`tactical-target-bar-name-text ${itemTierClassName}`.trim()}>{candidate.label}</span>{candidate.details?.length ? <span
                    className="tactical-target-bar-details"
                    aria-label={`${candidate.label} group details`}
                >{candidate.details.map(detail => <span className="tactical-target-bar-detail" key={`${detail.label}-${detail.value}`}>
                    <span className="tactical-target-bar-detail-label">{detail.label}</span>
                    <strong className="tactical-target-bar-detail-value">{detail.value}</strong>
                </span>)}</span> : candidate.customLabel && <span
                    className="tactical-target-bar-custom-label"
                    title={`Label: ${candidate.customLabel}`}
                >{candidate.customLabel}</span>}</span>{candidate.meta === 'magic-key' && <span
                    className="tactical-target-bar-key-id"
                    title={`Magic key ${candidate.value}`}
                >{candidate.value}</span>}{candidate.expiresAt !== undefined && <span
                    className="tactical-target-bar-expiry"
                    title={`Active for ${formatMagicKeyRemaining(candidate.expiresAt, now)}`}
                >{formatMagicKeyRemaining(candidate.expiresAt, now)}</span>}{canLockTarget && <button
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
                ><span aria-hidden="true">{isTargetLocked ? '✓' : ''}</span></button>}{candidate.meta === 'magic-key' && <>
                    <button
                        type="button"
                        className="tactical-target-bar-key-action"
                        aria-label={`${candidate.customLabel ? 'Edit' : 'Add'} label for ${candidate.label}`}
                        title={candidate.customLabel ? 'Edit label' : 'Add a short label'}
                        onPointerDown={event => {
                            event.stopPropagation();
                            const value = window.prompt('Add a short label for this portkey (28 characters max):', candidate.customLabel || '');
                            if (value !== null) setTeleportTargets(current => renameMagicKeyTarget(current, candidate.value, value));
                        }}
                        onPointerUp={event => event.stopPropagation()}
                        onClick={event => {
                            event.stopPropagation();
                            if (event.detail === 0) {
                                const value = window.prompt('Add a short label for this portkey (28 characters max):', candidate.customLabel || '');
                                if (value !== null) setTeleportTargets(current => renameMagicKeyTarget(current, candidate.value, value));
                            }
                        }}
                        onKeyDown={event => event.stopPropagation()}
                    >Label</button>
                    <button
                        type="button"
                        className="tactical-target-bar-key-action is-clear"
                        aria-label={`Clear portkey ${candidate.label}`}
                        title="Clear saved portkey"
                        onPointerDown={event => {
                            event.stopPropagation();
                            clearMagicKey();
                        }}
                        onPointerUp={event => event.stopPropagation()}
                        onClick={event => {
                            event.stopPropagation();
                            if (event.detail === 0) clearMagicKey();
                        }}
                        onKeyDown={event => event.stopPropagation()}
                    >×</button>
                </>}{showSendIndicator && <span className="tactical-target-bar-send" aria-label="Sends command">➤</span>}</div>;
            })}
        </div>
    ))}</>;
};
