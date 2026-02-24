import React from 'react';
import { GameStats } from '../types';

interface StatBarsProps {
    stats: GameStats;
    hpRowRef: React.RefObject<HTMLDivElement | null>;
    manaRowRef: React.RefObject<HTMLDivElement | null>;
    moveRowRef: React.RefObject<HTMLDivElement | null>;
    onClick?: () => void;
    orientation?: 'vertical' | 'horizontal';
}

const StatBars: React.FC<StatBarsProps> = ({ stats, hpRowRef, manaRowRef, moveRowRef, onClick, orientation = 'vertical' }) => {
    const isVertical = orientation === 'vertical';
    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    const maxStatVal = Math.max(stats.maxHp, stats.maxMana, stats.maxMove, 1);
    const barDimBase = isVertical ? 120 : 100; // 120px height or 100% width

    return (
        <div
            className={`stats-container ${orientation}`}
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                flexDirection: isVertical ? 'row' : 'column',
                alignItems: isVertical ? 'flex-end' : 'stretch',
                width: isVertical ? 'auto' : '100%'
            }}
        >
            {/* HP */}
            <div className="stat-group" style={{
                flexDirection: isVertical ? 'column' : 'row',
                width: isVertical ? 'auto' : '100%',
                alignItems: isVertical ? 'center' : 'center',
                gap: '8px'
            }}>
                <div className="stat-label-group" style={{ minWidth: isVertical ? '32px' : '45px' }}>
                    <span className="stat-name">HP</span>
                    <span className="stat-val">{stats.hp}</span>
                </div>
                <div className="stat-bar-track" style={{
                    height: isVertical ? `${(stats.maxHp / maxStatVal) * barDimBase}px` : '12px',
                    width: isVertical ? '24px' : '100%'
                }}>
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
                            transition: isVertical ? 'height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        } as React.CSSProperties}
                    />
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
