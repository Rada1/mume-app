/**
 * @file RoomChipRows.tsx
 * @description Displays room character and object keyword chips under the mapper room card.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

    // Terrain-pin focus lane: instead of wrapping the occupant pins onto stacked
    // rows, keep them on one horizontally-scrollable line where the pin nearest
    // the lane's centre is scaled up ("brought to the foreground") and off-centre
    // pins shrink + dim. Every pin stays individually tappable.
    const pinChips = useMemo(() => [...characterChips, ...itemChips], [characterChips, itemChips]);
    const pinChipsKey = useMemo(() => pinChips.map(c => c.entityId).join('|'), [pinChips]);
    const laneRef = useRef<HTMLDivElement | null>(null);
    const focusRef = useRef(0); // carousel focus, in pin-index units (fractional)

    useEffect(() => {
        if (variant !== 'terrain-pins') return;
        const lane = laneRef.current;
        if (!lane) return;
        const wrap = lane.parentElement;

        const pinCount = () => lane.querySelectorAll('.terrain-pin').length;
        const clampFocus = (v: number) => {
            const n = pinCount();
            return n <= 1 ? 0 : Math.max(0, Math.min(n - 1, v));
        };

        // Recentre focus if it's out of range for the current occupant set.
        const initialN = pinCount();
        if (initialN > 0 && (Number.isNaN(focusRef.current) || focusRef.current > initialN - 1)) {
            focusRef.current = (initialN - 1) / 2;
        }

        let raf = 0;
        let animRaf = 0;
        let target = focusRef.current;

        // Fisheye layout: give each pin a weight that peaks at the focus, lay the
        // weighted cells across the usable width, and place each pin at its cell
        // centre. Everything is normalised into the lane, so no pin is ever
        // scrolled off-screen — the shoulders just compress.
        const layout = () => {
            raf = 0;
            const rect = lane.getBoundingClientRect();
            const W = rect.width;
            if (W === 0) return;
            const pins = Array.from(lane.querySelectorAll<HTMLElement>('.terrain-pin'));
            const n = pins.length;
            if (n === 0) return;
            const focus = Math.max(0, Math.min(n - 1, focusRef.current));

            // reserve a left gutter for the player's own (separately-pinned) chip
            const playerPin = wrap?.querySelector<HTMLElement>('.terrain-pin-player');
            const marginLeft = (playerPin ? playerPin.getBoundingClientRect().width : 40) + 20;
            const marginRight = 14;
            const usable = Math.max(1, W - marginLeft - marginRight);

            // Each pin's visual width grows from a bare sprite to a full title
            // chip across a focus window (a flat plateau of labelled chips at the
            // centre, fading to sprites on the shoulders). A constant gap sits
            // between every pin so chips never touch; when the row gets crowded the
            // gap shrinks toward a floor (and only then do the chips themselves
            // compress) rather than closing up.
            // CHIP_W must match the max-width the CSS caps a labelled chip to
            // (box-sizing: border-box), so a chip can never be wider than the cell
            // we reserve for it and neighbouring chips can't overlap.
            const CHIP_W = 84;    // full labelled-chip width (matches CSS cap)
            const SPRITE_W = 16;  // bare sprite width
            const GAP = 9;        // desired gap between pins
            const GAP_MIN = 5;    // never let the gap go below this
            const PLATEAU = 3;    // pins within this of focus get a full chip
            const FADE = 2.2;     // chips fade to sprites over this many more pins

            const focusWindow = (d: number) => {
                if (d <= PLATEAU) return 1;
                const t = Math.max(0, 1 - (d - PLATEAU) / FADE);
                return t * t * (3 - 2 * t); // smoothstep tail
            };
            const gs = pins.map((_, i) => focusWindow(Math.abs(i - focus)));
            // Labelled pins occupy a full (capped) chip cell so they line up with
            // the CSS max-width; un-labelled pins interpolate down to a sprite.
            const labeled = gs.map(g => g >= 0.9);
            const content = gs.map((g, i) => labeled[i] ? CHIP_W : SPRITE_W + (CHIP_W - SPRITE_W) * g);
            const contentSum = content.reduce((a, b) => a + b, 0);
            const gaps = Math.max(1, n - 1);

            let gap = GAP;
            let scale = 1;
            if (contentSum + gaps * GAP > usable) {
                gap = Math.max(GAP_MIN, (usable - contentSum) / gaps);
                if (contentSum + gaps * gap > usable) {
                    gap = GAP_MIN;
                    scale = Math.max(0.4, (usable - gaps * GAP_MIN) / contentSum);
                }
            }

            const laidWidth = contentSum * scale + gaps * gap;
            const startX = marginLeft + Math.max(0, (usable - laidWidth) / 2);

            let cum = 0;
            pins.forEach((pin, i) => {
                const w = content[i] * scale;
                const cx = startX + cum + w / 2;
                cum += w + gap;
                pin.style.left = `${cx.toFixed(1)}px`;
                pin.style.setProperty('--pin-focus', gs[i].toFixed(3));
                // Reveal the name once a pin is (near) full chip width.
                pin.classList.toggle('is-foreground', labeled[i]);
            });
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(layout); };
        const stopAnim = () => { if (animRaf) { cancelAnimationFrame(animRaf); animRaf = 0; } };

        // Ease focus toward a target index (snap/settle) — this is what gives the
        // carousel its motion, so no CSS transition fights it.
        const animateTo = (t: number) => {
            target = clampFocus(t);
            if (animRaf) return;
            const step = () => {
                const cur = focusRef.current;
                const diff = target - cur;
                if (Math.abs(diff) < 0.002) {
                    focusRef.current = target;
                    animRaf = 0;
                    layout();
                    return;
                }
                focusRef.current = cur + diff * 0.22;
                animRaf = requestAnimationFrame(step);
                layout();
            };
            animRaf = requestAnimationFrame(step);
        };

        // --- Pointer drag (touch + mouse) ---
        let dragging = false;
        let startX = 0;
        let startFocus = 0;
        let moved = false;
        let activePointer = -1;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button > 0) return;
            dragging = true;
            moved = false;
            activePointer = e.pointerId;
            startX = e.clientX;
            startFocus = focusRef.current;
            stopAnim();
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging || e.pointerId !== activePointer) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 3) {
                moved = true;
                try { lane.setPointerCapture(activePointer); } catch { /* ignore */ }
            }
            const n = pinCount();
            const perPin = lane.getBoundingClientRect().width / Math.max(1, n * 0.9);
            focusRef.current = clampFocus(startFocus - dx / perPin);
            schedule();
        };
        const endDrag = (e: PointerEvent, cancelled: boolean) => {
            if (!dragging || e.pointerId !== activePointer) return;
            dragging = false;
            try { lane.releasePointerCapture(activePointer); } catch { /* ignore */ }
            activePointer = -1;
            if (cancelled) {
                if (moved) animateTo(Math.round(focusRef.current));
                return;
            }
            if (!moved) {
                // tap: bring the nearest pin to the tap point into focus
                const pins = Array.from(lane.querySelectorAll<HTMLElement>('.terrain-pin'));
                let best = -1;
                let bestDist = Infinity;
                pins.forEach((pin, i) => {
                    const r = pin.getBoundingClientRect();
                    const d = Math.abs(r.left + r.width / 2 - e.clientX);
                    if (d < bestDist) { bestDist = d; best = i; }
                });
                if (best >= 0) animateTo(best);
            } else {
                animateTo(Math.round(focusRef.current));
            }
        };
        const onPointerUp = (e: PointerEvent) => endDrag(e, false);
        const onPointerCancel = (e: PointerEvent) => endDrag(e, true);

        // --- Wheel (desktop): rotate the carousel; settle to a pin when it stops ---
        let wheelSettle = 0;
        const onWheel = (e: WheelEvent) => {
            const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if (delta === 0) return;
            e.preventDefault();
            e.stopPropagation();
            stopAnim();
            focusRef.current = clampFocus(focusRef.current + delta * 0.01);
            schedule();
            if (wheelSettle) clearTimeout(wheelSettle);
            wheelSettle = window.setTimeout(() => animateTo(Math.round(focusRef.current)), 150);
        };

        layout();
        lane.addEventListener('pointerdown', onPointerDown);
        lane.addEventListener('pointermove', onPointerMove);
        lane.addEventListener('pointerup', onPointerUp);
        lane.addEventListener('pointercancel', onPointerCancel);
        lane.addEventListener('wheel', onWheel, { passive: false });
        const ro = new ResizeObserver(schedule);
        ro.observe(lane);

        return () => {
            lane.removeEventListener('pointerdown', onPointerDown);
            lane.removeEventListener('pointermove', onPointerMove);
            lane.removeEventListener('pointerup', onPointerUp);
            lane.removeEventListener('pointercancel', onPointerCancel);
            lane.removeEventListener('wheel', onWheel);
            ro.disconnect();
            if (raf) cancelAnimationFrame(raf);
            if (animRaf) cancelAnimationFrame(animRaf);
            if (wheelSettle) clearTimeout(wheelSettle);
        };
    }, [variant, pinChipsKey]);

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
            <div className="room-chip-terrain-pins-wrap" style={colorVars} aria-label="Room entities and objects">
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
                <div
                    ref={laneRef}
                    className="room-chip-terrain-pins"
                >
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
