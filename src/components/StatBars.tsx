import React from 'react';
import { GameStats } from '../types';

interface StatBarsProps {
    stats: GameStats;
    hpRowRef: React.RefObject<HTMLDivElement | null>;
    manaRowRef: React.RefObject<HTMLDivElement | null>;
    moveRowRef: React.RefObject<HTMLDivElement | null>;
}

const StatBars: React.FC<StatBarsProps> = ({ stats, hpRowRef, manaRowRef, moveRowRef }) => {
    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    const maxStatVal = Math.max(stats.maxHp, stats.maxMana, stats.maxMove, 1);
    const barHeightBase = 120;
    const hpHeight = (stats.maxHp / maxStatVal) * barHeightBase;
    const manaHeight = (stats.maxMana / maxStatVal) * barHeightBase;
    const moveHeight = (stats.maxMove / maxStatVal) * barHeightBase;

    return (
        <div className="stats-container">
            {/* HP */}
            <div className="stat-group">
                <div className="stat-label-group">
                    <span className="stat-name">HP</span>
                    <span className="stat-val">{stats.hp}</span>
                </div>
                <div className="stat-bar-track" style={{ height: `${hpHeight}px` }}>
                    <div
                        ref={hpRowRef}
                        className="stat-bar-fill"
                        style={{
                            '--fill-ratio': `${hpRatio * 100}%`,
                            background: 'linear-gradient(to top, #600, #d00)'
                        } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Mana */}
            <div className="stat-group">
                <div className="stat-label-group">
                    <span className="stat-name">MN</span>
                    <span className="stat-val">{stats.mana}</span>
                </div>
                <div className="stat-bar-track" style={{ height: `${manaHeight}px` }}>
                    <div
                        ref={manaRowRef}
                        className="stat-bar-fill"
                        style={{
                            '--fill-ratio': `${manaRatio * 100}%`,
                            background: 'linear-gradient(to top, #407, #b0f)'
                        } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Move */}
            <div className="stat-group">
                <div className="stat-label-group">
                    <span className="stat-name">MV</span>
                    <span className="stat-val">{stats.move}</span>
                </div>
                <div className="stat-bar-track" style={{ height: `${moveHeight}px` }}>
                    <div
                        ref={moveRowRef}
                        className="stat-bar-fill"
                        style={{
                            '--fill-ratio': `${moveRatio * 100}%`,
                            background: 'linear-gradient(to top, #042, #0c4)'
                        } as React.CSSProperties}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(StatBars);
