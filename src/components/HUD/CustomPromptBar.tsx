/**
 * @file CustomPromptBar.tsx
 * @description Stationary MUME prompt bar matching the character card panel aesthetic.
 * Displays live vitals, stance/movement controls, surroundings, and interactive room entity chips.
 */

// --- Logic Section ---
import React, { FC, memo, useEffect, useRef, useState } from 'react';
import { Clock3, HeartPulse, Package } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import { useActiveVitals, useActiveCombat } from '../../stores/useActiveGameState';
import { useActiveRoom } from '../../stores/useActiveGameState';
import { PromptModeIndicators } from '../Messages/PromptModeIndicators';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { useMumeTime } from '../../hooks/useMumeTime';
import { calculateRegen, formatRegen } from '../../utils/regenUtils';
import { AnimatedPromptVital } from './AnimatedPromptVital';
import {
    HEALTH_MAP, HEALTH_COMBAT_RANGES, MANA_MAP, MANA_COMBAT_RANGES, MOVE_MAP,
    getEntityButtonsForPrompt, getLightingIcon, getLightingLabel, getTerrainIcon,
    getWeatherIcon, getWeatherLabel, formatMumeTime
} from './customPromptHelpers';
import './CustomPromptBar.css';

interface CustomPromptBarProps {
    onLogClick?: (e: React.MouseEvent) => void;
    className?: string;
}

const normaliseCombatName = (value: string): string[] => value
    .toLowerCase()
    .replace(/^[*-]+|[*-]+$/g, '')
    .replace(/^(?:a|an|the)\s+/i, '')
    .split(/[^a-z0-9]+/)
    .filter(part => part.length > 2);

const isOpponentRoomEntity = (label: string, opponentName: string | null): boolean => {
    if (!opponentName) return false;
    const entityParts = normaliseCombatName(label);
    const opponentParts = normaliseCombatName(opponentName);
    if (!entityParts.length || !opponentParts.length) return false;
    const entity = entityParts.join(' ');
    const opponent = opponentParts.join(' ');
    return opponent.includes(entity) || entity.includes(opponent) ||
        (entityParts.length === 1 && opponentParts.includes(entityParts[0]));
};

// The log replaces its latest prompt often. Keep completed handoffs outside a
// single prompt instance so a fighting opponent cannot re-enter the room row
// whenever that prompt is reconstructed.
const handedOffCombatants = new Set<string>();
const combatantKey = (name: string | null): string => name?.trim().toLowerCase() || '';
const roomEntityGroupExpansion = { alive: false, objects: false };

