import React, { useState, useRef, useEffect } from 'react';
import { GameStats } from '../types';

interface StatBarsProps {
    stats: GameStats;
    hpRowRef: React.RefObject<HTMLDivElement | null>;
    manaRowRef: React.RefObject<HTMLDivElement | null>;
    moveRowRef: React.RefObject<HTMLDivElement | null>;
    onClick?: () => void;
    orientation?: 'vertical' | 'horizontal';
    onWimpyChange?: (val: number) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
}

const StatBars: React.FC<StatBarsProps> = ({ stats, hpRowRef, manaRowRef, moveRowRef, onClick, orientation = 'vertical', onWimpyChange, onPointerDown }) => {
    const isVertical = orientation === 'vertical';
    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    const [isDragging, setIsDragging] = useState(false);
    const [dragVal, setDragVal] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

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
            className={`stats-container ${orientation}`}
            onClick={onClick}
            onPointerDown={onPointerDown}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                flexDirection: isVertical ? 'row' : 'column',
                alignItems: isVertical ? 'flex-end' : 'stretch',
                width: isVertical ? 'auto' : '100%',
                userSelect: 'none',
                touchAction: 'none'
            }}
        >
            {/* HP */}
            <div className="stat-group" style={{
                flexDirection: isVertical ? 'column' : 'row',
                width: isVertical ? 'auto' : '100%',
                alignItems: isVertical ? 'center' : 'center',
                gap: '8px',
                position: 'relative'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : '45px' }}>
                    <span className="stat-name">HP</span>
                    <span className="stat-val">{stats.hp}</span>
                </div>
                <div
                    ref={trackRef}
                    className="stat-bar-track"
                    onPointerDown={handlePointerDown}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        height: isVertical ? `${(stats.maxHp / maxStatVal) * barDimBase}px` : '24px',
                        width: isVertical ? '32px' : '100%',
                        position: 'relative',
                        cursor: onWimpyChange ? (isVertical ? 'ns-resize' : 'ew-resize') : 'default',
                        overflow: 'visible',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '4px',
                        zIndex: 10,
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '4px', pointerEvents: 'none' }}>
                        <div
                            ref={hpRowRef}
                            className="stat-bar-fill"
                            style={{
                                '--fill-ratio': `${hpRatio * 100}%`,
                                background: 'linear-gradient(to top, #600, #d00)',
                                bottom: 0,
                                left: 0,
                                height: isVertical ? 'var(--fill-ratio)' : '100%',
                                width: isVertical ? '100%' : 'var(--fill-ratio)',
                                transition: isDragging ? 'none' : 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                borderRadius: '4px',
                                zIndex: 1
                            } as React.CSSProperties}
                        />
                    </div>

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
                                    background: '#fff',
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
                                width: '16px',
                                height: '16px',
                                background: 'rgba(255,255,255,0.2)',
                                border: '2px solid #fff',
                                borderRadius: '50%',
                                zIndex: 21,
                                transform: 'translate(-50%, 50%)',
                                pointerEvents: 'none',
                                boxShadow: '0 0 8px rgba(0,0,0,0.8)'
                            }} />
                            {/* Persistent Value Label */}
                            <div style={{
                                position: 'absolute',
                                left: isVertical ? '44px' : `${wimpyRatio * 100}%`,
                                bottom: isVertical ? `${wimpyRatio * 100}%` : (isDragging ? '32px' : '26px'),
                                background: isDragging ? 'var(--accent)' : 'rgba(0,0,0,0.8)',
                                color: isDragging ? '#000' : '#fff',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                transform: isVertical ? 'translateY(50%)' : 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                                zIndex: 30,
                                border: isDragging ? '1px solid #fff' : '1px solid rgba(255,255,255,0.2)',
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
                gap: '8px'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : '45px' }}>
                    <span className="stat-name">MN</span>
                    <span className="stat-val">{stats.mana}</span>
                </div>
                <div className="stat-bar-track" style={{
                    height: isVertical ? `${(stats.maxMana / maxStatVal) * barDimBase}px` : '12px',
                    width: isVertical ? '24px' : '100%'
                }}>
                    <div
                        ref={manaRowRef}
                        className="stat-bar-fill"
                        style={{
                            '--fill-ratio': `${manaRatio * 100}%`,
                            background: 'linear-gradient(to top, #407, #b0f)',
                            bottom: 0,
                            left: 0,
                            height: isVertical ? 'var(--fill-ratio)' : '100%',
                            width: isVertical ? '100%' : 'var(--fill-ratio)',
                            transition: isVertical ? 'height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Move */}
            <div className="stat-group" style={{
                flexDirection: isVertical ? 'column' : 'row',
                width: isVertical ? 'auto' : '100%',
                alignItems: isVertical ? 'center' : 'center',
                gap: '8px'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : '45px' }}>
                    <span className="stat-name">MV</span>
                    <span className="stat-val">{stats.move}</span>
                </div>
                <div className="stat-bar-track" style={{
                    height: isVertical ? `${(stats.maxMove / maxStatVal) * barDimBase}px` : '12px',
                    width: isVertical ? '24px' : '100%'
                }}>
                    <div
                        ref={moveRowRef}
                        className="stat-bar-fill"
                        style={{
                            '--fill-ratio': `${moveRatio * 100}%`,
                            background: 'linear-gradient(to top, #042, #0c4)',
                            bottom: 0,
                            left: 0,
                            height: isVertical ? 'var(--fill-ratio)' : '100%',
                            width: isVertical ? '100%' : 'var(--fill-ratio)',
                            transition: isVertical ? 'height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        } as React.CSSProperties}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(StatBars);
