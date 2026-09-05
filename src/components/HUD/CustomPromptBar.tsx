/**
 * @file CustomPromptBar.tsx
 * @description Stationary MUME prompt bar anchored below the message log.
 * Displays live vitals, mode indicators, environment labels, and interactive room entity chips.
 */

// --- Logic Section ---
import React, { FC, memo } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals, useActiveCombat } from '../../stores/useActiveGameState';
import { PromptModeIndicators } from '../Messages/PromptModeIndicators';
import { GmcpOccupant } from '../../types';
import './CustomPromptBar.css';

interface CustomPromptBarProps {
    onLogClick?: (e: React.MouseEvent) => void;
    className?: string;
}

const HEALTH_MAP: Record<string, number> = {
    healthy: 100, fine: 83, hurt: 66, wounded: 50,
    bad: 33, awful: 16, dying: 0, stunned: 25, none: 0
};

const MANA_MAP: Record<string, number> = {
    full: 100, burning: 83, hot: 66, warm: 50,
    cold: 33, icy: 16, frozen: 0
};

const MOVE_MAP: Record<string, number> = {
    unwearied: 100, steadfast: 85, rested: 71, tired: 57,
    slow: 42, weak: 28, fainting: 14, exhausted: 0
};

const getLightingLabel = (lighting?: string): string => {
    switch (lighting) {
        case 'sun': return 'Sunlight';
        case 'artificial': return 'Artificial light';
        case 'moon': return 'Moonlight';
        case 'dark': return 'Darkness';
        default: return '';
    }
};

const getTerrainLabel = (terrain?: string | null): string => {
    const value = terrain?.trim() || '';
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

const getWeatherLabel = (weather?: string | null): string => {
    const value = weather?.trim() || '';
    if (!value || value.toLowerCase() === 'none') return '';
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

const getRoomEntityLabel = (entity: string | GmcpOccupant): string => {
    if (typeof entity === 'string') return entity.trim();
    return entity.keyword?.trim() || entity.name?.trim() || entity.shortdesc?.trim() || entity.short?.trim() || '';
};

interface PromptEntityButton {
    label: string;
    id?: string;
    category: 'cat-npc' | 'cat-object';
}

const getEntityButtonsForPrompt = (
    roomNpcs: Array<string | GmcpOccupant> = [],
    roomItems: Array<string | GmcpOccupant> = [],
): PromptEntityButton[] => {
    const npcs: PromptEntityButton[] = (roomNpcs || [])
        .map(entity => ({
            label: getRoomEntityLabel(entity),
            id: typeof entity === 'string' || entity.id === undefined ? undefined : String(entity.id),
            category: 'cat-npc' as const,
        }))
        .filter(entity => Boolean(entity.label));

    const items: PromptEntityButton[] = (roomItems || [])
        .map(entity => ({
            label: getRoomEntityLabel(entity),
            id: typeof entity === 'string' || entity.id === undefined ? undefined : String(entity.id),
            category: 'cat-object' as const,
        }))
        .filter(entity => Boolean(entity.label));

    return [...npcs, ...items];
};

// --- Render Section ---
export const CustomPromptBar: FC<CustomPromptBarProps> = ({ onLogClick, className }) => {
    const vitals = useActiveVitals();
    const combat = useActiveCombat();
    const { lighting, currentTerrain, weather, roomNpcs, roomItems, handleLogClick } = useGame();

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
    const isFighting = vitals.position === 'fighting' || vitals.inCombat || Boolean(combat.opponentName);
    const opponentName = isFighting ? combat.opponentName : null;
    const opponentHealthStatus = isFighting ? combat.opponentHealthStatus : null;
    const opponentHealthPercent = isFighting && opponentHealthStatus
        ? HEALTH_MAP[opponentHealthStatus.trim().toLowerCase()]
        : null;

    // Environment & Entities
    const lightingLabel = getLightingLabel(lighting);
    const terrainLabel = getTerrainLabel(currentTerrain);
    const weatherLabel = getWeatherLabel(weather);
    const envLabels = [terrainLabel, lightingLabel, weatherLabel].filter(Boolean);

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
                    <span>{hpDisplay}</span>
                </span>
                <span className="prompt-stat-divider">|</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">MANA</span>
                    <span>{manaDisplay}</span>
                </span>
                <span className="prompt-stat-divider">|</span>
                <span className="prompt-stat-item">
                    <span className="prompt-stat-label">MP</span>
                    <span>{moveDisplay}</span>
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

            {(envLabels.length > 0 || promptEntities.length > 0) && (
                <div className="prompt-row prompt-metadata-line">
                    {envLabels.length > 0 && (
                        <span className="prompt-environment-line">
                            [{envLabels.join(' | ')}]
                        </span>
                    )}
                    {promptEntities.length > 0 && (
                        <span className="prompt-entities-line">
                            [
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
                            ]
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(CustomPromptBar);
