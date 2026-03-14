import React, { useState, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { useMapper } from '../../../context/MapperContext';
import { GripHorizontal } from 'lucide-react';

interface MapperClusterProps {
    uiPositions: any;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: string, force?: boolean) => void;
    characterName: string;
    isMmapperMode: boolean;
    isMobile: boolean;
    mapperRef: React.RefObject<any>;
    dragState: any;
    isLandscape?: boolean;
    wasDraggingRef: React.MutableRefObject<boolean>;
    heldButton: any;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMmapperMode, isMobile, mapperRef,
    dragState, isLandscape, wasDraggingRef, heldButton, setHeldButton, setCommandPreview
}) => {
    const { triggerHaptic, showLegacyButtons, showControls, viewport, btn, handleButtonClick, executeCommand, joystick } = useGame();
    const { target, activePrompt, stats } = useVitals();
    const { ui, setUI, setPopoverState } = useUI();
    const { isMapFloating, setIsMapFloating } = useMapper();
    const isExpanded = ui.mapExpanded;
    const { isKeyboardOpen } = viewport;

    const [isOverDockZone, setIsOverDockZone] = useState(false);

    useEffect(() => {
        const onDragging = (e: any) => {
            const { id, clientX, clientY } = e.detail;
            if (id === 'mapper') {
                const isMob = window.innerWidth <= 768;
                let over = false;
                if (isMob) {
                    if (clientY > window.innerHeight * 0.8) over = true;
                } else {
                    // Specific hit detection for the Map Tab on desktop
                    const mapTab = document.getElementById('drawer-tab-map');
                    if (mapTab) {
                        const rect = mapTab.getBoundingClientRect();
                        // Add some buffer around the tab for easier docking
                        const buffer = 20;
                        if (clientX >= rect.left - buffer && 
                            clientX <= rect.right + buffer && 
                            clientY >= rect.top - buffer && 
                            clientY <= rect.bottom + buffer) {
                            over = true;
                        }
                    }
                }
                setIsOverDockZone(over);
            }
        };
        const onDragEnd = () => setIsOverDockZone(false);

        window.addEventListener('mud-cluster-dragging', onDragging);
        window.addEventListener('mud-cluster-drag-end', onDragEnd);
        return () => {
            window.removeEventListener('mud-cluster-dragging', onDragging);
            window.removeEventListener('mud-cluster-drag-end', onDragEnd);
        };
    }, []);

    // Mobile DOCKED (Gutter) Mode
    if (isMobile && !isMapFloating) {
        return (
            <div 
                className={`mobile-bottom-gutter ${isExpanded ? 'map-expanded' : ''}`}
                onClick={(e) => e.stopPropagation()} // Prevent log interaction
            >
                {!showLegacyButtons && showControls && !isKeyboardOpen && !isLandscape && !isExpanded && (
                    <div className="line-cluster-container">
                        <LineCluster
                            isEditMode={isEditMode}
                            handleDragStart={handleDragStart}
                            buttons={btn.buttons.filter(b => !['Score', 'Inv', 'Look', 'Combat', 'Set'].includes(b.label || ''))}
                            selectedButtonIds={btn.selectedButtonIds}
                            dragState={dragState}
                            handleButtonClick={handleButtonClick}
                            wasDraggingRef={wasDraggingRef}
                            triggerHaptic={triggerHaptic}
                            setPopoverState={setPopoverState}
                            setEditingButtonId={btn.setEditingButtonId}
                            setSelectedIds={btn.setSelectedIds}
                            activePrompt={activePrompt}
                            executeCommand={executeCommand}
                            setCommandPreview={setCommandPreview}
                            heldButton={heldButton}
                            setHeldButton={setHeldButton}
                            joystick={joystick}
                            target={target}
                            isGridEnabled={btn.isGridEnabled}
                            gridSize={btn.gridSize}
                            setActiveSet={btn.setActiveSet}
                            setButtons={btn.setButtons}
                            isMobile={isMobile}
                            stats={stats}
                        />
                    </div>
                )}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <Mapper
                        ref={mapperRef}
                        isDesignMode={isEditMode}
                        characterName={characterName}
                        isMmapperMode={isMmapperMode}
                        isMobile={true}
                        isExpanded={isExpanded}
                        setIsMinimized={(min) => {
                            setUI(prev => ({ ...prev, mapExpanded: !min }));
                        }}
                        onUndock={() => {
                            triggerHaptic(40);
                            setIsMapFloating(true);
                            setUI(prev => ({ ...prev, mapExpanded: false }));
                        }}
                        heldButton={heldButton}
                        setHeldButton={setHeldButton}
                        setCommandPreview={setCommandPreview}
                    />
                </div>
            </div>
        );
    }

    // FLOATING Mode (Mobile or Desktop)
    const pos = uiPositions.mapper || {};
    const style: React.CSSProperties = {
        position: 'absolute',
        left: (pos.x !== undefined && pos.x < window.innerWidth - 100) ? pos.x : (isMobile ? '10px' : '50px'),
        top: pos.y ?? (pos.x === undefined ? (isMobile ? '100px' : '150px') : undefined),
        bottom: (pos.x !== undefined || pos.y !== undefined) ? 'auto' : undefined,
        right: (pos.x !== undefined && pos.x < window.innerWidth - 100) ? 'auto' : undefined,
        transform: pos.scale ? `scale(${pos.scale})` : undefined,
        transformOrigin: 'top left',
        width: pos.w ? `${pos.w}px` : (isMobile ? '300px' : '320px'),
        height: pos.h ? `${pos.h}px` : (isMobile ? '300px' : '320px'),
        cursor: isEditMode ? 'move' : undefined,
        border: isOverDockZone ? '2px solid var(--accent)' : (isEditMode ? '1px dashed rgba(255,255,0,0.3)' : (isMobile ? '1px solid rgba(255,255,255,0.1)' : undefined)),
        borderRadius: '12px',
        backgroundColor: isOverDockZone ? 'rgba(var(--accent-rgb), 0.2)' : (isEditMode ? 'rgba(255, yellow, 0, 0.1)' : 'rgba(15, 23, 42, 0.95)'),
        boxShadow: isOverDockZone ? '0 0 30px var(--accent)' : '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'visible',
        opacity: 1,
        zIndex: 1600,
        transition: 'border 0.2s, background-color 0.2s, box-shadow 0.2s'
    };

    return (
        <div
            id="cluster-mapper"
            className={`mapper-cluster ${isOverDockZone ? 'magnetic-dock-active' : ''}`}
            style={style}
            onPointerDown={(e) => { if (isEditMode) handleDragStart(e, 'mapper', 'cluster'); }}
        >
            <Mapper 
                ref={mapperRef} 
                isDesignMode={isEditMode} 
                characterName={characterName} 
                isMmapperMode={isMmapperMode} 
                isMobile={isMobile}
                isExpanded={true} // Floating window is always "expanded" internally
            />
            {isEditMode && <div className="resize-handle" style={{ zIndex: 101 }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster-resize'); }} />}
            
            {/* Draggable Handle at bottom (available outside of design mode) */}
            {!isEditMode && isMapFloating && (
                <div 
                    className="mapper-drag-handle" 
                    style={{ 
                        position: 'absolute', bottom: '-24px', left: '0', right: '0', height: '32px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
                        background: 'rgba(15, 23, 42, 0.8)', borderRadius: '0 0 12px 12px', 
                        border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none',
                        zIndex: 100
                    }}
                    onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster', true); }}
                >
                    <GripHorizontal size={16} color="var(--accent)" />
                </div>
            )}
        </div>
    );
};
