import React, { useMemo } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { CombatHealthStatus } from '../../types';
import './CombatOverlay.css';

/**
 * @file CombatOverlay.tsx
 * @description A high-end visual overlay for combat, displaying combatant names and health status quads.
 */

// --- Logic Section ---

const getQuadCount = (status: CombatHealthStatus | null): number => {
    switch (status) {
        case 'Healthy': return 5;
        case 'Fine': return 5;
        case 'Hurt': return 4;
        case 'Wounded': return 3;
        case 'Bad': return 2;
        case 'Awful': return 1;
        case 'Stunned': return 0;
        case 'Dying': return 0;
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
            {[...Array(5)].map((_, i) => (
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
            <div className="combat-body">
                {/* Left Side: Player & Allies (Tanks/Buffers) */}
                <div className="combat-side left-allies">
                    <div className="combatant-block">
                        <span className="combatant-name">{characterName || 'You'}</span>
                        <HealthQuads status={playerHealthStatus || 'Healthy'} />
                    </div>
                    
                    {bufferName && bufferHealthStatus && (
                        <div className="combatant-block ally">
                            <span className="combatant-name">
                                {bufferName} <span className="role-tag">Tank</span>
                            </span>
                            <HealthQuads status={bufferHealthStatus} />
                        </div>
                    )}
                </div>

                <div className="combat-vs-divider">
                    <div className="vs-line" />
                    <span className="vs-text">VS</span>
                    <div className="vs-line" />
                </div>

                {/* Right Side: Opponents */}
                <div className="combat-side right-enemies">
                    {opponentHealthStatus ? (
                        <div className="combatant-block enemy">
                            <span className="combatant-name">{opponentName || '???'}</span>
                            <HealthQuads status={opponentHealthStatus} />
                        </div>
                    ) : (
                        <div className="combatant-block enemy hidden">
                            <span className="combatant-name">Scanning...</span>
                            <div className="health-quads empty">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="health-quad empty" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CombatOverlay;
