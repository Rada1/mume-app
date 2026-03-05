import React from 'react';
import StatBars from '../../StatBars';
import { GameStats } from '../../../types';

interface StatsClusterProps {
    uiPositions: any;
    isEditMode: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
    stats: GameStats;
    inCombat: boolean;
    handleWimpyChange: (val: number) => void;
    isLandscape: boolean;
    isMobile: boolean;
}

export const StatsCluster: React.FC<StatsClusterProps> = ({
    uiPositions, isEditMode, dragState, handleDragStart, stats, inCombat, handleWimpyChange, isLandscape, isMobile
}) => {
    if (isMobile) return null;

    const hpRatio = stats.hp / (stats.maxHp || 1);
    const manaRatio = stats.mana / (stats.maxMana || 1);
    const moveRatio = stats.move / (stats.maxMove || 1);

    const pos = uiPositions.stats || {};
    const isDefault = pos.x === undefined && pos.y === undefined;

    return (
        <div
            className="stats-cluster"
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                bottom: isDefault ? '10px' : (pos.y !== undefined ? 'auto' : undefined),
                right: isDefault ? '10px' : (pos.x !== undefined ? 'auto' : undefined),
                transform: pos.scale ? `scale(${pos.scale})` : undefined,
                transformOrigin: 'top left',
                cursor: isEditMode ? 'move' : undefined,
                border: (isEditMode && dragState?.id === 'stats') ? '2px dashed #ffff00' : (isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                padding: isEditMode ? '10px' : undefined,
                borderRadius: '20px',
                backgroundColor: isEditMode ? 'rgba(255,255,0,0.1)' : undefined,
                zIndex: 1600,
                display: 'flex',
                pointerEvents: 'auto'
            }}
            onPointerDown={(e) => { if (isEditMode) handleDragStart(e, 'stats', 'cluster'); }}
        >
            {isEditMode && <div className="resize-handle" style={{ zIndex: 1700 }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'stats', 'cluster-resize'); }} />}
            <StatBars
                hpRatio={hpRatio}
                manaRatio={manaRatio}
                moveRatio={moveRatio}
                stats={stats}
                inCombat={inCombat}
                onWimpyChange={handleWimpyChange}
                isLandscape={isLandscape}
            />
        </div>
    );
};
