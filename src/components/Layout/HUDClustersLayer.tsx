import { GameButton } from "../Controls/GameButton/GameButton";

import { DpadCluster } from "../Mapper/DpadCluster";

import React, { useState, useEffect } from 'react';
import { Plus, X, RotateCcw, Grid } from 'lucide-react';
import { MapperCluster } from './HUD/MapperCluster';
import { GridOverlay } from '../Grid/GridOverlay';
import { StatsCluster } from './HUD/StatsCluster';
import { LineCluster } from './HUD/LineCluster';
import { ReplayHUD } from './HUD/ReplayHUD';
import { SpectateQueueHUD } from './HUD/SpectateQueueHUD';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { MumeEditor } from '../Utility/MumeEditor';

interface HUDClustersLayerProps {
    handleDragStart: (e: React.PointerEvent, id: string, type: string, force?: boolean) => void;
    wasDraggingRef: React.MutableRefObject<boolean>;
    commandPreview: string | null;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton: any;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    btnGlow: { up: boolean, down: boolean };
    setBtnGlow: React.Dispatch<React.SetStateAction<{ up: boolean, down: boolean }>>;
    input: string;
    setInput: (val: string) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: any) => void;
}

export const HUDClustersLayer: React.FC<HUDClustersLayerProps> = ({
    handleDragStart, wasDraggingRef, commandPreview, setCommandPreview, heldButton, setHeldButton, btnGlow, setBtnGlow,
    input, setInput, handleSend, handleInputSwipe
}) => {
    const { characterName, isMmapperMode, btn, joystick, mapperRef, triggerHaptic, executeCommand, handleButtonClick, viewport, showControls, showLegacyButtons, gameState, sessionMode } = useGame();
    const { target, stats, activePrompt } = useVitals();
    const { setPopoverState } = useUI();
    const { isMobile, isLandscape, logFontSize, resetLogFontSize, isKeyboardOpen } = viewport;

    const effectiveShowControls = showControls && (!isMobile || !isKeyboardOpen || btn.isEditMode);
    const isReplaying = sessionMode === 'replay';

    return (
        <>
            {isMobile && logFontSize !== 1.0 && (
                <div
                    className="reset-zoom-fab"
                    onClick={() => {
                        triggerHaptic(25);
                        resetLogFontSize();
                    }}
                    title="Reset Font Size"
                >
                    <RotateCcw size={20} />
                </div>
            )}

            <GridOverlay isEditMode={btn.isEditMode} isGridEnabled={btn.isGridEnabled} gridSize={btn.gridSize} />

            {(isMobile && (gameState !== 'disconnected' || isReplaying)) && (
                <MapperCluster
                    uiPositions={btn.uiPositions}
                    isEditMode={btn.isEditMode}
                    handleDragStart={handleDragStart}
                    characterName={characterName || ''}
                    isMmapperMode={isMmapperMode}
                    isMobile={isMobile}
                    mapperRef={mapperRef}
                    dragState={btn.dragState}
                    isLandscape={isLandscape}
                    wasDraggingRef={wasDraggingRef}
                    heldButton={heldButton}
                    setHeldButton={setHeldButton}
                    setCommandPreview={setCommandPreview}
                    input={input}
                    setInput={setInput}
                    handleSend={handleSend}
                    handleInputSwipe={handleInputSwipe}
                />
            )}

            <div className="hud-clusters-absolute-layer">


                {(effectiveShowControls || btn.isEditMode) && gameState !== 'disconnected' && (
                    <>
                        {/* LineCluster is rendered beside the log in MainContentLayer on desktop.
                            Here we only render it for landscape/mobile overlay modes. */}
                        {(isLandscape) && (
                            <div className={`line-cluster-container ${(!showControls || isKeyboardOpen) && !btn.isEditMode ? 'hud-hidden' : ''}`}>
                                <LineCluster
                                    isEditMode={btn.isEditMode}
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
                                    activePrompt={activePrompt as any}
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
                        )}

                        <div className="custom-buttons-layer">
                            {btn.buttons.filter(b => {
                                const isFromActiveSet = b.setId === btn.activeSet;
                                const isTactical = b.setId === 'Tactical';
                                const isInline = b.display === 'inline';
                                const isTriggered = b.isVisible === true && b.trigger?.enabled;
                                const isRogue = ['Score', 'Inv', 'Look', 'Combat', 'Set'].includes(b.label || '');

                                if (isTactical || isInline || isRogue) return false;
                                if (btn.isEditMode) return isFromActiveSet;
                                return isFromActiveSet || isTriggered;
                            }).map(button => (
                                <GameButton key={button.id} button={button} isEditMode={btn.isEditMode} isGridEnabled={btn.isGridEnabled} gridSize={btn.gridSize} isSelected={btn.selectedButtonIds.has(button.id)} dragState={btn.dragState} handleDragStart={handleDragStart} handleButtonClick={handleButtonClick} wasDraggingRef={wasDraggingRef} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} setEditButton={(b) => { btn.setEditingButtonId(b.id); if (!btn.selectedButtonIds.has(b.id)) btn.setSelectedIds(new Set([b.id])); }} activePrompt={activePrompt as any} executeCommand={executeCommand} setCommandPreview={setCommandPreview} setHeldButton={setHeldButton} heldButton={heldButton} joystick={{ isActive: joystick.joystickActive, currentDir: joystick.currentDir, isTargetModifierActive: joystick.isTargetModifierActive, setIsJoystickConsumed: joystick.setIsJoystickConsumed }} target={target} setActiveSet={btn.setActiveSet} setButtons={btn.setButtons} isMobile={isMobile} />
                            ))}
                        </div>
                    </>
                )}
            </div>


            {btn.isEditMode && (
                <>
                    <div className="grid-toggle-fab" onClick={(e) => { e.stopPropagation(); btn.setIsGridEnabled(!btn.isGridEnabled); }} title="Toggle Grid" style={{ zIndex: 2000 }}>
                        <Grid size={24} color={btn.isGridEnabled ? 'var(--accent)' : '#fff'} />
                    </div>
                    <div className="add-btn-fab" onClick={(e) => { e.stopPropagation(); btn.createButton(); }} style={{ zIndex: 2000 }}><Plus size={32} /></div>
                    <div className="exit-design-mode-fab" onClick={() => btn.setIsEditMode(false)} title="Exit Design Mode" style={{ zIndex: 2000 }}><X size={32} /></div>
                </>
            )}

            <SpectateQueueHUD />
            <ReplayHUD />
            <MumeEditor />
        </>
    );
};
