import React from 'react';
import ModernVitals from '../../ModernVitals';
import CombatVitals from '../../CombatVitals';
import { useVitals, useGame } from '../../../context/GameContext';

interface StatsClusterProps {
    uiPositions: any;
    isEditMode: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
    isLandscape: boolean;
    isMobile: boolean;
}

export const StatsCluster: React.FC<StatsClusterProps> = ({
    uiPositions, isEditMode, dragState, handleDragStart, isLandscape, isMobile
}) => {
    const { stats, setStats } = useVitals();
    const { inCombat, executeCommand, mood } = useGame();

    const handleWimpyChange = (val: number) => {
        setStats(prev => ({ ...prev, wimpy: val }));
        executeCommand(`change wimpy ${val}`);
    };

    const pos = uiPositions.stats || {};
    const isDefault = pos.x === undefined && pos.y === undefined;

    // Only show the floating stats cluster in edit mode now that we have the docked version
    if (!isEditMode) return null;

    return (
        <div
            id="cluster-stats"
            className="stats-cluster"

            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                bottom: isDefault ? '10px' : (pos.y !== undefined ? 'auto' : undefined),
                right: isDefault ? '10px' : (pos.x !== undefined ? 'auto' : undefined),
                width: pos.w ? `${pos.w}px` : undefined,
                height: pos.h ? `${pos.h}px` : undefined,
                transform: pos.scale ? `scale(${pos.scale})` : undefined,
                transformOrigin: 'top left',
                cursor: isEditMode ? 'move' : undefined,
                border: isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined,
                padding: isEditMode ? '10px' : undefined,
                borderRadius: '20px',
                backgroundColor: isEditMode ? 'rgba(255,255,0,0.1)' : undefined,
                opacity: 1,
                zIndex: 4000,
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto'
            }}
            onPointerDown={(e) => { if (isEditMode) handleDragStart(e, 'stats', 'cluster'); }}
        >
            {isEditMode && <div className="resize-handle" style={{ zIndex: 1700 }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'stats', 'cluster-resize'); }} />}
            <ModernVitals
                stats={stats}
                inCombat={inCombat}
                onWimpyChange={handleWimpyChange}
                isLandscape={isLandscape}
            />
            {inCombat && <CombatVitals stats={stats} mood={mood} />}
        </div>
    );
};
