import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameStats } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAtmosphereAudio } from '../../hooks/useAtmosphereAudio';

interface VitalsDisplayProps {
    stats: GameStats;
    hpRatio: number;
    manaRatio: number;
    moveRatio: number;
    inCombat?: boolean;
    onClick?: () => void;
    orientation?: 'vertical' | 'horizontal';
    onWimpyChange?: (val: number) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    isLandscape?: boolean;
}

const ResourceBar: React.FC<{ 
    percent: number; 
    color: string; 
    ghostColor: string;
    isVertical: boolean;
    inCombat?: boolean;
    isDragging?: boolean;
    rowRef?: React.RefObject<HTMLDivElement>;
}> = ({ percent, color, ghostColor, isVertical, inCombat, isDragging, rowRef }) => {
    const [lossMagnitude, setLossMagnitude] = useState(0);
    const prevPercentRef = useRef(percent);

    useEffect(() => {
        const prev = prevPercentRef.current;
        prevPercentRef.current = percent;

        if (percent < prev) {
            // Stat lost - show only the magnitude of this specific drop
            const delta = prev - percent;
            setLossMagnitude(delta);
            
            const timer = setTimeout(() => {
                setLossMagnitude(0);
            }, 800);
            return () => clearTimeout(timer);
        } else if (percent > prev) {
            // Stat gained - reset loss indicator
            setLossMagnitude(0);
        }
    }, [percent]);

    return (
        <div ref={rowRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '4px', pointerEvents: 'none' }}>
             <div
                style={{
                    position: 'absolute',
                    background: ghostColor,
                    bottom: isVertical ? `${percent}%` : 0,
                    left: isVertical ? 0 : `${percent}%`,
                    height: isVertical ? `${lossMagnitude}%` : '100%',
                    width: isVertical ? '100%' : `${lossMagnitude}%`,
                    transition: isDragging ? 'none' : 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1), height 0.6s cubic-bezier(0.16, 1, 0.3, 1), left 0.3s ease, bottom 0.3s ease',
                    borderRadius: '4px',
                    zIndex: 1,
                    boxShadow: `0 0 10px ${ghostColor}`
                }}
            />
            <div
                className={inCombat ? 'pulse-combat' : ''}
                style={{
                    position: 'absolute',
                    background: color,
                    bottom: 0,
                    left: 0,
                    height: isVertical ? `${percent}%` : '100%',
                    width: isVertical ? '100%' : `${percent}%`,
                    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '4px',
                    zIndex: 2,
                    boxShadow: '0 0 6px rgba(0,0,0,0.3)'
                }}
            />
        </div>
    );
};

