import React from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { MapperRef } from '../../Mapper/mapperTypes';
import { CustomButton, GameStats } from '../../../types';
import VitalsDisplay from '../../VitalsDisplay';
import { useGame } from '../../../context/GameContext';

interface MapperClusterProps {
    uiPositions: any;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
    characterName: string;
    isMmapperMode: boolean;
    isMobile: boolean;
    mapperRef: React.RefObject<any>;
    dragState: any;
    isLandscape?: boolean;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMmapperMode, isMobile, mapperRef,
    dragState, isLandscape
}) => {
    const { ui, setUI, triggerHaptic } = useGame();
    const isExpanded = ui.mapExpanded;

    if (isMobile) {
        return (
            <div className={`mobile-bottom-gutter ${isExpanded ? 'map-expanded' : ''}`}>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <Mapper
                        ref={mapperRef}
                        isDesignMode={isEditMode}
                        characterName={characterName}
                        isMmapperMode={isMmapperMode}
                        isMobile={true}
                        isExpanded={isExpanded}
                        setIsMinimized={(min) => setUI(prev => ({ ...prev, mapExpanded: !min }))}
                    />
                </div>
            </div>
        );
    }

    const pos = uiPositions.mapper || {};
    const style: React.CSSProperties = {
        position: 'absolute',
        left: (pos.x !== undefined && pos.x < window.innerWidth - 100) ? pos.x : '50px',
        top: pos.y ?? (pos.x === undefined ? '150px' : undefined),
        bottom: (pos.x !== undefined || pos.y !== undefined) ? 'auto' : undefined,
        right: (pos.x !== undefined && pos.x < window.innerWidth - 100) ? 'auto' : undefined,
        transform: pos.scale ? `scale(${pos.scale})` : undefined,
        transformOrigin: 'top left',
        width: pos.w ? `${pos.w}px` : '320px',
        height: pos.h ? `${pos.h}px` : '320px',
        cursor: isEditMode ? 'move' : undefined,
        border: isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined,
        borderRadius: '12px',
        backgroundColor: isEditMode ? 'rgba(255,255,0,0.1)' : undefined,
        overflow: 'visible',
        opacity: 1,
        zIndex: 1600,
    };

    return (
        <div
            className="mapper-cluster"
            style={style}
            onPointerDown={(e) => { if (isEditMode) handleDragStart(e, 'mapper', 'cluster'); }}
        >
            <Mapper ref={mapperRef} isDesignMode={isEditMode} characterName={characterName} isMmapperMode={isMmapperMode} isMobile={isMobile} />
            {isEditMode && <div className="resize-handle" style={{ zIndex: 101 }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster-resize'); }} />}
        </div>
    );
};
