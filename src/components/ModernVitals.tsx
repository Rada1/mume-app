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


    const updateDrag = useCallback((e: PointerEvent | React.PointerEvent | TouchEvent | React.TouchEvent) => {
        if (!trackRef.current || max <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        
        let clientX = 0;
        if ('clientX' in e) {
            clientX = e.clientX;
        } else if ('touches' in e && e.touches[0]) {
            clientX = e.touches[0].clientX;
        } else if ('changedTouches' in e && e.changedTouches[0]) {
            clientX = e.changedTouches[0].clientX;
        }

        let ratio = (clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        const val = Math.round(ratio * max);
        dragValRef.current = val;
        setDragVal(val);
    }, [max]);

    const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
        if (!onWimpyChange || type !== 'hp') return;
        e.stopPropagation();
        
        // Initial calculation to set the drag value immediately
        if (!trackRef.current || max <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        let clientX = 0;
        if ('clientX' in e) clientX = e.clientX;
        else if ('touches' in e && e.touches[0]) clientX = e.touches[0].clientX;
        
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const val = Math.round(ratio * max);
        dragValRef.current = val;
        setDragVal(val);
        
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;
        
        const handleMove = (e: PointerEvent | TouchEvent) => {
            if (e instanceof TouchEvent) {
                updateDrag(e);
            } else {
                updateDrag(e);
            }
        };

        const handleUp = (e: PointerEvent | TouchEvent) => {
            setIsDragging(false);
            
            // Final update to catch the last position
            if (e instanceof TouchEvent) {
                updateDrag(e);
            }
            
            if (dragValRef.current !== null && onWimpyChange) {
                onWimpyChange(dragValRef.current);
            }
            dragValRef.current = null;
            setDragVal(null);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false, capture: true });
        window.addEventListener('touchend', handleUp, { passive: false, capture: true });

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('touchmove', handleMove, { capture: true } as any);
            window.removeEventListener('touchend', handleUp, { capture: true } as any);
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
            // MUME Status Mapping (Full words and common prompt abbreviations)
            const statusWeight: Record<string, number> = {
                'steadfast': 6, 'fresh': 6, 'unwearied': 6, 'f': 6,
                'rested': 5, 'r': 5,
                'tired': 4, 't': 4,
                'weary': 3, 'w': 3,
                'slow': 2, 's': 2,
                'weak': 1, 'W': 1, // 'W' often used for weak, 'w' for weary
                'fainting': 0, 'exhausted': 0
            };
            
            const chunkWeight: Record<string, number> = {
                'fine': 5, 'hurt': 4, 'wounded': 3, 'bad': 2, 'awful': 1
            };
            
            const sWeight = statusWeight[status];
            const cWeight = chunkWeight[chunk.id];
            
            if (sWeight !== undefined && cWeight !== undefined) {
                fillPercent = sWeight >= cWeight ? 100 : 0;
            } else if (chunkHp > 0) {
                // FALLBACK: Use numeric calculation if status string is unknown
                const filledHp = Math.max(0, Math.min(value, segmentHpEnd) - segmentHpStart);
                fillPercent = (filledHp / chunkHp) * 100;
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
                onTouchStart={handlePointerDown}
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
                                width: '2px',
                                background: '#ffffff',
                                boxShadow: '0 0 6px rgba(255, 255, 255, 0.8), 0 0 1px #000',
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
                                background: isDragging ? '#ffffff' : 'rgba(0,0,0,0.8)',
                                color: isDragging ? '#000000' : '#fff',
                                padding: '0px 2px',
                                borderRadius: '1px',
                                fontSize: '0.45rem',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                zIndex: 40,
                                border: `1px solid ${isDragging ? '#000' : '#ffffff'}`,
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
                <span className="current-value">{value}</span>
                <span className="max-value">{max}</span>
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
