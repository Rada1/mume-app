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
    const dragValRef = useRef<number | null>(null);

    // Threshold percentages (total 100%)
    const chunks = useMemo(() => {
        return [
            { id: 'awful', width: 10 },
            { id: 'bad', width: 15 },
            { id: 'wounded', width: 20 },
            { id: 'hurt', width: 25 },
            { id: 'fine', width: 30 }
        ];
    }, []);


    const updateDrag = useCallback((e: PointerEvent | React.PointerEvent) => {
        if (!trackRef.current || max <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        let ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        const val = Math.round(ratio * max);
        dragValRef.current = val;
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
        const handlePointerUp = () => {
            setIsDragging(false);
            if (dragValRef.current !== null && onWimpyChange) {
                onWimpyChange(dragValRef.current);
            }
            dragValRef.current = null;
            setDragVal(null);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, onWimpyChange, updateDrag]);

    const displayWimpy = dragVal !== null ? dragVal : (wimpy ?? 0);
    const wimpyRatio = max > 0 ? displayWimpy / max : 0;

    // Segment logic: each chunk is a solid filled region.
    const renderChunk = (chunk: { id: string, width: number }, chunkIdx: number) => {
        const startWeight = chunks.slice(0, chunkIdx).reduce((acc, c) => acc + c.width, 0);
        const endWeight = startWeight + chunk.width;

        const segmentHpStart = (startWeight / 100) * max;
        const segmentHpEnd = (endWeight / 100) * max;
        const chunkHp = segmentHpEnd - segmentHpStart;

        let fillPercent = 0;
        if (type === 'move' && staminaStatus) {
            const status = staminaStatus.toLowerCase();
            const statusWeight: Record<string, number> = {
                'steadfast': 5, 'rested': 5, 'fine': 5,
                'tired': 4, 'slow': 3, 'weak': 2, 'fainting': 1
            };
            const chunkWeight: Record<string, number> = {
                'fine': 5, 'hurt': 4, 'wounded': 3, 'bad': 2, 'awful': 1
            };
            const sWeight = statusWeight[status];
            const cWeight = chunkWeight[chunk.id];
            if (sWeight !== undefined && cWeight !== undefined) {
                fillPercent = sWeight >= cWeight ? 100 : 0;
            }
        } else if (chunkHp > 0) {
            const filledHp = Math.max(0, Math.min(value, segmentHpEnd) - segmentHpStart);
            fillPercent = (filledHp / chunkHp) * 100;
        }

        return (
            <div
                key={chunk.id}
                className={`threshold-chunk chunk-${chunk.id}`}
                style={{ flex: chunk.width }}
            >
                <div
                    className={`vitals-block filled${inCombat && type === 'hp' ? ' pulse-combat' : ''}`}
                    style={{ width: `${fillPercent}%` }}
                />
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
                        {/* Invisible larger hit area for dragging */}
                        <div 
                            style={{
                                position: 'absolute',
                                left: `${wimpyRatio * 100}%`,
                                top: '-15px',
                                bottom: '-15px',
                                width: '40px',
                                transform: 'translateX(-50%)',
                                zIndex: 35,
                                cursor: 'ew-resize',
                                background: 'transparent'
                            }}
                        />
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
