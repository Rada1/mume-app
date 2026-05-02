/**
 * @file PromptCombatStatsLine.tsx
 * @description Compact combat stat strip for the player side of the prompt box.
 */

import React from 'react';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useUI } from '../../context/GameContext';

// --- Logic Section ---

const PromptCombatStatsLine: React.FC = () => {
    const stats = useActiveVitals();
    const { handleTabClick } = useUI();
    const fmt = (value: number | undefined) => value !== undefined ? `${value}%` : '--';
    const statPairs = [
        ['OB', stats.ob],
        ['DB', stats.db],
        ['PB', stats.pb],
        ['Armour', stats.armour]
    ] as const;

    return (
        <div 
            className="prompt-combat-stats-line" 
            aria-label="Combat stats"
            onClick={() => handleTabClick('status')}
        >
            {statPairs.map(([label, value]) => (
                <span key={label} className="prompt-combat-stat">
                    <b>{label}:</b>
                    <strong>{fmt(value)}</strong>
                </span>
            ))}
        </div>
    );
};

export default React.memo(PromptCombatStatsLine);
