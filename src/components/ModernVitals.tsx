import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { GameStats } from '../types';
import './ModernVitals.css';

interface ModernVitalsProps {
    stats: GameStats;
    isLandscape?: boolean;
    inCombat?: boolean;
    onWimpyChange?: (val: number) => void;
}

const StatRow: React.FC<{
    label: string;
    value: number;
    max: number;
    type: 'hp' | 'mana' | 'move';
    wimpy?: number;
    onWimpyChange?: (val: number) => void;
    inCombat?: boolean;
    staminaStatus?: string;
}> = ({ label, value, max, type, wimpy, onWimpyChange, inCombat, staminaStatus }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragVal, setDragVal] = useState<number | null>(null);

    // Threshold percentages (total 100%)
    const chunks = useMemo(() => {
        if (type === 'move') {
            return [
                { id: 'awful', width: 10 },    // fainting (smallest)
                { id: 'bad', width: 10 },      // weak
                { id: 'wounded', width: 15 },   // slow
                { id: 'hurt', width: 15 },      // tired
                { id: 'fine', width: 50 }       // rested (biggest)
            ];
        }

        return [
            { id: 'awful', width: 10 },
            { id: 'bad', width: 15 },
            { id: 'wounded', width: 20 },
            { id: 'hurt', width: 25 },
            { id: 'fine', width: 30 }
        ];
    }, [type]);


    const updateDrag = useCallback((e: PointerEvent | React.PointerEvent) => {
        if (!trackRef.current || max <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        let ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        const val = Math.round(ratio * max);
        setDragVal(val);
    }, [max]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!onWimpyChange || type !== 'hp') return;
        e.stopPropagation();
        setIsDragging(true);
        updateDrag(e);
    };

    useEffect(() => {
        if (!isDragging) return;
        const handlePointerMove = (e: PointerEvent) => updateDrag(e);
        const handlePointerUp = (e: PointerEvent) => {
            setIsDragging(false);
            if (dragVal !== null && onWimpyChange) {
                onWimpyChange(dragVal);
            }
            setDragVal(null);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, dragVal, onWimpyChange, updateDrag]);

    const displayWimpy = dragVal !== null ? dragVal : (wimpy ?? 0);
    const wimpyRatio = max > 0 ? displayWimpy / max : 0;

    // Segment logic: each chunk is a "window" into the block sequence.
    const renderChunk = (chunk: { id: string, width: number }, chunkIdx: number) => {
        const startWeight = chunks.slice(0, chunkIdx).reduce((acc, c) => acc + c.width, 0);
        const endWeight = startWeight + chunk.width;
        
        const segmentHpStart = (startWeight / 100) * max;
        const segmentHpEnd = (endWeight / 100) * max;

        const segmentBlocks = [];
        const effectiveMax = max > 0 ? max : 100; // Prevent collapse if max is 0
        const startBlockIdx = Math.floor(segmentHpStart / 10);
        const endBlockIdx = Math.ceil(segmentHpEnd / 10);


        for (let j = startBlockIdx; j < endBlockIdx; j++) {
            const blockHpStart = j * 10;
            const blockHpEnd = (j + 1) * 10;

            const overlapStart = Math.max(segmentHpStart, blockHpStart);
            const overlapEnd = Math.min(segmentHpEnd, blockHpEnd);

            if (overlapEnd > overlapStart) {
                let isFilled = blockHpStart < value;
                
                // MUME move status segment mapping
                if (type === 'move' && staminaStatus) {
                    const status = staminaStatus.toLowerCase();
                    const statusWeight: Record<string, number> = {
                        'steadfast': 5,
                        'rested': 5,
                        'fine': 5,
                        'tired': 4,
                        'slow': 3,
                        'weak': 2,
                        'fainting': 1
                    };
                    
                    const chunkWeight: Record<string, number> = {
                        'fine': 5,
                        'hurt': 4,
                        'wounded': 3,
                        'bad': 2,
                        'awful': 1
                    };
                    
                    const sWeight = statusWeight[status];
                    const cWeight = chunkWeight[chunk.id];
                    
                    if (sWeight !== undefined && cWeight !== undefined) {
                        isFilled = sWeight >= cWeight;
                    }
                }

                const hpWidth = overlapEnd - overlapStart;
                segmentBlocks.push(
                    <div 
                        key={j}
                        className={`vitals-block ${isFilled ? 'filled' : ''} ${inCombat && type === 'hp' ? 'pulse-combat' : ''}`}
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
            <div 
                ref={trackRef}
                className="modern-vitals-track"
                onPointerDown={handlePointerDown}
                style={{ cursor: (onWimpyChange && type === 'hp') ? 'ew-resize' : 'default', position: 'relative' }}
            >
                <div className="modern-vitals-thresholds">
                    {chunks.map((c, i) => renderChunk(c, i))}
                </div>

                {/* Wimpy Slider Elements */}
                {type === 'hp' && onWimpyChange && (
                    <>
                        <div 
                            className="wimpy-tick"
                            style={{ 
                                position: 'absolute',
                                left: `${wimpyRatio * 100}%`,
                                top: '0',
                                bottom: '0',
                                width: '1px',
                                background: '#fff',
                                boxShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 1px var(--accent)',
                                zIndex: 30,
                                pointerEvents: 'none',
                                transform: 'translateX(-50%)'
                            }}
                        />
                        <div 
                            className="wimpy-label"
                            style={{
                                position: 'absolute',
                                left: `${wimpyRatio * 100}%`,
                                bottom: 'calc(100% + 0px)',
                                transform: 'translateX(-50%)',
                                background: isDragging ? 'var(--accent)' : 'rgba(0,0,0,0.8)',
                                color: isDragging ? '#000' : '#fff',
                                padding: '0px 2px',
                                borderRadius: '1px',
                                fontSize: '0.45rem',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                zIndex: 40,
                                border: '1px solid rgba(255,255,255,0.2)',
                                pointerEvents: 'none',
                                opacity: isDragging ? 1 : 0,
                                transition: 'opacity 0.2s ease'
                            }}
                        >
                            {displayWimpy}
                        </div>
                    </>
                )}
            </div>

            <div className="modern-vitals-value-column">
                <span className="modern-vitals-value">
                    {value} <span className="max-value">{max}</span>
                </span>
            </div>
        </div>
    );

};

const ModernVitals: React.FC<ModernVitalsProps> = ({ stats, isLandscape, inCombat, onWimpyChange }) => {
    return (
        <div 
            className={`modern-vitals-container docked ${isLandscape ? 'landscape' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <StatRow 
                label="HP" 
                value={stats.hp} 
                max={stats.maxHp} 
                type="hp" 
                wimpy={stats.wimpy}
                onWimpyChange={onWimpyChange}
                inCombat={inCombat}
            />
            <StatRow label="MP" value={stats.mana} max={stats.maxMana} type="mana" />
            <StatRow label="ST" value={stats.move} max={stats.maxMove} type="move" staminaStatus={stats.staminaStatus} />
        </div>
    );
};


export default React.memo(ModernVitals);
