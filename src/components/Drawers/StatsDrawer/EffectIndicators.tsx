/**
 * @file EffectIndicators.tsx
 * @description Displays active spells and character conditions in the Stats Drawer.
 */

import React from 'react';

interface EffectIndicatorsProps {
    activeSpells: string[];
    stats: any;
}

export const EffectIndicators: React.FC<EffectIndicatorsProps> = ({
    activeSpells,
    stats
}) => {
    const conds = stats.conditions || {};
    const activeConds = Object.keys(conds).filter(k => conds[k]);
    
    const purpleSpells = ['armour', 'shield', 'strength', 'sanctuary', 'shroud', 'bless', 'detect magic', 'detect evil', 'sense life'];

    if (activeConds.length === 0 && activeSpells.length === 0) {
        return <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No active effects</div>;
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {activeConds.map(c => (
                <div key={c} style={{
                    padding: '3px 8px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '10px',
                    color: '#fca5a5',
                    fontSize: '0.68rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                }}>
                    {c}
                </div>
            ))}
            {activeSpells.map(s => {
                const color = purpleSpells.includes(s.toLowerCase()) ? '#d8b4fe' : '#93c5fd';
                const bg = purpleSpells.includes(s.toLowerCase()) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)';
                const border = purpleSpells.includes(s.toLowerCase()) ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)';
                
                return (
                    <div key={s} style={{
                        padding: '3px 8px',
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: '10px',
                        color: color,
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>
                        {s}
                    </div>
                );
            })}
        </div>
    );
};