const VitalsDisplay: React.FC<VitalsDisplayProps> = ({
    stats, hpRatio: propsHpRatio, manaRatio: propsManaRatio, moveRatio: propsMoveRatio, inCombat,
    onClick, orientation = 'vertical', onWimpyChange, onPointerDown, isLandscape
}) => {
    const hpRatio = Math.max(0, Math.min(1, propsHpRatio));
    const manaRatio = Math.max(0, Math.min(1, propsManaRatio));
    const moveRatio = Math.max(0, Math.min(1, propsMoveRatio));
    const isVertical = orientation === 'vertical';

    const [isDragging, setIsDragging] = useState(false);
    const [dragVal, setDragVal] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const hpRowRef = useRef<HTMLDivElement>(null);
    const manaRowRef = useRef<HTMLDivElement>(null);
    const moveRowRef = useRef<HTMLDivElement>(null);

    const { isSoundEnabled, triggerHaptic } = useGame();

    useAtmosphereAudio({
        hpRatio,
        manaRatio,
        moveRatio,
        hpRowRef,
        manaRowRef,
        moveRowRef,
        isSoundEnabled
    });

    const maxStatVal = Math.max(stats.maxHp, stats.maxMana, stats.maxMove, 1);
    const barDimBase = isVertical ? 120 : 100; // 120px height or 100% width

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!onWimpyChange) return;
        e.stopPropagation();
        setIsDragging(true);
        updateDrag(e);
    };

    const updateDrag = (e: PointerEvent | React.PointerEvent) => {
        if (!trackRef.current || stats.maxHp <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        let ratio = 0;
        if (isVertical) {
            ratio = (rect.bottom - e.clientY) / rect.height;
        } else {
            ratio = (e.clientX - rect.left) / rect.width;
        }
        ratio = Math.max(0, Math.min(1, ratio));
        const val = Math.round(ratio * stats.maxHp);
        setDragVal(val);
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
    }, [isDragging, dragVal, stats.maxHp, onWimpyChange]);

    const displayWimpy = dragVal !== null ? dragVal : (stats.wimpy ?? 0);
    const wimpyRatio = stats.maxHp > 0 ? displayWimpy / stats.maxHp : 0;

    return (
        <div
            className={`stats-container ${orientation} vitals-container`}
            onClick={onClick}
            onPointerDown={onPointerDown}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                flexDirection: isVertical ? 'row' : 'column',
                alignItems: isVertical ? 'flex-end' : 'stretch',
                width: isVertical ? 'auto' : '100%',
                userSelect: 'none',
                touchAction: 'none',
                gap: isLandscape ? '4px' : '0'
            }}
        >
            {/* HP */}
            <div className="stat-group" style={{
                flexDirection: isVertical ? 'column' : 'row',
                width: isVertical ? 'auto' : '100%',
                alignItems: isVertical ? 'center' : 'center',
                gap: isLandscape ? '4px' : '8px',
                position: 'relative'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : (isLandscape ? '38px' : '45px') }}>
                    <span className="stat-name" style={{ fontSize: isLandscape ? '0.6rem' : '0.75rem' }}>HP</span>
                    <span className="stat-val" style={{ fontSize: isLandscape ? '0.7rem' : '0.85rem' }}>{stats.hp}</span>
                </div>
                <div
                    ref={trackRef}
                    className="stat-bar-track"
                    onPointerDown={handlePointerDown}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        height: isVertical ? `${(stats.maxHp / maxStatVal) * barDimBase}px` : (isLandscape ? '16px' : '24px'),
                        width: isVertical ? '32px' : '100%',
                        position: 'relative',
                        cursor: onWimpyChange ? (isVertical ? 'ns-resize' : 'ew-resize') : 'default',
                        overflow: 'visible',
                        background: 'var(--input-bg, rgba(0,0,0,0.3))',
                        borderRadius: '4px',
                        zIndex: 10,
                        pointerEvents: 'auto'
                    }}
                >
                    <ResourceBar 
                        percent={hpRatio * 100} 
                        color="linear-gradient(to top, #ff8080, #ffb3b3)" 
                        ghostColor="#ff0000"
                        isVertical={isVertical}
                        inCombat={inCombat}
                        isDragging={isDragging}
                        rowRef={hpRowRef}
                    />

                    {/* Wimpy Tick & Label */}
                    {onWimpyChange && (
                        <>
                            {/* Visual Tick */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: isVertical ? '-4px' : `${wimpyRatio * 100}%`,
                                    right: isVertical ? '-4px' : 'auto',
                                    top: isVertical ? 'auto' : '-4px',
                                    bottom: isVertical ? `${wimpyRatio * 100}%` : '-4px',
                                    width: isVertical ? 'auto' : '4px',
                                    height: isVertical ? '4px' : 'auto',
                                    background: 'var(--text-primary, #fff)',
                                    boxShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 2px var(--accent)',
                                    zIndex: 20,
                                    transform: isVertical ? 'translateY(50%)' : 'translateX(-50%)',
                                    pointerEvents: 'none',
                                    borderRadius: '2px'
                                }}
                            />
                            {/* Interaction Grabber (Visual only) */}
                            <div style={{
                                position: 'absolute',
                                left: isVertical ? '50%' : `${wimpyRatio * 100}%`,
                                bottom: isVertical ? `${wimpyRatio * 100}%` : '50%',
                                width: isLandscape ? '12px' : '16px',
                                height: isLandscape ? '12px' : '16px',
                                background: 'var(--text-faded, rgba(255,255,255,0.2))',
                                border: '2px solid var(--text-primary, #fff)',
                                borderRadius: '50%',
                                zIndex: 21,
                                transform: isVertical ? 'translate(-50%, 50%)' : 'translate(-50%, 50%)',
                                pointerEvents: 'none',
                                boxShadow: '0 0 8px rgba(0,0,0,0.8)'
                            }} />
                            {/* Persistent Value Label */}
                            <div style={{
                                position: 'absolute',
                                left: isVertical ? '44px' : `${wimpyRatio * 100}%`,
                                bottom: isVertical ? `${wimpyRatio * 100}%` : 'auto',
                                top: isVertical ? 'auto' : (isDragging ? '-32px' : (isLandscape ? '-22px' : '-26px')),
                                background: isDragging ? 'var(--accent)' : 'var(--bg-panel, rgba(0,0,0,0.8))',
                                color: isDragging ? '#000' : 'var(--text-primary, #fff)',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                fontSize: isLandscape ? '0.6rem' : '0.75rem',
                                fontWeight: 'bold',
                                transform: isVertical ? 'translateY(50%)' : 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                                zIndex: 30,
                                border: isDragging ? '1px solid var(--text-primary, #fff)' : '1px solid var(--border-color, rgba(255,255,255,0.2))',
                                pointerEvents: 'none',
                                transition: 'all 0.1s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                                {displayWimpy}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Mana */}
            <div className="stat-group" style={{
                flexDirection: isVertical ? 'column' : 'row',
                width: isVertical ? 'auto' : '100%',
                alignItems: isVertical ? 'center' : 'center',
                gap: isLandscape ? '4px' : '8px'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : (isLandscape ? '38px' : '45px') }}>
                    <span className="stat-name" style={{ fontSize: isLandscape ? '0.6rem' : '0.75rem' }}>MN</span>
                    <span className="stat-val" style={{ fontSize: isLandscape ? '0.7rem' : '0.85rem' }}>{stats.mana}</span>
                </div>
                <div className="stat-bar-track" style={{
                    height: isVertical ? `${(stats.maxMana / maxStatVal) * barDimBase}px` : (isLandscape ? '8px' : '12px'),
                    width: isVertical ? '24px' : '100%',
                    position: 'relative',
                    background: 'var(--input-bg, rgba(0,0,0,0.3))',
                    borderRadius: '4px'
                }}>
                    <ResourceBar 
                        percent={manaRatio * 100} 
                        color="linear-gradient(to top, #c084fc, #d8b4fe)" 
                        ghostColor="#bf40ff"
                        isVertical={isVertical}
                        isDragging={isDragging}
                        rowRef={manaRowRef}
                    />
                </div>
            </div>

            {/* Move */}
            <div className="stat-group" style={{
                flexDirection: isVertical ? 'column' : 'row',
                width: isVertical ? 'auto' : '100%',
                alignItems: isVertical ? 'center' : 'center',
                gap: isLandscape ? '4px' : '8px'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : (isLandscape ? '38px' : '45px') }}>
                    <span className="stat-name" style={{ fontSize: isLandscape ? '0.6rem' : '0.75rem' }}>MV</span>
                    <span className="stat-val" style={{ fontSize: isLandscape ? '0.7rem' : '0.85rem' }}>{stats.move}</span>
                </div>
                <div className="stat-bar-track" style={{
                    height: isVertical ? `${(stats.maxMove / maxStatVal) * barDimBase}px` : (isLandscape ? '8px' : '12px'),
                    width: isVertical ? '24px' : '100%',
                    position: 'relative',
                    background: 'var(--input-bg, rgba(0,0,0,0.3))',
                    borderRadius: '4px'
                }}>
                    <ResourceBar 
                        percent={moveRatio * 100} 
                        color="linear-gradient(to top, #86efac, #bbf7d0)" 
                        ghostColor="#22ff55"
                        isVertical={isVertical}
                        isDragging={isDragging}
                        rowRef={moveRowRef}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(VitalsDisplay);
