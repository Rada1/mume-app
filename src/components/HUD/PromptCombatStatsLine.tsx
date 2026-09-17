/**
 * @file PromptCombatStatsLine.tsx
 * @description Compact combat stat strip for the player side of the prompt box.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sword, Shield } from 'lucide-react';
import { useActiveVitals } from '../../stores/useActiveGameState';

// --- Logic Section ---

const ArmourIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="lucide-armour"
    >
        <path d="M8 3h8l3 2 3 4-4 3-2-2v11H8V10l-2 2-4-3 3-4 3-2z" />
        <path d="M8 3l4 5 4-5" />
        <path d="M5 5l5 4" />
        <path d="M19 5l-5 4" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
    </svg>
);

const DodgeBonusIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="lucide-dodge-bonus"
    >
        <path d="M2 7h6" />
        <path d="M1 12h7" />
        <path d="M2 17h5" />
        <circle cx="16.5" cy="5" r="2.5" />
        <path d="M15 8l-5 2v3l5-1.5 3 3.5" />
        <path d="M18.5 9.5l3 2.5" />
        <path d="M13.5 14l-5 6" />
        <path d="M17.5 15l-1.5 5" />
    </svg>
);

const PromptCombatStatsLine: React.FC = () => {
    const stats = useActiveVitals();
    const fmt = (value: number | undefined) => value !== undefined ? `${value}%` : '--';

    const statPairs = [
        { id: 'ob', label: 'OB', value: stats.ob, icon: <Sword size={12} strokeWidth={2.5} /> },
        { id: 'db', label: 'DB', value: stats.db, icon: <DodgeBonusIcon size={12} /> },
        { id: 'pb', label: 'PB', value: stats.pb, icon: <Shield size={12} strokeWidth={2.5} /> },
        { id: 'armour', label: 'Armour', value: stats.armour, icon: <ArmourIcon size={12} /> }
    ];
    const previousValuesRef = useRef<Record<string, number | undefined> | null>(null);
    const [changeAnimations, setChangeAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});

    useEffect(() => {
        const nextValues = Object.fromEntries(statPairs.map(({ id, value }) => [id, value]));
        const previousValues = previousValuesRef.current;

        if (previousValues) {
            const changes = statPairs.filter(({ id, value }) =>
                value !== undefined && previousValues[id] !== undefined && value !== previousValues[id]
            );
            if (changes.length > 0) {
                setChangeAnimations(current => {
                    const next = { ...current };
                    for (const { id, value } of changes) {
                        next[id] = {
                            direction: value! > previousValues[id]! ? 'up' : 'down',
                            key: (current[id]?.key || 0) + 1
                        };
                    }
                    return next;
                });
            }
        }

        previousValuesRef.current = nextValues;
    }, [stats.ob, stats.db, stats.pb, stats.armour]);

    return (
        <div 
            className="prompt-combat-stats-line" 
            aria-label="Combat stats"
        >
            {statPairs.map(({ id, label, value, icon }) => {
                const animation = changeAnimations[id];
                return (
                <span key={id} className="prompt-combat-stat" title={label}>
                    <span className="stat-icon-wrapper">{icon}</span>
                    <strong
                        key={animation?.key || 0}
                        className={animation ? `combat-stat-change-${animation.direction}` : undefined}
                    >
                        {fmt(value)}
                    </strong>
                </span>
                );
            })}
        </div>
    );
};

export default React.memo(PromptCombatStatsLine);
