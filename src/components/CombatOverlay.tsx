import React, { useMemo } from 'react';
import { useGame, useVitals } from '../context/GameContext';
import { CombatHealthStatus } from '../types';
import './CombatOverlay.css';

/**
 * @file CombatOverlay.tsx
 * @description A high-end visual overlay for combat, displaying combatant names and health status quads.
 */

// --- Logic Section ---

const getQuadCount = (status: CombatHealthStatus | null): number => {
    switch (status) {
        case 'Fine': return 6;
        case 'Hurt': return 5;
        case 'Wounded': return 4;
        case 'Badly Wounded': return 3;
        case 'Awful': return 2;
        case 'Stunned': return 1;
        case 'Dying': return 1;
        default: return 0;
    }
};

const getStatusClass = (status: CombatHealthStatus | null): string => {
    if (!status) return '';
    return status.toLowerCase().replace(' ', '-');
};

const HealthQuads: React.FC<{ status: CombatHealthStatus | null }> = ({ status }) => {
    const count = getQuadCount(status);
    const statusClass = getStatusClass(status);
    
    return (
        <div className="health-quads">
            {[...Array(6)].map((_, i) => (
                <div 
                    key={i} 
                    className={`health-quad ${i < count ? statusClass : ''}`}
                />
            ))}
        </div>
    );
};

// --- Component Section ---

const CombatOverlay: React.FC = () => {
    const { inCombat, characterName } = useGame();
    const { 
        playerHealthStatus, 
        opponentName, 
        opponentHealthStatus, 
        bufferName, 
        bufferHealthStatus 
    } = useVitals();

    // Only show if we are in combat AND have at least one combatant identified
    const isVisible = inCombat && (playerHealthStatus || opponentName || bufferName);

    if (!isVisible) return null;

    return (
        <div className={`combat-overlay ${isVisible ? 'active' : ''}`}>
            <div className="combat-header">
                <span>{characterName || 'You'}</span>
                {bufferName && <span className="buffer-label">(Buff: {bufferName})</span>}
                <span className="combat-vs">vs.</span>
                <span>{opponentName || '???'}</span>
            </div>

            <div className="combat-body">
                {/* Player & Buffer Side */}
                <div className="combat-side player">
                    <HealthQuads status={playerHealthStatus} />
                    {bufferName && bufferHealthStatus && (
                        <div className="buffer-indicator">
                            <span className="buffer-name">{bufferName}</span>
                            <HealthQuads status={bufferHealthStatus} />
                        </div>
                    )}
                </div>

                {/* Opponent Side */}
                <div className="combat-side opponent">
                    <HealthQuads status={opponentHealthStatus} />
                </div>
            </div>
        </div>
    );
};

export default CombatOverlay;
