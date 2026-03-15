import React, { useMemo } from 'react';
import { GameStats } from '../types';
import './ModernVitals.css';

interface ModernVitalsProps {
    stats: GameStats;
    isLandscape?: boolean;
}

const StatRow: React.FC<{
    label: string;
    value: number;
    max: number;
    type: 'hp' | 'mana' | 'move';
}> = ({ label, value, max, type }) => {
    // Threshold percentages (total 100%)
    const chunks = useMemo(() => [
        { id: 'awful', width: 10 },
        { id: 'bad', width: 15 },
        { id: 'wounded', width: 20 },
        { id: 'hurt', width: 25 },
        { id: 'fine', width: 30 } // Combined Fine (70-99%) and Healthy (100%)
    ], []);

    // Total units of 10.
    const totalBlocks = Math.max(1, Math.ceil(max / 10));
    
    // Segment logic: each chunk is a "window" into the block sequence.
    // The gaps are physical space in CSS, so blocks "skip" them.
    const renderChunk = (chunk: { id: string, width: number }, chunkIdx: number) => {
        const startWeight = chunks.slice(0, chunkIdx).reduce((acc, c) => acc + c.width, 0);
        const endWeight = startWeight + chunk.width;
        
        // HP positions of the segment boundaries
        const segmentHpStart = (startWeight / 100) * max;
        const segmentHpEnd = (endWeight / 100) * max;
        const segmentHpWidth = segmentHpEnd - segmentHpStart;

        const segmentBlocks = [];
        
        // Block boundaries: j*10 to (j+1)*10
        // Find which block indices could possibly overlap this segment
        const startBlockIdx = Math.floor(segmentHpStart / 10);
        const endBlockIdx = Math.ceil(segmentHpEnd / 10);

        for (let j = startBlockIdx; j < endBlockIdx; j++) {
            const blockHpStart = j * 10;
            const blockHpEnd = (j + 1) * 10;

            const overlapStart = Math.max(segmentHpStart, blockHpStart);
            const overlapEnd = Math.min(segmentHpEnd, blockHpEnd);

            if (overlapEnd > overlapStart) {
                const isFilled = blockHpStart < value;
                const hpWidth = overlapEnd - overlapStart;

                segmentBlocks.push(
                    <div 
                        key={j}
                        className={`vitals-block ${isFilled ? 'filled' : ''}`}
                        style={{ flex: `${hpWidth} 0 0` }}
                    />
                );
            }
        }

        return (
            <div 
                key={chunk.id} 
                className={`threshold-chunk chunk-${chunk.id}`}
                style={{ flex: chunk.width }}
            >
                {segmentBlocks}
            </div>
        );
    };

    return (
        <div className={`modern-vitals-row ${type}`}>
            <div className="modern-vitals-label">
                <span>{label}</span>
                <span className="modern-vitals-value">
                    {value} <span style={{ opacity: 0.4, fontVariantNumeric: 'tabular-nums' }}>{max}</span>
                </span>
            </div>
            
            <div className="modern-vitals-track">
                <div className="modern-vitals-thresholds">
                    {chunks.map((c, i) => renderChunk(c, i))}
                </div>
            </div>
        </div>
    );
};

const ModernVitals: React.FC<ModernVitalsProps> = ({ stats, isLandscape }) => {
    return (
        <div className={`modern-vitals-container ${isLandscape ? 'landscape' : ''}`}>
            <StatRow label="Health" value={stats.hp} max={stats.maxHp} type="hp" />
            <StatRow label="Mana" value={stats.mana} max={stats.maxMana} type="mana" />
            <StatRow label="Stamina" value={stats.move} max={stats.maxMove} type="move" />
        </div>
    );
};

export default React.memo(ModernVitals);
