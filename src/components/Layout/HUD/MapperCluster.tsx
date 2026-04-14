import React, { useState, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { useMapper } from '../../../context/useMapper';
import { GripHorizontal, Map as MapIcon, User, Shield, Users, BarChart2, CloudFog, FileText } from 'lucide-react';
import InputArea from '../../Controls/InputArea';
import { StatsDrawer } from '../../Drawers/StatsDrawer';
import { CharacterDrawer } from '../../Drawers/CharacterDrawer';
import { PlayersDrawer } from '../../Drawers/PlayersDrawer';
import { InventoryDrawer } from '../../Drawers/InventoryDrawer';

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
    input: string;
    setInput: (val: string) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: any) => void;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMmapperMode, isMobile, mapperRef,
    dragState, isLandscape, wasDraggingRef, heldButton, setHeldButton, setCommandPreview,
    input, setInput, handleSend, handleInputSwipe
}) => {
    const {
        triggerHaptic, showControls, viewport, btn, handleButtonClick, executeCommand, joystick,
        handleTabClick, toggleMap, spatButtons, setSpatButtons, parley, setParley, whoList,
        statsLines, scoreLines, displayInventoryLines, displayEqLines,
        pendingDrawerContainerRef, inlineCategories, entities, keywordOverrides,
        env, isFoggy, gameState, currentTerrain
    } = useGame() as any;
    const { target, activePrompt, stats } = useVitals();
    const { ui, setUI, setPopoverState, isLibraryOpen, setIsLibraryOpen } = useUI();
    const { getLightingIcon, getWeatherIcon, lighting, weather } = env;
    const { isMapFloating, setIsMapFloating } = useMapper();
    const isExpanded = ui.mapExpanded || ui.peekingDrawer === 'map';
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
    // Section removed in account mode or landscape to prevent duplicate command bars
    const isReplaying = (useGame() as any).sessionMode === 'replay';
    if (isMobile && !isMapFloating && (gameState === 'playing' || isReplaying) && !isLandscape) {
        const isShown = ui.mapExpanded || (ui.peekingDrawer === 'map');
        
        return (
            <div
                className={`mobile-bottom-gutter ${isShown ? 'map-expanded' : ''}`}
                style={{
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0'
                }}
            >
                {/* Command Bar at the TOP of the gutter */}
                <div
                    className="mobile-gutter-input-wrapper"
                    style={{
                        padding: '6px 4px 0 4px',
                        flexShrink: 0,
                        marginBottom: (isShown || ui.drawer !== 'none') ? '8px' : '0'
                    }}
                >
                    <InputArea
                        input={input}
                        setInput={setInput}
                        onSend={handleSend}
                        onSwipe={handleInputSwipe}
                        isMobile={isMobile}
                        isKeyboardOpen={viewport.isKeyboardOpen}
                        commandPreview={null} // Keep it clean in the gutter
                        spatButtons={spatButtons}
                        setActiveSet={btn.setActiveSet}
                        executeCommand={executeCommand}
                        setSpatButtons={setSpatButtons}
                        setPopoverState={setPopoverState}
                        parley={parley}
                        setParley={setParley}
                        whoList={whoList}
                        gameState={gameState}
                        terrain={currentTerrain}
                        characterName={characterName}
                    />
                </div>
                
                {/* Persistent Tactical Buttons for Mobile Portrait */}
                <div className="mobile-tactical-buttons-persistent">
                    <LineCluster
                        isEditMode={isEditMode}
                        handleDragStart={handleDragStart}
                        buttons={btn.buttons}
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
                    />
                </div>

                {/* Map Area — uses same gutter-panel-card class as drawer panels */}
                <div
                    className="mobile-mapper-touch-surface gutter-panel-card"
                    style={{
                        display: isShown ? 'block' : 'none',
                        pointerEvents: isShown ? 'auto' : 'none',
                        opacity: isShown ? 1 : 0,
                        touchAction: 'none',
                        position: 'relative'
                    }}
                >
                    {/* Environmental Status Icons — moved here from tactical buttons bubble */}
                    {(lighting !== 'none' || weather !== 'none' || isFoggy) && (
                        <div className="map-status-overlay" style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            zIndex: 2700,
                            pointerEvents: 'none',
                            color: 'var(--text-faded)'
                        }}>
                            {getLightingIcon()}
                            {getWeatherIcon()}
                            {isFoggy && <CloudFog size={16} style={{ opacity: 0.6 }} />}
                        </div>
                    )}


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

                {/* Drawer Area - shown when a utility drawer tab is active */}
                {!isShown && ui.drawer !== 'none' && (
                    <div className="gutter-drawer-container gutter-panel-card">
                        {ui.drawer === 'stats' && (
                            <StatsDrawer
                                isOpen={true}
                                onClose={() => {}}
                                statsLines={statsLines}
                                scoreLines={scoreLines}
                                executeCommand={executeCommand}
                            />
                        )}
                        {ui.drawer === 'character' && (
                            <CharacterDrawer
                                isOpen={true}
                                onClose={() => {}}
                                executeCommand={executeCommand}
                            />
                        )}
                        {ui.drawer === 'players' && (
                            <PlayersDrawer
                                isOpen={true}
                                onClose={() => {}}
                                executeCommand={executeCommand}
                            />
                        )}
                        {(ui.drawer === 'inventory' || ui.drawer === 'equipment') && (
                            <InventoryDrawer
                                isOpen={true}
                                onClose={() => {}}
                                inventoryLines={displayInventoryLines}
                                eqLines={displayEqLines}
                                handleButtonClick={handleButtonClick}
                                triggerHaptic={triggerHaptic}
                                executeCommand={executeCommand}
                                pendingDrawerContainerRef={pendingDrawerContainerRef}
                                inlineCategories={inlineCategories}
                                entities={entities}
                                keywordOverrides={keywordOverrides}
                            />
                        )}
                    </div>
                )}

                {/* Unified Tab Bar for both orientations - Now at the bottom */}
                {!isKeyboardOpen && (gameState === 'playing' || gameState === 'account') && (
                    <div className="portrait-tab-bar">
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'stats' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('stats'); }}
                    >
                        <BarChart2 className="tab-icon" />
                        <span className="tab-text">Stats</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'character' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('character'); }}
                    >
                        <User className="tab-icon" />
                        <span className="tab-text">Char</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'players' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('players'); }}
                    >
                        <Users className="tab-icon" />
                        <span className="tab-text">Players</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'equipment' || ui.drawer === 'inventory' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('equipment'); }}
                    >
                        <Shield className="tab-icon" />
                        <span className="tab-text">Gear</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'none' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); toggleMap(); }}
                    >
                        <MapIcon className="tab-icon" />
                        <span className="tab-text">Map</span>
                    </div>
                    </div>
                )}
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
