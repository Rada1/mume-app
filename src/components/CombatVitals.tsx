import React from 'react';
import { GameStats } from '../types';
import './ModernVitals.css'; // Reuse styles from ModernVitals

interface CombatVitalsProps {
    stats: GameStats;
    mood: string;
}

const CombatStatRow: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
    <div className="modern-vitals-row">
        <div className="modern-vitals-label">{label}</div>
        <div className="modern-vitals-value">{value}</div>
    </div>
);

const CombatVitals: React.FC<CombatVitalsProps> = ({ stats, mood }) => {
    return (
        <div className="modern-vitals-container" style={{ marginTop: '10px', flexDirection: 'row', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between' }}>
            <CombatStatRow label="OB" value={stats.ob !== undefined ? `${stats.ob}%` : 'N/A'} />
            <CombatStatRow label="DB" value={stats.db !== undefined ? `${stats.db}%` : 'N/A'} />
            <CombatStatRow label="PB" value={stats.pb !== undefined ? `${stats.pb}%` : 'N/A'} />
            <CombatStatRow label="ARMOUR" value={stats.armour !== undefined ? `${stats.armour}%` : 'N/A'} />
            <CombatStatRow label="STANCE" value={mood || 'N/A'} />
        </div>
    );
};

export default React.memo(CombatVitals);
