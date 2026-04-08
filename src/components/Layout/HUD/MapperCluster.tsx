import React, { useState, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { useMapper } from '../../../context/useMapper';
import { GripHorizontal, Map as MapIcon, User, Shield, Users, BarChart2 } from 'lucide-react';

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
    const { triggerHaptic, showControls, viewport, btn, handleButtonClick, executeCommand, joystick } = useGame();
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
        const isShown = ui.mapExpanded || (ui.peekingDrawer === 'map');
        
        const handleTabClick = (drawer: 'stats' | 'character' | 'inventory' | 'players') => {
            triggerHaptic(30);
            if (ui.drawer === drawer) {
                setUI(prev => ({ ...prev, drawer: 'none' }));
            } else {
                setUI(prev => ({ ...prev, drawer }));
                // Fetch fresh data when opening
                if (drawer === 'stats') {
                   executeCommand('stat', true, true, true, true);
                   setTimeout(() => executeCommand('at', true, true, true, true), 100);
                } else if (drawer === 'character') {
                    executeCommand('info', true, true, true, true);
                    setTimeout(() => executeCommand('score', true, true, true, true), 100);
                    setTimeout(() => executeCommand('at', true, true, true, true), 200);
                    setTimeout(() => executeCommand('look self', true, true, true, true), 300);
                    setTimeout(() => executeCommand('whois', true, true, true, true), 400);
                    setTimeout(() => executeCommand('quest', true, true, true, true), 500);
                    setTimeout(() => executeCommand('practice', true, true, true, true), 600);
                } else if (drawer === 'inventory') {
                    executeCommand('eq', true, true, true, true);
                    setTimeout(() => executeCommand('inv', true, true, true, true), 100);
                } else if (drawer === 'players') {
                    executeCommand('who', true, true, true, true);
                }
            }
        };

        return (
            <div 
                className={`mobile-bottom-gutter ${isShown ? 'map-expanded' : ''}`}
                onClick={(e) => e.stopPropagation()} // Prevent log interaction
                style={{
                    padding: isShown ? '10px 15px 10px 15px' : '0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}
            >
                {/* Map Area */}
                <div 
                    className={`mobile-mapper-touch-surface ${(isShown) ? "drawer-section" : ""}`} 
                    style={{ 
                        flex: 1, 
                        position: 'relative', 
                        overflow: 'hidden', 
                        pointerEvents: 'auto',
                        padding: '0',
                        margin: '0',
                        height: '100%',
                        background: (isShown) ? 'rgba(15, 23, 42, 0.3)' : 'transparent',
                        border: (isShown) ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                        borderRadius: (isShown) ? '16px 16px 0 0' : '20px 20px 0 0',
                        boxShadow: (isShown) ? '0 8px 32px rgba(0, 0, 0, 0.4)' : 'none',
                        touchAction: 'none'
                    }}
                >
                    {/* Tactical Line Buttons (Overlaid on Map) */}
                    <div 
                        className="line-cluster-wrapper portrait-visible"
                        style={{
                            position: 'absolute',
                            top: '8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                            pointerEvents: 'auto'
                        }}
                    >
                        <LineCluster
                            isEditMode={isEditMode}
                            handleDragStart={handleDragStart}
                            buttons={btn.buttons}
                            selectedButtonIds={btn.selectedButtonIds}
                            dragState={btn.dragState}
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
                        />
                    </div>

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

                {/* Unified Tab Bar for both orientations - Now at the bottom */}
                <div className="portrait-tab-bar portrait-visible">
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'stats' ? 'active' : ''}`}
                        onClick={() => handleTabClick('stats')}
                    >
                        <BarChart2 className="tab-icon" />
                        <span className="tab-text">Stats</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'character' ? 'active' : ''}`}
                        onClick={() => handleTabClick('character')}
                    >
                        <User className="tab-icon" />
                        <span className="tab-text">Char</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'players' ? 'active' : ''}`}
                        onClick={() => handleTabClick('players')}
                    >
                        <Users className="tab-icon" />
                        <span className="tab-text">Players</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'inventory' ? 'active' : ''}`}
                        onClick={() => handleTabClick('inventory')}
                    >
                        <Shield className="tab-icon" />
                        <span className="tab-text">Gear</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'none' ? 'active' : ''}`}
                        onClick={() => setUI(prev => ({ ...prev, drawer: 'none', peekingSource: 'none' }))}
                    >
                        <MapIcon className="tab-icon" />
                        <span className="tab-text">Map</span>
                    </div>
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
        borderRadius: '16px',
        backgroundColor: isOverDockZone ? 'rgba(var(--accent-rgb), 0.3)' : (isEditMode ? 'rgba(255, 255, 0, 0.1)' : 'rgba(15, 23, 42, 0.4)'),
        boxShadow: (isEditMode || isOverDockZone) ? 'none' : '0 10px 40px rgba(0, 0, 0, 0.4)',
        overflow: 'visible',
        opacity: 1,
        zIndex: 1600,
        transition: 'border 0.2s, background-color 0.2s, box-shadow 0.2s',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    };

    return (
        <>
            {/* Desktop Map Toggle Tab removed — now part of the unified bottom bar in DrawerManager */}


            <div
                id="cluster-mapper"
                className={`mapper-cluster ${isOverDockZone ? 'magnetic-dock-active' : ''}`}
                style={style}
                onPointerDown={(e) => { if (isEditMode) handleDragStart(e, 'mapper', 'cluster'); }}
            >
                <div 
                    className="drawer-section"
                    style={{
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        padding: 0,
                        overflow: 'hidden',
                        pointerEvents: 'auto',
                        background: 'transparent',
                        border: isOverDockZone ? '2px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Mapper 
                        ref={mapperRef} 
                        isDesignMode={isEditMode} 
                        characterName={characterName} 
                        isMmapperMode={isMmapperMode} 
                        isMobile={isMobile}
                        isExpanded={true} // Floating window is always "expanded" internally
                    />
                </div>
                {isEditMode && <div className="resize-handle" style={{ zIndex: 101, touchAction: 'none' }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster-resize'); }} />}
                
                {/* Draggable Handle at bottom (available outside of design mode) */}
                {!isEditMode && isMapFloating && (
                    <div 
                        className="mapper-drag-handle" 
                        style={{ 
                            position: 'absolute', bottom: '-24px', left: '0', right: '0', height: '32px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
                            background: 'transparent', borderRadius: '0 0 16px 16px', 
                            border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none',
                            zIndex: 100, pointerEvents: 'auto', touchAction: 'none'
                        }}
                        onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster', true); }}
                    >
                        <GripHorizontal size={16} color="var(--accent)" />
                    </div>
                )}
            </div>
        </>
    );
};