// --- Render Section ---
export const CustomPromptBar: FC<CustomPromptBarProps> = ({ onLogClick, className }) => {
    const vitals = useActiveVitals();
    const combat = useActiveCombat();
    const activeRoom = useActiveRoom();
    const { displayEqLines } = useUI();
    const {
        roomNpcs, roomItems, roomPlayers, handleLogClick,
        characterInfo, alertness, lighting, currentTerrain, weather, isFoggy, gameTime
    } = useGame();
    const currentTime = useMumeTime(gameTime);
    const activeTimers = useEffectTimerStore(state => state.timers);
    const priorCombatRef = useRef(false);
    const priorOpponentRef = useRef<string | null>(null);
    const [isOpponentHandoff, setIsOpponentHandoff] = useState(false);
    const [hideOpponentFromRoom, setHideOpponentFromRoom] = useState(() => {
        const key = combatantKey(combat.opponentName);
        return Boolean(vitals.inCombat && key && handedOffCombatants.has(key));
    });
    const [expandedEntityGroups, setExpandedEntityGroups] = useState(() => ({ ...roomEntityGroupExpansion }));
    const [showVitalDetails, setShowVitalDetails] = useState(false);
    const [regenNow, setRegenNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setRegenNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const regen = calculateRegen({
        equipped: displayEqLines.filter(line => line.isItem).map(line => line.rawText || line.text),
        race: characterInfo.race,
        position: vitals.position,
        alertness,
        conditions: vitals.conditions,
        age: characterInfo.age,
        attributes: characterInfo.stats,
        timers: activeTimers,
        now: regenNow,
    });
    const previousRegenRef = useRef<Record<string, number> | null>(null);
    const [regenAnimations, setRegenAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});

    useEffect(() => {
        const previous = previousRegenRef.current;
        if (previous) {
            const changed = (['hp', 'mana', 'move'] as const).filter(id => regen[id] !== previous[id]);
            if (changed.length > 0) {
                setRegenAnimations(current => {
                    const next = { ...current };
                    for (const id of changed) {
                        next[id] = {
                            direction: regen[id] > previous[id] ? 'up' : 'down',
                            key: (current[id]?.key || 0) + 1,
                        };
                    }
                    return next;
                });
            }
        }
        previousRegenRef.current = regen;
    }, [regen.hp, regen.mana, regen.move]);

    // The log owns click delegation when this component renders as its live
    // prompt, so do not handle the same interaction twice through bubbling.
    const clickHandler = className?.includes('log-prompt-bar')
        ? undefined
        : onLogClick || (handleLogClick as unknown as (e: React.MouseEvent) => void);
    const isFighting = vitals.position === 'fighting' || vitals.inCombat;

    const hpCurrent = vitals.gmcpVitals?.maxHp > 0 ? vitals.gmcpVitals.hp : vitals.hp;
    const hpMaximum = vitals.gmcpVitals?.maxHp > 0 ? vitals.gmcpVitals.maxHp : vitals.maxHp;
    const hpPercent = hpMaximum > 0
        ? Math.round((hpCurrent / hpMaximum) * 100)
        : (vitals.maxHp > 0
            ? Math.round((vitals.hp / vitals.maxHp) * 100)
            : (vitals.hpStatus ? HEALTH_MAP[vitals.hpStatus.trim().toLowerCase()] ?? null : null));

    const manaCurrent = vitals.gmcpVitals?.maxMana > 0 ? vitals.gmcpVitals.mana : vitals.mana;
    const manaMaximum = vitals.gmcpVitals?.maxMana > 0 ? vitals.gmcpVitals.maxMana : vitals.maxMana;
    const manaPercent = manaMaximum > 0
        ? Math.round((manaCurrent / manaMaximum) * 100)
        : (vitals.maxMana > 0
            ? Math.round((vitals.mana / vitals.maxMana) * 100)
            : (vitals.manaStatus ? MANA_MAP[vitals.manaStatus.trim().toLowerCase()] ?? null : null));

    const moveCurrent = vitals.gmcpVitals?.maxMove > 0 ? vitals.gmcpVitals.move : vitals.move;
    const moveMaximum = vitals.gmcpVitals?.maxMove > 0 ? vitals.gmcpVitals.maxMove : vitals.maxMove;
    const movePercent = moveMaximum > 0
        ? Math.round((moveCurrent / moveMaximum) * 100)
        : (vitals.maxMove > 0
            ? Math.round((vitals.move / vitals.maxMove) * 100)
            : (vitals.moveStatus ? MOVE_MAP[vitals.moveStatus.trim().toLowerCase()] ?? null : null));

    const hpCombatRange = vitals.hpStatus ? HEALTH_COMBAT_RANGES[vitals.hpStatus.trim().toLowerCase()] : null;
    const manaCombatRange = vitals.manaStatus ? MANA_COMBAT_RANGES[vitals.manaStatus.trim().toLowerCase()] : null;

    const hpStatus = vitals.hpStatus
        ? `${vitals.hpStatus.charAt(0).toUpperCase()}${vitals.hpStatus.slice(1).toLowerCase()}`
        : (hpPercent !== null
            ? (hpPercent >= 100 ? 'Healthy' : hpPercent >= 71 ? 'Fine' : hpPercent >= 51 ? 'Hurt' : hpPercent >= 31 ? 'Wounded' : hpPercent >= 16 ? 'Bad' : hpPercent >= 6 ? 'Awful' : 'Dying')
            : null);
    const manaStatus = vitals.manaStatus
        ? `${vitals.manaStatus.charAt(0).toUpperCase()}${vitals.manaStatus.slice(1).toLowerCase()}`
        : (manaPercent !== null
            ? (manaPercent >= 100 ? 'Full' : manaPercent >= 71 ? 'Burning' : manaPercent >= 51 ? 'Hot' : manaPercent >= 31 ? 'Warm' : manaPercent >= 16 ? 'Cold' : manaPercent >= 6 ? 'Icy' : 'Frozen')
            : null);
    const moveStatus = vitals.moveStatus
        ? `${vitals.moveStatus.charAt(0).toUpperCase()}${vitals.moveStatus.slice(1).toLowerCase()}`
        : (movePercent !== null
            ? (movePercent >= 100 ? 'Unwearied' : movePercent >= 86 ? 'Steadfast' : movePercent >= 72 ? 'Rested' : movePercent >= 58 ? 'Tired' : movePercent >= 43 ? 'Slow' : movePercent >= 29 ? 'Weak' : movePercent >= 15 ? 'Fainting' : 'Exhausted')
            : null);

    const vitalDisplay = (status: string | null, current: number, maximum: number, fallback: string) => (
        <>
            <span className="prompt-vital-status">{status || fallback}</span>
            {showVitalDetails && !isFighting && maximum > 0 && <span className="prompt-vital-raw">{current}/{maximum}</span>}
        </>
    );
    const hpDisplay = vitalDisplay(hpStatus, hpCurrent, hpMaximum, isFighting && hpCombatRange ? hpCombatRange : 'Healthy');
    const manaDisplay = vitalDisplay(manaStatus, manaCurrent, manaMaximum, isFighting && manaCombatRange ? manaCombatRange : 'Full');
    const moveDisplay = vitalDisplay(moveStatus, moveCurrent, moveMaximum, 'Unwearied');

    const previousVitalValuesRef = useRef<Record<string, number | null> | null>(null);
    const [vitalAnimations, setVitalAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});
    const vitalValues = { hp: hpPercent, mana: manaPercent, move: movePercent };

    useEffect(() => {
        const previousValues = previousVitalValuesRef.current;
        if (previousValues) {
            const changes = Object.entries(vitalValues).filter(([id, value]) =>
                value !== null && previousValues[id] !== null && value !== previousValues[id]
            );
            if (changes.length > 0) {
                setVitalAnimations(current => {
                    const next = { ...current };
                    for (const [id, value] of changes) {
                        next[id] = {
                            direction: value! > previousValues[id]! ? 'up' : 'down',
                            key: (current[id]?.key || 0) + 1
                        };
                    }
                    return next;
                });
            }
        }
        previousVitalValuesRef.current = vitalValues;
    }, [hpPercent, manaPercent, movePercent]);

    // Combat opponent
    const opponentName = isFighting ? combat.opponentName : null;
    React.useLayoutEffect(() => {
        const wasFighting = priorCombatRef.current;
        const priorOpponent = priorOpponentRef.current;
        priorCombatRef.current = isFighting;
        priorOpponentRef.current = opponentName;

        if (!isFighting) {
            handedOffCombatants.clear();
            setIsOpponentHandoff(false);
            setHideOpponentFromRoom(false);
            return;
        }
        if (!opponentName || (wasFighting && priorOpponent === opponentName)) return;

        const key = combatantKey(opponentName);
        if (handedOffCombatants.has(key)) {
            setHideOpponentFromRoom(true);
            return;
        }

        // Record this immediately. The current instance can still play the
        // fade, while any newly rendered prompt already knows to keep it gone.
        handedOffCombatants.add(key);
        setHideOpponentFromRoom(false);
        setIsOpponentHandoff(true);
        const cleanup = window.setTimeout(() => {
            setIsOpponentHandoff(false);
            setHideOpponentFromRoom(true);
        }, 650);

        return () => {
            window.clearTimeout(cleanup);
        };
    }, [isFighting, opponentName]);

    const promptEntities = getEntityButtonsForPrompt(roomNpcs, roomItems, roomPlayers);
    const visiblePromptEntities = promptEntities.filter(entity =>
        !hideOpponentFromRoom || !isOpponentRoomEntity(entity.label, opponentName)
    );
    const aliveEntities = visiblePromptEntities.filter(entity => entity.category !== 'cat-object');
    const objectEntities = visiblePromptEntities.filter(entity => entity.category === 'cat-object');
    const terrain = currentTerrain || activeRoom.terrain;
    const environmentItems = [
        { id: 'terrain', label: terrain || '', icon: getTerrainIcon(terrain) },
        { id: 'weather', label: isFoggy ? 'Fog' : getWeatherLabel(weather), icon: getWeatherIcon(weather, isFoggy) },
        { id: 'lighting', label: getLightingLabel(lighting), icon: getLightingIcon(lighting) },
    ].filter(item => item.label && item.icon);
    const timeLabel = formatMumeTime(currentTime);

    return (
        <div className={`custom-prompt-bar ${className || ''}`.trim()} onClick={clickHandler}>
            {/* Line 1: Vitals & Combat Target */}
            <div
                className={`prompt-row prompt-vitals-row${showVitalDetails ? ' is-expanded' : ''}`}
                onClick={(event) => {
                    if ((event.target as HTMLElement).closest('.inline-btn')) return;
                    event.stopPropagation();
                    setShowVitalDetails(current => !current);
                }}
                role="button"
                tabIndex={0}
                aria-expanded={showVitalDetails}
                title={showVitalDetails ? 'Hide exact vitals and regeneration' : 'Show exact vitals and regeneration'}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setShowVitalDetails(current => !current);
                    }
                }}
            >
                <span className="prompt-line-header">Vitals</span>
                <span className="prompt-header-divider">│</span>
                <span className="prompt-stat-item vital-hp">
                    <span className="prompt-stat-label">HP</span>
                    <AnimatedPromptVital value={hpDisplay} animation={vitalAnimations.hp} />
                    {showVitalDetails && <span key={regenAnimations.hp?.key || 0} className={`prompt-regen-value${regenAnimations.hp ? ` regen-stat-change-${regenAnimations.hp.direction}` : ''}`} title="Regeneration per tick">({formatRegen(regen.hp)})</span>}
                </span>
                <span className="prompt-stat-divider">·</span>
                <span className="prompt-stat-item vital-mana">
                    <span className="prompt-stat-label">MANA</span>
                    <AnimatedPromptVital value={manaDisplay} animation={vitalAnimations.mana} />
                    {showVitalDetails && <span key={regenAnimations.mana?.key || 0} className={`prompt-regen-value${regenAnimations.mana ? ` regen-stat-change-${regenAnimations.mana.direction}` : ''}`} title="Regeneration per tick">({formatRegen(regen.mana)})</span>}
                </span>
                <span className="prompt-stat-divider">·</span>
                <span className="prompt-stat-item vital-move">
                    <span className="prompt-stat-label">MV</span>
                    <AnimatedPromptVital value={moveDisplay} animation={vitalAnimations.move} />
                    {showVitalDetails && <span key={regenAnimations.move?.key || 0} className={`prompt-regen-value${regenAnimations.move ? ` regen-stat-change-${regenAnimations.move.direction}` : ''}`} title="Regeneration per tick">({formatRegen(regen.move)})</span>}
                </span>
                {isFighting && opponentName && (
                    <>
                        <span className="prompt-stat-divider">│</span>
                        <span className="prompt-combat-opponent">
                            <span
                                className="inline-btn prompt-opponent-inline"
                                data-action="menu"
                                data-category="cat-enemy"
                                data-cmd="cat-enemy"
                                data-context={opponentName}
                                data-menu-display="list"
                                data-targetable="true"
                                {...(combat.opponentId != null ? { 'data-id': `roomchars:${combat.opponentId}` } : {})}
                            >
                                {opponentName}
                            </span>
                            {combat.opponentHealthStatus && (
                                <>
                                    <span className="prompt-stat-divider">·</span>
                                    <span className="prompt-stat-item prompt-opponent-health">
                                        <span className="prompt-stat-label">HP</span>
                                        <span className="prompt-vital-status">{combat.opponentHealthStatus}</span>
                                    </span>
                                </>
                            )}
                        </span>
                    </>
                )}

            </div>

            {/* Line 2: Traverse, Stance, Combat Ratings & Affects */}
            <div className="prompt-row prompt-controls-row">
                <PromptModeIndicators />
            </div>

            {/* Line 3: Room, environment, and occupants */}
            <div className="prompt-row prompt-metadata-line">
                    {environmentItems.map(item => (
                        <span key={item.id} className="prompt-env-icon-only" title={item.label} aria-label={item.label}>
                            {item.icon}
                        </span>
                    ))}
                    {timeLabel && (
                        <span className="prompt-time" title={`MUME time: ${timeLabel}`}>
                            <Clock3 size={13} aria-hidden="true" />
                            <span>{timeLabel}</span>
                        </span>
                    )}
                    {(aliveEntities.length > 0 || objectEntities.length > 0) && (
                        <>
                            {(environmentItems.length > 0 || timeLabel) && <span className="prompt-stat-divider">│</span>}
                            {aliveEntities.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        className={`prompt-entity-summary${expandedEntityGroups.alive ? ' is-expanded' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setExpandedEntityGroups(current => {
                                                const next = { ...current, alive: !current.alive };
                                                roomEntityGroupExpansion.alive = next.alive;
                                                return next;
                                            });
                                        }}
                                        title={`${aliveEntities.length} living occupant${aliveEntities.length === 1 ? '' : 's'}`}
                                    >
                                        <HeartPulse size={12} aria-hidden="true" />
                                        <span>{aliveEntities.length}</span>
                                    </button>
                                    {expandedEntityGroups.alive && (
                                        <span className="prompt-entities-line">
                                            {aliveEntities.map((entity, index) => (
                                                <React.Fragment key={`alive-${entity.label}-${entity.id || index}`}>
                                                    {index > 0 && <span className="prompt-stat-divider">·</span>}
                                                    <span
                                                        className={`inline-btn prompt-entity-inline entity-kind-${entity.category}${isOpponentHandoff && isOpponentRoomEntity(entity.label, opponentName) ? ' prompt-opponent-departing' : ''}`}
                                                        data-action="menu"
                                                        data-category={entity.category}
                                                        data-cmd={entity.category}
                                                        data-context={entity.label}
                                                        data-menu-display="list"
                                                        data-targetable="true"
                                                        {...(entity.id ? { 'data-id': entity.id } : {})}
                                                    >
                                                        {entity.label}
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    )}
                                </>
                            )}
                            {objectEntities.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        className={`prompt-entity-summary${expandedEntityGroups.objects ? ' is-expanded' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setExpandedEntityGroups(current => {
                                                const next = { ...current, objects: !current.objects };
                                                roomEntityGroupExpansion.objects = next.objects;
                                                return next;
                                            });
                                        }}
                                        title={`${objectEntities.length} object${objectEntities.length === 1 ? '' : 's'}`}
                                    >
                                        <Package size={12} aria-hidden="true" />
                                        <span>{objectEntities.length}</span>
                                    </button>
                                    {expandedEntityGroups.objects && (
                                        <span className="prompt-entities-line">
                                            {objectEntities.map((entity, index) => (
                                                <React.Fragment key={`object-${entity.label}-${entity.id || index}`}>
                                                    {index > 0 && <span className="prompt-stat-divider">·</span>}
                                                    <span
                                                        className={`inline-btn prompt-entity-inline entity-kind-${entity.category}`}
                                                        data-action="menu"
                                                        data-category={entity.category}
                                                        data-cmd={entity.category}
                                                        data-context={entity.label}
                                                        data-menu-display="list"
                                                        data-targetable="true"
                                                        {...(entity.id ? { 'data-id': entity.id } : {})}
                                                    >
                                                        {entity.label}
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    )}
                                </>
                            )}
                        </>
                    )}
            </div>
        </div>
    );
};

export default memo(CustomPromptBar);
