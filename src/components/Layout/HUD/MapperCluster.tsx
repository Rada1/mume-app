import React from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { GameContextType, UIContextType } from '../../../context/GameContext/types';
import { CloudFog, Map as MapIcon, User, Shield, Users, UtensilsCrossed, Droplets } from 'lucide-react';
import InputArea from '../../Controls/InputArea';
import { UnifiedDrawerContent } from '../../Drawers/UnifiedDrawerContent';
import CombatStatsPanel from '../../Combat/CombatStatsPanel';
import { MapperRoomInfo } from '../../Mapper/MapperRoomInfo';
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
    heldButtonRef?: React.MutableRefObject<any>;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    input: string;
    setInput: (val: string) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: SwipeDirection) => void;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMmapperMode, isMobile, mapperRef,
    dragState, isLandscape, wasDraggingRef, heldButton, heldButtonRef, setHeldButton, setCommandPreview,
    input, setInput, handleSend, handleInputSwipe
}) => {
    const {
        triggerHaptic, viewport, btn, handleButtonClick, executeCommand, joystick,
        handleLogClick,
        spatButtons, setSpatButtons, parley, setParley, whoList,
        inlineCategories, env, isFoggy, gameState, currentTerrain,
    } = useGame() as GameContextType;
    const { target, activePrompt, stats, groupMembers } = useVitals();
    const {
        ui, setPopoverState,
        handleTabClick, toggleMap, displayInventoryLines, displayEqLines,
        whoLines, whereLines, infoLines, questLines, practiceLines,
        setWhoLines, setWhereLines,
        gearTab, setGearTab, playersTab, setPlayersTab, charTab, setCharTab
    } = useUI() as UIContextType;
    const { getLightingIcon, getWeatherIcon, lighting, weather } = env;
    const isExpanded = ui.mapExpanded;
    const { isKeyboardOpen } = viewport;

    // Mobile DOCKED (Gutter) Mode
    const isReplaying = (useGame() as GameContextType).sessionMode === 'replay';
    
    // On mobile portrait, we show the gutter. On desktop/landscape, Mapper is in DrawerManager
    if (!isMobile || isLandscape || (gameState === 'disconnected' && !isReplaying)) {
        return null;
    }

    const isShown = ui.mapExpanded && ui.drawer === 'none';
    
    return (
        <div
            className={`mobile-bottom-gutter ${isShown ? 'map-expanded' : ''}`}
            style={{
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '0'
            }}
        >
            {/* Map Area at the TOP */}
            <div
                className="mobile-mapper-touch-surface gutter-panel-card"
                style={{
                    display: isShown ? 'block' : 'none',
                    pointerEvents: isShown ? 'auto' : 'none',
                    opacity: isShown ? 1 : 0,
                    touchAction: 'none',
                    position: 'absolute',
                    inset: '0',
                    zIndex: 0
                }}
            >
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
                        
                        {stats.conditions?.hungry && (
                            <UtensilsCrossed 
                                size={16} 
                                className="status-icon-pulse" 
                                style={{ color: '#fbbf24', opacity: 0.9 }} 
                            />
                        )}
                        
                        {stats.conditions?.thirsty && (
                            <Droplets 
                                size={16} 
                                className="status-icon-pulse" 
                                style={{ color: '#60a5fa', opacity: 0.9 }} 
                            />
                        )}
                    </div>
                )}
                
                {/* Header Group: Room Info + Tactical Buttons */}
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 2800,
                    pointerEvents: 'none'
                }}>
                    <MapperRoomInfo />
                    
                    {/* Persistent Tactical Buttons - now below the room card */}
                    <div
                        className="mobile-tactical-buttons-persistent"
                        style={{
                            position: 'relative',
                            marginTop: '68px', // Increased space from room card
                            zIndex: 20,
                            overflow: 'visible',
                            pointerEvents: 'auto'
                        }}
                    >
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
                            heldButtonRef={heldButtonRef}
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
                </div>

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
                        handleTabClick('none' as any);
                    }}
                    heldButton={heldButton}
                    setHeldButton={setHeldButton}
                    setCommandPreview={setCommandPreview}
                />
            </div>

            {/* Drawer Area */}
            {!isShown && ui.drawer !== 'none' && (
                <div className="gutter-drawer-container gutter-panel-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div
                        className="gutter-drawer-content"
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                        onClick={handleLogClick as any}
                    >
                        <UnifiedDrawerContent
                            drawer={ui.drawer}
                            gearTab={gearTab}
                            setGearTab={setGearTab}
                            playersTab={playersTab}
                            setPlayersTab={setPlayersTab}
                            charTab={charTab}
                            setCharTab={setCharTab}
                            displayInventoryLines={displayInventoryLines}
                            displayEqLines={displayEqLines}
                            whoLines={whoLines}
                            whereLines={whereLines}
                            infoLines={infoLines}
                            questLines={questLines}
                            practiceLines={practiceLines}
                            groupMembers={groupMembers}
                            triggerHaptic={triggerHaptic}
                            executeCommand={executeCommand}
                            setWhoLines={setWhoLines}
                            setWhereLines={setWhereLines}
                        />
                    </div>
                </div>
            )}

            {/* Command Bar at the BOTTOM of the gutter */}
            <div
                className="mobile-gutter-input-wrapper"
                style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '8px 0 0 0',
                    flexShrink: 0,
                    marginBottom: '16px' // Moved up a touch
                }}
            >
                <InputArea
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    onSwipe={handleInputSwipe}
                    isMobile={isMobile}
                    isKeyboardOpen={viewport.isKeyboardOpen}
                    commandPreview={null}
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

            {/* Bottom Tab Bar */}
            {!isKeyboardOpen && gameState !== 'disconnected' && (
                <div className="portrait-tab-bar">
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
                        className={`desktop-edge-tab right ${ui.drawer === 'equipment' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('equipment'); }}
                    >
                        <Shield className="tab-icon" />
                        <span className="tab-text">Gear</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${isShown ? 'active' : ''}`}
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
