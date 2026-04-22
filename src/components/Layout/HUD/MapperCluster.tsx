import React, { useState, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { GameContextType, UIContextType } from '../../../context/GameContext/types';
import { useMapper } from '../../../context/useMapper';
import { CloudFog, Map as MapIcon, User, Shield, Users, BarChart2, UtensilsCrossed, Droplets } from 'lucide-react';
import InputArea from '../../Controls/InputArea';
import { StatsDrawer } from '../../Drawers/StatsDrawer';
import { CharacterDrawer } from '../../Drawers/CharacterDrawer';
import { PlayersDrawer } from '../../Drawers/PlayersDrawer';
import { InventoryDrawer } from '../../Drawers/InventoryDrawer';
import CombatStatsPanel from '../../Combat/CombatStatsPanel';
import { UiPositions, SwipeDirection } from '../../../types';

interface MapperClusterProps {
    uiPositions: UiPositions;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: string, force?: boolean) => void;
    characterName: string;
    isMmapperMode: boolean;
    isMobile: boolean;
    mapperRef: React.RefObject<any>;
    dragState: { id: string; type: string; startX: number; startY: number } | null;
    isLandscape?: boolean;
    wasDraggingRef: React.MutableRefObject<boolean>;
    heldButton: any;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    input: string;
    setInput: (val: string) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: SwipeDirection) => void;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMmapperMode, isMobile, mapperRef,
    dragState, isLandscape, wasDraggingRef, heldButton, setHeldButton, setCommandPreview,
    input, setInput, handleSend, handleInputSwipe
}) => {
    const {
        triggerHaptic, showControls, viewport, btn, handleButtonClick, executeCommand, joystick,
        spatButtons, setSpatButtons, parley, setParley, whoList,
        statsLines, scoreLines,
        pendingDrawerContainerRef, inlineCategories, entities, keywordOverrides,
        env, isFoggy, gameState, currentTerrain
    } = useGame() as GameContextType;
    const { target, activePrompt, stats } = useVitals();
    const { 
        ui, setUI, setPopoverState, isLibraryOpen, setIsLibraryOpen,
        handleTabClick, toggleMap, displayInventoryLines, displayEqLines 
    } = useUI() as UIContextType;
    const { getLightingIcon, getWeatherIcon, lighting, weather } = env;
    const isExpanded = ui.mapExpanded || ui.peekingDrawer === 'map';
    const { isKeyboardOpen } = viewport;

    // Mobile DOCKED (Gutter) Mode
    const isReplaying = (useGame() as GameContextType).sessionMode === 'replay';
    
    // On mobile portrait, we show the gutter. On desktop/landscape, Mapper is in DrawerManager
    if (!isMobile || isLandscape || (gameState === 'disconnected' && !isReplaying)) {
        return null;
    }

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
                    padding: '0',
                    flexShrink: 0,
                    marginBottom: (isShown || ui.drawer !== 'none') ? '4px' : '0'
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
                {/* Environmental Status Icons — modified to include player vitals (hunger/thirst) */}
                {(lighting !== 'none' || weather !== 'none' || isFoggy || stats.conditions?.hungry || stats.conditions?.thirsty) && (
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
                        
                        {/* Hunger Indicator */}
                        {stats.conditions?.hungry && (
                            <UtensilsCrossed 
                                size={16} 
                                className="status-icon-pulse" 
                                style={{ color: '#fbbf24', opacity: 0.9 }} 
                            />
                        )}
                        
                        {/* Thirst Indicator */}
                        {stats.conditions?.thirsty && (
                            <Droplets 
                                size={16} 
                                className="status-icon-pulse" 
                                style={{ color: '#60a5fa', opacity: 0.9 }} 
                            />
                        )}
                    </div>
                )}

                {/* Combat Stats Panel Overlay for Portrait Mobile */}
                <div className="mobile-mapper-combat-overlay">
                    <CombatStatsPanel />
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
            {!isKeyboardOpen && gameState !== 'disconnected' && (
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
                        className={`desktop-edge-tab right ${ui.drawer === 'none' && !isShown ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); toggleMap(); }}
                    >
                        <MapIcon className="tab-icon" />
                        <span className="tab-text">Map</span>
                    </div>
                </div>
            )}
        </div>
    );
};
