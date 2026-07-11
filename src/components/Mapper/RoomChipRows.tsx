/**
 * @file RoomChipRows.tsx
 * @description Displays room character and object keyword chips under the mapper room card.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { useCombatRechargeStore, CombatRechargeTimer } from '../../stores/useCombatRechargeStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { audioManager } from '../../services/audio/AudioManager';
import type { GmcpOccupant } from '../../types';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';
import { getCategoryIdForKindLocation, toCategoryId } from '../../utils/inlineActionModel';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';
import { extractMumeKeyword } from '../../utils/gameUtils';
import { useObjectDragCommands } from '../../hooks/useObjectDragCommands';
import { targetTextMatchesEntity } from '../../utils/selectionUtils';
import { getInlineCategoryAxes } from '../../utils/inlineCategoryAxes';
import { useCharacterCardStore } from '../../stores/useCharacterCardStore';
import { Box, Swords, Users } from 'lucide-react';
import { getEntityTypeIcon } from '../Messages/TokenRenderer';
import './RoomChipRows.css';

type CharacterKind = 'enemy' | 'npc' | 'ally' | 'neutral';
type ChipKind = CharacterKind | 'object';

interface RoomChip {
    entityId: string;
    label: string;
    context: string;
    category: string;
    kind: ChipKind;
}

type OccupantSource = GmcpOccupant | string;

const CHARACTER_ORDER: Record<CharacterKind, number> = { enemy: 0, npc: 1, ally: 2, neutral: 3 };

const getLatestSwing = (timers: Partial<Record<string, CombatRechargeTimer>>): { startedAt: number; isLanded: boolean } => {
    let startedAt = 0;
    let isLanded = false;
    for (const timer of Object.values(timers)) {
        if (timer && timer.startedAt > startedAt) {
            startedAt = timer.startedAt;
            isLanded = timer.isLanded !== false;
        }
    }
    return { startedAt, isLanded };
};

// Briefly toggles a boolean on (after a frame so a rapid re-trigger restarts the
// CSS animation), then off after `ms`. Returns a cleanup for the effect.
const pulseState = (setter: (value: boolean) => void, ms: number): (() => void) => {
    setter(false);
    let timeoutId = 0;
    const frameId = window.requestAnimationFrame(() => {
        setter(true);
        timeoutId = window.setTimeout(() => setter(false), ms);
    });
    return () => {
        window.cancelAnimationFrame(frameId);
        if (timeoutId) window.clearTimeout(timeoutId);
    };
};

const getName = (source: OccupantSource): string => (
    typeof source === 'string'
        ? source
        : source.name || source.short || source.shortdesc || source.keyword || source.desc || ''
).trim();

const isSelf = (source: OccupantSource, characterName: string | null | undefined): boolean => {
    if (typeof source === 'string') return false;
    const type = normalizeOccupantType(source)?.toLowerCase();
    const name = getName(source);
    return type === 'you' || type === 'self' || (
        !!characterName && name.toLowerCase() === characterName.toLowerCase()
    );
};

const getCharacterKind = (source: OccupantSource): CharacterKind => {
    if (typeof source === 'string') return 'npc';
    const type = normalizeOccupantType(source)?.toLowerCase();
    if (type === 'enemy') return 'enemy';
    if (type === 'neutral') return 'neutral';
    if (type === 'npc' || type === 'mob' || type === 'mobile' || type === 'mount') return 'npc';
    return 'ally';
};

const getKeyword = (source: OccupantSource, fallback: string): string => {
    if (typeof source === 'string') return getOccupantCommandKeyword({ name: source }, fallback);
    return source.keyword || getOccupantCommandKeyword(source, fallback);
};

const getSourceId = (source: OccupantSource): string | number | undefined => (
    typeof source === 'string' ? undefined : source.id
);

const getCharacterEntityId = (source: OccupantSource, keyword: string): string => {
    const id = getSourceId(source);
    return id != null ? `roomchars:${id}` : `roomchars:${keyword}`;
};

const getItemEntityId = (source: GmcpOccupant, keyword: string): string => {
    const id = source.id;
    if (typeof id === 'string' && id.startsWith('roomitems:')) return id;
    return id != null ? `roomitems:${id}` : `roomitems:${keyword}`;
};

type ChipColorVars = React.CSSProperties & Record<
    '--enemy-color' | '--npc-color' | '--player-color' | '--neutral-color' | '--object-color' | '--target-color',
    string
>;

const withDuplicateOrdinals = (chips: RoomChip[]): RoomChip[] => {
    const totals = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.label] = (acc[chip.label] || 0) + 1;
        return acc;
    }, {});
    const idTotals = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.entityId] = (acc[chip.entityId] || 0) + 1;
        return acc;
    }, {});
    const seen: Record<string, number> = {};
    const seenIds: Record<string, number> = {};

    return chips.map(chip => {
        const labelIndex = (seen[chip.label] || 0) + 1;
        const idIndex = (seenIds[chip.entityId] || 0) + 1;
        seen[chip.label] = labelIndex;
        seenIds[chip.entityId] = idIndex;

        return { ...chip, entityId: idTotals[chip.entityId] > 1 ? `${chip.entityId}#${idIndex}` : chip.entityId, label: totals[chip.label] > 1 ? `${labelIndex}.${chip.label}` : chip.label };
    });
};

const CONSIDER_DELAY_MS = 850;

interface RoomChipRowsProps {
    variant?: 'summary' | 'columns' | 'occupants-row' | 'objects-row' | 'terrain-pins';
}

export const RoomChipRows: React.FC<RoomChipRowsProps> = ({ variant = 'summary' }) => {
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const {
        characterName, roomChars, roomPlayers, roomNpcs, roomItems,
        triggerHaptic, inCombat, executeCommand, setPopoverState, popoverState
    } = useGame();
    const { target, setTarget, opponentId, opponentName } = useVitals();
    const selectedTarget = useUIStore(s => s.selectedTarget);
    const toggleObjectSelection = useUIStore(s => s.toggleObjectSelection);
    const objectDragState = useUIStore(s => s.objectDragState);
    const openCharacterCard = useCharacterCardStore(s => s.open);
    const startObjectDrag = useObjectDragCommands({ executeCommand, triggerHaptic });
    const colorVars: ChipColorVars = {
        '--enemy-color': useSettingsStore(s => s.enemyColor),
        '--npc-color': useSettingsStore(s => s.npcColor),
        '--player-color': useSettingsStore(s => s.playerColor),
        '--neutral-color': useSettingsStore(s => s.neutralColor),
        '--object-color': useSettingsStore(s => s.objectColor),
        '--target-color': useSettingsStore(s => s.targetColor)
    };

    // --- Directional combat lunge + damage flash for the terrain-pin avatars in the log ---
    const activeTimers = useCombatRechargeStore(state => state.active);
    const opponentTimers = useCombatRechargeStore(state => state.opponentActive);
    const playerSwing = useMemo(() => getLatestSwing(activeTimers), [activeTimers]);
    const opponentSwing = useMemo(() => getLatestSwing(opponentTimers), [opponentTimers]);
    const [isPlayerLunging, setIsPlayerLunging] = useState(false);
    const [isOpponentLunging, setIsOpponentLunging] = useState(false);
    const [isPlayerHit, setIsPlayerHit] = useState(false);
    const [isOpponentHit, setIsOpponentHit] = useState(false);

    // You swing -> your pin nudges toward the enemy; if it lands, the enemy pin flashes red.
    useEffect(() => {
        if (!playerSwing.startedAt) return;
        return pulseState(setIsPlayerLunging, 280);
    }, [playerSwing.startedAt]);
    useEffect(() => {
        if (!playerSwing.startedAt || !playerSwing.isLanded) return;
        return pulseState(setIsOpponentHit, 450);
    }, [playerSwing.startedAt]);

    // Opponent swings -> its pin nudges toward you; if it lands, your pin flashes red.
    useEffect(() => {
        if (!opponentSwing.startedAt) return;
        return pulseState(setIsOpponentLunging, 280);
    }, [opponentSwing.startedAt]);
    useEffect(() => {
        if (!opponentSwing.startedAt || !opponentSwing.isLanded) return;
        return pulseState(setIsPlayerHit, 450);
    }, [opponentSwing.startedAt]);

    const isChipOpponent = (chip: RoomChip): boolean => {
        if (!inCombat) return false;
        const rawIdMatch = chip.entityId.match(/^roomchars:([^#]+)/);
        const occupantIdStr = rawIdMatch ? rawIdMatch[1] : '';
        if (opponentId && occupantIdStr && String(opponentId) === String(occupantIdStr)) return true;
        if (!opponentName) return false;
        const normOpponent = opponentName.replace(/^[*-]+|[*-]+$/g, '').replace(/^(a|an|the)\s+/i, '').trim().toLowerCase();
        const cleanLabel = chip.label.replace(/^\d+\./, '');
        const normChipLabel = cleanLabel.replace(/^[*-]+|[*-]+$/g, '').replace(/^(a|an|the)\s+/i, '').trim().toLowerCase();
        return !!(normOpponent && normChipLabel && (normOpponent === normChipLabel || normOpponent.includes(normChipLabel) || normChipLabel.includes(normOpponent)));
    };

    const characterChips = useMemo(() => {
        const charList = Object.values(roomChars || {});
        const sources: OccupantSource[] = charList.length > 0
            ? charList
            : [...roomPlayers, ...roomNpcs];

        const chips = sources
            .filter(source => !isSelf(source, characterName))
            .map<RoomChip | null>(source => {
                const name = getName(source);
                if (!name) return null;
                const kind = getCharacterKind(source);
                const keyword = getKeyword(source, name);
                const category = typeof source === 'string'
                    ? getCategoryIdForKindLocation(kind, 'room')
                    : toCategoryId(source.category) || getCategoryIdForKindLocation(kind, 'room');

                return {
                    entityId: getCharacterEntityId(source, keyword),
                    label: keyword,
                    context: keyword,
                    category,
                    kind
                };
            })
            .filter((chip): chip is RoomChip => !!chip)
            .sort((a, b) => CHARACTER_ORDER[a.kind as CharacterKind] - CHARACTER_ORDER[b.kind as CharacterKind]);

        return withDuplicateOrdinals(chips);
    }, [characterName, roomChars, roomNpcs, roomPlayers]);

    const itemChips = useMemo(() => {
        const chips = roomItems
            .map<RoomChip | null>(item => {
                const name = getName(item);
                if (!name) return null;
                const keyword = extractMumeKeyword(name || getKeyword(item, name));
                const category = toCategoryId(item.category) || getCategoryIdForKindLocation('object', 'room');

                return {
                    entityId: getItemEntityId(item, keyword),
                    label: keyword,
                    context: keyword,
                    category,
                    kind: 'object'
                };
            })
            .filter((chip): chip is RoomChip => !!chip);

        return withDuplicateOrdinals(chips);
    }, [roomItems]);

    const npcChips = useMemo(() => characterChips.filter(c => c.kind === 'npc' || c.kind === 'neutral'), [characterChips]);
    const allyChips = useMemo(() => characterChips.filter(c => c.kind === 'ally'), [characterChips]);
    const enemyChips = useMemo(() => characterChips.filter(c => c.kind === 'enemy'), [characterChips]);

    const rows = [
        {
            id: 'npcs',
            label: 'NPCs',
            icon: <Swords size={11} strokeWidth={2.5} />,
            sectionClass: 'npcs',
            chips: npcChips
        },
        {
            id: 'allies',
            label: 'Allies',
            icon: <Users size={11} strokeWidth={2.5} />,
            sectionClass: 'allies',
            chips: allyChips
        },
        {
            id: 'enemies',
            label: 'Enemies',
            icon: <Swords size={11} strokeWidth={2.5} style={{ color: '#ef4444' }} />,
            sectionClass: 'enemies',
            chips: enemyChips
        },
        {
            id: 'items',
            label: 'Objects',
            icon: <Box size={11} strokeWidth={2.5} />,
            sectionClass: 'objects',
            chips: itemChips
        }
    ].filter(row => row.chips.length > 0);

    // terrain-pins always renders (even with an empty room) so the player's own
    // pixel-art pin stays visible on the ground line; skip the early-out for it.
    if (rows.length === 0 && variant !== 'terrain-pins') return null;
    const activeRow = rows.find(row => row.id === activeRowId) || null;

    const getChipAccentColor = (kind: ChipKind): string => ({
        enemy: colorVars['--enemy-color'],
        npc: colorVars['--npc-color'],
        object: colorVars['--object-color'],
        neutral: colorVars['--neutral-color'],
        ally: colorVars['--player-color']
    }[kind]);

    const selectChip = (event: React.MouseEvent<HTMLButtonElement>, chip: RoomChip) => {
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();
        const axes = getInlineCategoryAxes(chip.category);
        const shouldLook = axes.isTargetable && (axes.isObject || axes.isCharacter), shouldConsider = shouldLook && axes.isCharacter;

        const currentTarget = useUIStore.getState().selectedTarget;
        const isAlreadySelected = currentTarget?.id === chip.entityId;

        if (isAlreadySelected) {
            audioManager.playEffect('actionmenu');
            triggerHaptic?.(20);

            setPopoverState({
                x: rect.left + rect.width / 2,
                y: rect.bottom,
                sourceHeight: rect.height,
                sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                type: 'menu',
                setId: chip.category,
                category: chip.category,
                context: chip.context,
                entityId: chip.entityId,
                accentColor: getChipAccentColor(chip.kind),
                menuDisplay: 'list',
                preferSide: 'top',
                isCapturingExamine: shouldLook,
                isCapturingConsider: shouldConsider,
                capturedExamineLines: undefined,
                capturedConsiderLines: undefined
            });

            if (shouldLook) executeCommand(`look ${chip.context}`, true, true, false, false, { shouldFocus: false, fromUi: true });
            if (shouldConsider) {
                setTimeout(() => {
                    executeCommand(`con ${chip.context}`, true, true, false, false, { shouldFocus: false, fromUi: true });
                }, CONSIDER_DELAY_MS);
            }
            return;
        }

        audioManager.playEffect('target', { skipJitter: true });
        triggerHaptic?.(40);
        toggleObjectSelection({ id: chip.entityId, setId: chip.category, category: chip.category, context: chip.context });
        setTarget(chip.context);

        if (popoverState && popoverState.entityId !== chip.entityId) {
            setPopoverState(null);
        }
    };

    const renderChip = (chip: RoomChip, onSelect?: () => void) => {
        const isTarget = targetTextMatchesEntity(target, chip.context, chip.label);
        const isSelected = selectedTarget?.id === chip.entityId || isTarget;
        const isOpponent = isChipOpponent(chip);

        const typeIcon = getEntityTypeIcon(chip.category);

        return (
            <button
                key={chip.entityId}
                type="button"
                className={`room-chip room-chip-${chip.kind}${isSelected ? ' is-active is-target' : ''}${isOpponent ? ' is-opponent' : ''}${objectDragState?.target?.type === 'entity' && objectDragState.target.entityId === chip.entityId ? ' is-drop-target' : ''}`}
                onClick={event => {
                    selectChip(event, chip);
                    onSelect?.();
                }}
                onPointerDown={chip.kind === 'object' ? event => startObjectDrag(event, { row: 'room', noun: chip.label, label: chip.label }) : undefined}
                data-object-drop-entity={chip.kind !== 'object' ? chip.entityId : undefined}
                data-object-drop-noun={chip.kind !== 'object' ? chip.label : undefined}
                data-object-drop-label={chip.kind !== 'object' ? chip.label : undefined}
                title={chip.context}
            >
                {chip.label}
                {typeIcon && (
                    <span
                        className={`inline-entity-type-icon inline-entity-type-${typeIcon.kind}`}
                        aria-hidden="true"
                        title={typeIcon.label}
                        style={{
                            marginLeft: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            verticalAlign: 'middle',
                            opacity: 0.85
                        }}
                    >
                        <typeIcon.icon size={12} strokeWidth={2.6} />
                    </span>
                )}
            </button>
        );
    };

    if (variant === 'terrain-pins') {
        const pinChips = [...characterChips, ...itemChips];
        const openPlayerCard = (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            triggerHaptic?.(15);
            openCharacterCard();
        };

        // Clicking your own pin targets yourself (toggle). Double-click still
        // opens the character card.
        const selfContext = characterName || 'self';
        const selfEntityId = 'roomchars:self';
        const isSelfTarget = selectedTarget?.id === selfEntityId
            || targetTextMatchesEntity(target, selfContext, characterName || 'You');
        const selectSelf = (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            audioManager.playEffect('target', { skipJitter: true });
            triggerHaptic?.(15);
            const isSame = useUIStore.getState().selectedTarget?.id === selfEntityId;
            toggleObjectSelection({ id: selfEntityId, setId: 'cat-ally', category: 'cat-ally', context: selfContext });
            setTarget(isSame ? null : selfContext);
        };

        return (
            <div className="room-chip-terrain-pins" style={colorVars} aria-label="Room entities and objects">
                <div className="terrain-pin terrain-pin-player">
                    <button
                        type="button"
                        className={`room-chip room-chip-player${isSelfTarget ? ' is-active is-target' : ''}`}
                        title={isSelfTarget ? 'Clear yourself as target (double-click for character panel)' : 'Target yourself (double-click for character panel)'}
                        onClick={selectSelf}
                        onDoubleClick={openPlayerCard}
                    >
                        {characterName || 'You'}
                    </button>
                    <span className="terrain-pin-line" />
                    <span className={`terrain-pin-sprite terrain-pin-sprite-player${isPlayerLunging ? ' is-player-lunging' : ''}${isPlayerHit ? ' is-hit' : ''}`} aria-hidden="true">
                        <span className="terrain-pin-sprite-head" />
                        <span className="terrain-pin-sprite-body" />
                    </span>
                </div>
                {pinChips.map(chip => {
                    const chipIsOpponent = isChipOpponent(chip);
                    return (
                    <div className="terrain-pin" key={chip.entityId}>
                        {renderChip(chip)}
                        <span className="terrain-pin-line" />
                        <span className={`terrain-pin-sprite terrain-pin-sprite-${chip.kind}${chipIsOpponent && isOpponentLunging ? ' is-opponent-lunging' : ''}${chipIsOpponent && isOpponentHit ? ' is-hit' : ''}`} aria-hidden="true">
                            {chip.kind === 'object' ? (
                                <span className="terrain-pin-sprite-block" />
                            ) : (
                                <>
                                    <span className="terrain-pin-sprite-head" />
                                    <span className="terrain-pin-sprite-body" />
                                </>
                            )}
                        </span>
                    </div>
                    );
                })}
            </div>
        );
    }

    if (variant === 'occupants-row') {
        if (characterChips.length === 0) return null;
        return (
            <div className="room-chip-occupants-row" style={colorVars} aria-label="Room occupants">
                {characterChips.map(chip => renderChip(chip))}
            </div>
        );
    }

    if (variant === 'objects-row') {
        if (itemChips.length === 0) return null;
        return (
            <div
                className={`room-chip-objects-row${objectDragState?.target?.type === 'row' && objectDragState.target.row === 'room' ? ' is-drop-target' : ''}`}
                style={colorVars}
                aria-label="Room objects"
                data-object-drop-row="room"
            >
                {itemChips.map(chip => renderChip(chip))}
            </div>
        );
    }

    if (variant === 'columns') {
        return (
            <div className="room-chip-columns" style={colorVars} aria-label="Room entities and objects">
                {rows.map(row => (
                    <section
                        key={row.id}
                        className={`room-chip-column room-chip-section-${row.sectionClass}${objectDragState?.target?.type === 'row' && objectDragState.target.row === 'room' && row.id === 'items' ? ' is-drop-target' : ''}`}
                        data-object-drop-row={row.id === 'items' ? 'room' : undefined}
                    >
                        <div className="room-chip-column-title">
                            {row.icon}
                            <span>{row.label}</span>
                            <span className="room-chip-count-badge">{row.chips.length}</span>
                        </div>
                        <div className="room-chip-column-list">
                            {row.chips.map(chip => renderChip(chip))}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    return (
        <div className="room-chip-summary" style={colorVars} aria-label="Room entities and objects">
            {rows.map(row => (
                <button
                    key={row.id}
                    type="button"
                    className={`room-chip-summary-button room-chip-section-${row.sectionClass}${activeRowId === row.id ? ' is-open' : ''}${objectDragState?.target?.type === 'row' && objectDragState.target.row === 'room' && row.id === 'items' ? ' is-drop-target' : ''}`}
                    data-object-drop-row={row.id === 'items' ? 'room' : undefined}
                    title={`${row.label}: ${row.chips.map(chip => chip.label).join(', ')}`}
                    aria-label={`${row.label}: ${row.chips.length}`}
                    onClick={event => {
                        event.stopPropagation();
                        triggerHaptic?.(10);
                        setActiveRowId(prev => prev === row.id ? null : row.id);
                    }}
                >
                    {row.icon}
                    <span>{row.chips.length}</span>
                </button>
            ))}
            {activeRow && (
                <div className="room-chip-popover" onClick={event => event.stopPropagation()}>
                    <div className={`room-chip-popover-title room-chip-section-${activeRow.sectionClass}`}>
                        {activeRow.icon}
                        <span>{activeRow.label}</span>
                    </div>
                    <div className="room-chip-popover-list">
                        {activeRow.chips.map(chip => renderChip(chip, () => setActiveRowId(null)))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(RoomChipRows);
