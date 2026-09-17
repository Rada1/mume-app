/**
 * @file CustomPromptBar.tsx
 * @description Stationary MUME prompt bar anchored below the message log.
 * Displays live vitals, mode indicators, environment labels with icons, time, and interactive room entity chips.
 */

// --- Logic Section ---
import React, { FC, memo, useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals, useActiveCombat } from '../../stores/useActiveGameState';
import { PromptModeIndicators } from '../Messages/PromptModeIndicators';
import { useMumeTime } from '../../hooks/useMumeTime';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { calculateRegen, formatRegen } from '../../utils/regenUtils';
import { AnimatedPromptVital } from './AnimatedPromptVital';
import {
    HEALTH_MAP, HEALTH_COMBAT_RANGES, MANA_MAP, MANA_COMBAT_RANGES, MOVE_MAP,
    getLightingLabel, getLightingIcon,
    getTerrainLabel, getTerrainIcon,
    getWeatherLabel, getWeatherIcon,
    formatMumeTime, getTimeIcon,
    getEntityButtonsForPrompt,
    PromptEnvItem
} from './customPromptHelpers';
import './CustomPromptBar.css';

interface CustomPromptBarProps {
    onLogClick?: (e: React.MouseEvent) => void;
    className?: string;
}

// --- Render Section ---
export const CustomPromptBar: FC<CustomPromptBarProps> = ({ onLogClick, className }) => {
    const vitals = useActiveVitals();
    const combat = useActiveCombat();
    const { lighting, currentTerrain, weather, isFoggy, gameTime, roomNpcs, roomItems, handleLogClick, displayEqLines, characterInfo } = useGame();
    const currentTime = useMumeTime(gameTime);
    const activeTimers = useEffectTimerStore(state => state.timers);
    const [regenNow, setRegenNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setRegenNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    // Live regen combines known worn equipment, character modifiers, and timed herb phases.
    const regen = calculateRegen({
        equipped: displayEqLines.filter(line => line.isItem).map(line => line.rawText || line.text),
        race: characterInfo.race,
        position: vitals.position,
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

    const clickHandler = onLogClick || (handleLogClick as unknown as (e: React.MouseEvent) => void);
    const isFighting = vitals.position === 'fighting' || vitals.inCombat;

    // Vitals calculations
    // GMCP provides the authoritative exact values outside combat. During combat,
    // MUME only exposes the descriptive health/mana band, handled below.
    const hpPercent = vitals.gmcpVitals?.maxHp > 0
        ? Math.round((vitals.gmcpVitals.hp / vitals.gmcpVitals.maxHp) * 100)
        : (vitals.maxHp > 0
            ? Math.round((vitals.hp / vitals.maxHp) * 100)
            : (vitals.hpStatus ? HEALTH_MAP[vitals.hpStatus.trim().toLowerCase()] ?? null : null));

    const manaPercent = vitals.gmcpVitals?.maxMana > 0
        ? Math.round((vitals.gmcpVitals.mana / vitals.gmcpVitals.maxMana) * 100)
        : (vitals.maxMana > 0
            ? Math.round((vitals.mana / vitals.maxMana) * 100)
            : (vitals.manaStatus ? MANA_MAP[vitals.manaStatus.trim().toLowerCase()] ?? null : null));

    const movePercent = vitals.maxMove > 0
        ? Math.round((vitals.move / vitals.maxMove) * 100)
        : (vitals.gmcpVitals?.maxMove > 0
            ? Math.round((vitals.gmcpVitals.move / vitals.gmcpVitals.maxMove) * 100)
            : (vitals.moveStatus ? MOVE_MAP[vitals.moveStatus.trim().toLowerCase()] ?? null : null));

    const hpCombatRange = vitals.hpStatus ? HEALTH_COMBAT_RANGES[vitals.hpStatus.trim().toLowerCase()] : null;
    const manaCombatRange = vitals.manaStatus ? MANA_COMBAT_RANGES[vitals.manaStatus.trim().toLowerCase()] : null;
    const hpDisplay = isFighting && hpCombatRange ? hpCombatRange : (hpPercent !== null ? `${hpPercent}%` : (vitals.hpStatus || '100%'));
    const manaDisplay = isFighting && manaCombatRange ? manaCombatRange : (manaPercent !== null ? `${manaPercent}%` : (vitals.manaStatus || '100%'));
    const moveDisplay = movePercent !== null ? `${movePercent}%` : (vitals.moveStatus || '100%');
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
    const opponentHealthStatus = isFighting ? combat.opponentHealthStatus : null;
    const opponentHealthPercent = isFighting && opponentHealthStatus
        ? HEALTH_MAP[opponentHealthStatus.trim().toLowerCase()]
        : null;
    const opponentHealthDisplay = opponentHealthStatus
        ? HEALTH_COMBAT_RANGES[opponentHealthStatus.trim().toLowerCase()]
        : null;

    // Environment & Entities
    const lightingLabel = getLightingLabel(lighting);
    const terrainLabel = getTerrainLabel(currentTerrain);
    const weatherLabel = getWeatherLabel(weather);
    const timeLabel = formatMumeTime(currentTime);

    const envItems: PromptEnvItem[] = [];
    if (terrainLabel) {
        envItems.push({
            id: 'terrain',
            label: terrainLabel,
            icon: getTerrainIcon(currentTerrain),
        });
    }
    if (lightingLabel) {
        envItems.push({
            id: 'lighting',
            label: lightingLabel,
            icon: getLightingIcon(lighting),
        });
    }
    if (weatherLabel) {
        envItems.push({
            id: 'weather',
            label: weatherLabel,
            icon: getWeatherIcon(weather, isFoggy),
        });
    } else if (isFoggy) {
        envItems.push({
            id: 'weather',
            label: 'Fog',
            icon: getWeatherIcon('fog', true),
        });
    }
    if (timeLabel) {
        envItems.push({
            id: 'time',
            label: timeLabel,
            icon: getTimeIcon(),
        });
    }

    const promptEntities = getEntityButtonsForPrompt(roomNpcs, roomItems);

    return (
        <div
            className={`custom-prompt-bar ${className || ''}`.trim()}
            onClick={clickHandler}
        >
            <div className="prompt-row prompt-vitals-row">
                <span className="custom-prompt-prefix">[</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">HP</span>
                    <AnimatedPromptVital value={hpDisplay} animation={vitalAnimations.hp} />
                    <span key={regenAnimations.hp?.key || 0} className={`prompt-regen-value${regenAnimations.hp ? ` regen-stat-change-${regenAnimations.hp.direction}` : ''}`} title="Known regeneration modifiers from race, age, attributes, equipped items, and active herblores.">({formatRegen(regen.hp)})</span>
                </span>
                <span className="prompt-stat-divider">|</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">MANA</span>
                    <AnimatedPromptVital value={manaDisplay} animation={vitalAnimations.mana} />
                    <span key={regenAnimations.mana?.key || 0} className={`prompt-regen-value${regenAnimations.mana ? ` regen-stat-change-${regenAnimations.mana.direction}` : ''}`} title="Known regeneration modifiers from race, age, attributes, equipped items, and active herblores.">({formatRegen(regen.mana)})</span>
                </span>
                <span className="prompt-stat-divider">|</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">MP</span>
                    <AnimatedPromptVital value={moveDisplay} animation={vitalAnimations.move} />
                    <span key={regenAnimations.move?.key || 0} className={`prompt-regen-value${regenAnimations.move ? ` regen-stat-change-${regenAnimations.move.direction}` : ''}`} title="Known regeneration modifiers from race, age, attributes, equipped items, and active herblores.">({formatRegen(regen.move)})</span>
                </span>
                <span className="custom-prompt-prefix">]</span>

                {opponentName && (
                    <>
                        <span className="prompt-vs-label">Vs</span>
                        <span className="prompt-opponent-info">
                            <span className="prompt-opponent-name">{opponentName}</span>
                            <span className="prompt-opponent-status">
                                {opponentHealthDisplay
                                    ? ` (${opponentHealthDisplay})`
                                    : opponentHealthPercent !== undefined && opponentHealthPercent !== null
                                    ? ` (${opponentHealthPercent}%)`
                                    : ` (${opponentHealthStatus || 'Fighting'})`}
                            </span>
                        </span>
                    </>
                )}
            </div>

            <div className="prompt-row prompt-controls-row">
                <PromptModeIndicators />
            </div>

            {(envItems.length > 0 || promptEntities.length > 0) && (
                <div className="prompt-row prompt-metadata-line">
                    {envItems.length > 0 && (
                        <span className="prompt-environment-line">
                            <span className="custom-prompt-prefix">[</span>
                            {envItems.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    {index > 0 && <span className="prompt-stat-divider"> | </span>}
                                    <span className="prompt-env-item">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </span>
                                </React.Fragment>
                            ))}
                            <span className="custom-prompt-prefix">]</span>
                        </span>
                    )}
                    {promptEntities.length > 0 && (
                        <span className="prompt-entities-line">
                            <span className="custom-prompt-prefix">[</span>
                            {promptEntities.map((entity, index) => (
                                <React.Fragment key={`${entity.label}-${entity.id || index}`}>
                                    <span
                                        className="inline-btn prompt-entity-inline"
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
                                    {index < promptEntities.length - 1 ? ' | ' : ''}
                                </React.Fragment>
                            ))}
                            <span className="custom-prompt-prefix">]</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(CustomPromptBar);
