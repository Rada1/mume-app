/**
 * @file CustomPromptBar.tsx
 * @description Stationary MUME prompt bar anchored below the message log.
 * Displays live vitals, mode indicators, environment labels with icons, time, and interactive room entity chips.
 */

// --- Logic Section ---
import React, { FC, memo } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals, useActiveCombat } from '../../stores/useActiveGameState';
import { PromptModeIndicators } from '../Messages/PromptModeIndicators';
import { useMumeTime } from '../../hooks/useMumeTime';
import {
    HEALTH_MAP, MANA_MAP, MOVE_MAP,
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
    const { lighting, currentTerrain, weather, isFoggy, gameTime, roomNpcs, roomItems, handleLogClick } = useGame();
    const currentTime = useMumeTime(gameTime);

    const clickHandler = onLogClick || (handleLogClick as unknown as (e: React.MouseEvent) => void);

    // Vitals calculations
    const hpPercent = vitals.maxHp > 0
        ? Math.round((vitals.hp / vitals.maxHp) * 100)
        : (vitals.gmcpVitals?.maxHp > 0
            ? Math.round((vitals.gmcpVitals.hp / vitals.gmcpVitals.maxHp) * 100)
            : (vitals.hpStatus ? HEALTH_MAP[vitals.hpStatus.trim().toLowerCase()] ?? null : null));

    const manaPercent = vitals.maxMana > 0
        ? Math.round((vitals.mana / vitals.maxMana) * 100)
        : (vitals.gmcpVitals?.maxMana > 0
            ? Math.round((vitals.gmcpVitals.mana / vitals.gmcpVitals.maxMana) * 100)
            : (vitals.manaStatus ? MANA_MAP[vitals.manaStatus.trim().toLowerCase()] ?? null : null));

    const movePercent = vitals.maxMove > 0
        ? Math.round((vitals.move / vitals.maxMove) * 100)
        : (vitals.gmcpVitals?.maxMove > 0
            ? Math.round((vitals.gmcpVitals.move / vitals.gmcpVitals.maxMove) * 100)
            : (vitals.moveStatus ? MOVE_MAP[vitals.moveStatus.trim().toLowerCase()] ?? null : null));

    const hpDisplay = hpPercent !== null ? `${hpPercent}%` : (vitals.hpStatus || '100%');
    const manaDisplay = manaPercent !== null ? `${manaPercent}%` : (vitals.manaStatus || '100%');
    const moveDisplay = movePercent !== null ? `${movePercent}%` : (vitals.moveStatus || '100%');

    // Combat opponent
    const isFighting = vitals.position === 'fighting' || vitals.inCombat;
    const opponentName = isFighting ? combat.opponentName : null;
    const opponentHealthStatus = isFighting ? combat.opponentHealthStatus : null;
    const opponentHealthPercent = isFighting && opponentHealthStatus
        ? HEALTH_MAP[opponentHealthStatus.trim().toLowerCase()]
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
                    <span className="prompt-stat-value">{hpDisplay}</span>
                </span>
                <span className="prompt-stat-divider">|</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">MANA</span>
                    <span className="prompt-stat-value">{manaDisplay}</span>
                </span>
                <span className="prompt-stat-divider">|</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">MP</span>
                    <span className="prompt-stat-value">{moveDisplay}</span>
                </span>
                <span className="custom-prompt-prefix">]</span>

                {opponentName && (
                    <>
                        <span className="prompt-vs-label">Vs</span>
                        <span className="prompt-opponent-info">
                            <span className="prompt-opponent-name">{opponentName}</span>
                            <span className="prompt-opponent-status">
                                {opponentHealthPercent !== undefined && opponentHealthPercent !== null
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
