import React from 'react';
import { GameButton } from '../Controls/GameButton/GameButton';
import { useGame } from '../../context/GameContext';
import { Plus, X, RotateCcw } from 'lucide-react';
import { MapperCluster } from './HUD/MapperCluster';
import { StatsCluster } from './HUD/StatsCluster';
import { JoystickCluster } from './HUD/JoystickCluster';
import { XboxCluster } from './HUD/XboxCluster';

interface HUDClustersLayerProps {
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
    wasDraggingRef: React.MutableRefObject<boolean>;
    commandPreview: string | null;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton: any;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    joystickGlow: boolean;
    setJoystickGlow: React.Dispatch<React.SetStateAction<boolean>>;
    btnGlow: { up: boolean, down: boolean };
    setBtnGlow: React.Dispatch<React.SetStateAction<{ up: boolean, down: boolean }>>;
}

export const HUDClustersLayer: React.FC<HUDClustersLayerProps> = ({
    handleDragStart, wasDraggingRef, commandPreview, setCommandPreview, heldButton, setHeldButton, joystickGlow, setJoystickGlow, btnGlow, setBtnGlow
}) => {
    const { characterName, isMmapperMode, btn, joystick, mapperRef, target, triggerHaptic, executeCommand, handleButtonClick, setPopoverState, viewport, activePrompt, showControls } = useGame();
    const { isMobile, isLandscape, logFontSize, resetLogFontSize, isKeyboardOpen } = viewport;

    const effectiveShowControls = showControls && (!isMobile || !isKeyboardOpen || btn.isEditMode);

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
            <div className="hud-clusters">
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
                />

                <StatsCluster uiPositions={btn.uiPositions} isEditMode={btn.isEditMode} dragState={btn.dragState} handleDragStart={handleDragStart} isLandscape={isLandscape} isMobile={isMobile} />

                {(effectiveShowControls || btn.isEditMode) && (
                    <XboxCluster uiPositions={btn.uiPositions} isEditMode={btn.isEditMode} handleDragStart={handleDragStart} buttons={btn.buttons} selectedButtonIds={btn.selectedButtonIds} dragState={btn.dragState} handleButtonClick={handleButtonClick} wasDraggingRef={wasDraggingRef} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} setEditingButtonId={btn.setEditingButtonId} setSelectedIds={btn.setSelectedIds} activePrompt={activePrompt} executeCommand={executeCommand} setCommandPreview={setCommandPreview} heldButton={heldButton} setHeldButton={setHeldButton} joystick={joystick} target={target} isGridEnabled={btn.isGridEnabled} gridSize={btn.gridSize} setActiveSet={btn.setActiveSet} setButtons={btn.setButtons} isMobile={isMobile} isLandscape={isLandscape} />
                )}

                {(effectiveShowControls || btn.isEditMode) && (
                    <>
                        <div className="custom-buttons-layer">
                            {btn.buttons.filter(b => {
                                const isFromActiveSet = b.setId === btn.activeSet;
                                const isXbox = b.setId === 'Xbox';
                                const isInline = b.display === 'inline';
                                const isTriggered = b.isVisible === true && b.trigger?.enabled;
                                
                                if (isXbox || isInline) return false;
                                if (btn.isEditMode) return isFromActiveSet;
                                return isFromActiveSet || isTriggered;
                            }).map(button => (
                                <GameButton key={button.id} button={button} isEditMode={btn.isEditMode} isGridEnabled={btn.isGridEnabled} gridSize={btn.gridSize} isSelected={btn.selectedButtonIds.has(button.id)} dragState={btn.dragState} handleDragStart={handleDragStart} handleButtonClick={handleButtonClick} wasDraggingRef={wasDraggingRef} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} setEditButton={(b) => { btn.setEditingButtonId(b.id); if (!btn.selectedButtonIds.has(b.id)) btn.setSelectedIds(new Set([b.id])); }} activePrompt={activePrompt} executeCommand={executeCommand} setCommandPreview={setCommandPreview} setHeldButton={setHeldButton} heldButton={heldButton} joystick={{ isActive: joystick.joystickActive, currentDir: joystick.currentDir, isTargetModifierActive: joystick.isTargetModifierActive, setIsJoystickConsumed: joystick.setIsJoystickConsumed }} target={target} setActiveSet={btn.setActiveSet} setButtons={btn.setButtons} isMobile={isMobile} />
                            ))}
                        </div>

                        <JoystickCluster uiPositions={btn.uiPositions} isEditMode={btn.isEditMode} dragState={btn.dragState} handleDragStart={handleDragStart} joystick={joystick} joystickGlow={joystickGlow} btnGlow={btnGlow} setJoystickGlow={setJoystickGlow} setBtnGlow={setBtnGlow} executeCommand={executeCommand} triggerHaptic={triggerHaptic} heldButton={heldButton} setHeldButton={setHeldButton} buttons={btn.buttons} target={target} setActiveSet={btn.setActiveSet} setPopoverState={setPopoverState} setCommandPreview={setCommandPreview} />
                    </>
                )}
            </div>


            {btn.isEditMode && (
                <>
                    <div className="add-btn-fab" onClick={(e) => { e.stopPropagation(); btn.createButton(); }} style={{ zIndex: 2000 }}><Plus size={32} /></div>
                    <div className="exit-design-mode-fab" onClick={() => btn.setIsEditMode(false)} title="Exit Design Mode" style={{ zIndex: 2000 }}><X size={32} /></div>
                </>
            )}
        </>
    );
};
