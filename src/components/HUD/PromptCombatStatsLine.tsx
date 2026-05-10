/**
 * @file PromptCombatStatsLine.tsx
 * @description Compact combat stat strip for the player side of the prompt box.
 */

import React from 'react';
import { Sword, Shield, Wind } from 'lucide-react';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useUI } from '../../context/GameContext';

// --- Logic Section ---

const Helmet: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="lucide-helmet"
    >
        <path d="M12 2C6.5 2 2 6.5 2 12v9h5v-8c0-1.5 2-2.5 5-2.5s5 1 5 2.5v8h5v-9C22 6.5 17.5 2 12 2z" />
        <path d="M12 2v9" />
    </svg>
);

const Cloak: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="lucide-cloak"
    >
        <path d="M12 4c-1.5 0-3 1-3 3l-6 14h18l-6-14c0-2-1.5-3-3-3z" />
        <path d="M12 4v17" />
    </svg>
);

const PromptCombatStatsLine: React.FC = () => {
    const stats = useActiveVitals();
    const { handleTabClick } = useUI();
    const fmt = (value: number | undefined) => value !== undefined ? `${value}%` : '--';
    
    const statPairs = [
        { id: 'ob', label: 'OB', value: stats.ob, icon: <Sword size={12} strokeWidth={2.5} /> },
        { id: 'db', label: 'DB', value: stats.db, icon: <Cloak size={12} /> },
        { id: 'pb', label: 'PB', value: stats.pb, icon: <Shield size={12} strokeWidth={2.5} /> },
        { id: 'armour', label: 'Armour', value: stats.armour, icon: <Helmet size={12} /> }
    ];

    return (
        <div 
            className="prompt-combat-stats-line" 
            aria-label="Combat stats"
            onClick={() => handleTabClick('status')}
        >
            {statPairs.map(({ id, label, value, icon }) => (
                <span key={id} className="prompt-combat-stat" title={label}>
                    <span className="stat-icon-wrapper">{icon}</span>
                    <strong>{fmt(value)}</strong>
                </span>
            ))}
        </div>
    );
};

export default React.memo(PromptCombatStatsLine);
