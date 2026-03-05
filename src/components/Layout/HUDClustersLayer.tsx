import React from 'react';
import { GameButton } from '../GameButton';
import { useGame } from '../../context/GameContext';
import { Plus, X } from 'lucide-react';
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
    const { stats, inCombat, characterName, isMmapperMode, btn, joystick, mapperRef, target, triggerHaptic, executeCommand, handleButtonClick, setPopoverState, viewport, activePrompt, showControls } = useGame();
    const { isMobile, isLandscape } = viewport;

    const effectiveShowControls = showControls;
    const handleWimpyChange = (val: number) => executeCommand(`wimpy ${val}`);

    return (
        <>
            <MapperCluster
                uiPositions={btn.uiPositions}
                isEditMode={btn.isEditMode}
                handleDragStart={handleDragStart}
                characterName={characterName || ''}
                isMmapperMode={isMmapperMode}
                isMobile={isMobile}
                mapperRef={mapperRef}
                stats={stats}
                inCombat={inCombat}
                handleWimpyChange={handleWimpyChange}
                isLandscape={isLandscape}
            />

            <StatsCluster uiPositions={btn.uiPositions} isEditMode={btn.isEditMode} dragState={btn.dragState} handleDragStart={handleDragStart} stats={stats} inCombat={inCombat} handleWimpyChange={handleWimpyChange} isLandscape={isLandscape} isMobile={isMobile} />

            {(effectiveShowControls || btn.isEditMode) && (
                <>
                    <div className="custom-buttons-layer">
                        {btn.buttons.filter(b => (b.setId === btn.activeSet && b.setId !== 'Xbox' && b.display !== 'inline') && (btn.isEditMode || b.isVisible !== false)).map(button => (
                            <GameButton key={button.id} button={button} isEditMode={btn.isEditMode} isGridEnabled={btn.isGridEnabled} gridSize={btn.gridSize} isSelected={btn.selectedButtonIds.has(button.id)} dragState={btn.dragState} handleDragStart={handleDragStart} handleButtonClick={handleButtonClick} wasDraggingRef={wasDraggingRef} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} setEditButton={(b) => { btn.setEditingButtonId(b.id); if (!btn.selectedButtonIds.has(b.id)) btn.setSelectedIds(new Set([b.id])); }} activePrompt={activePrompt} executeCommand={executeCommand} setCommandPreview={setCommandPreview} setHeldButton={setHeldButton} heldButton={heldButton} joystick={{ isActive: joystick.joystickActive, currentDir: joystick.currentDir, isTargetModifierActive: joystick.isTargetModifierActive, setIsJoystickConsumed: joystick.setIsJoystickConsumed }} target={target} setActiveSet={btn.setActiveSet} setButtons={btn.setButtons} />
                        ))}
                    </div>

                    <JoystickCluster uiPositions={btn.uiPositions} isEditMode={btn.isEditMode} dragState={btn.dragState} handleDragStart={handleDragStart} joystick={joystick} joystickGlow={joystickGlow} btnGlow={btnGlow} setJoystickGlow={setJoystickGlow} setBtnGlow={setBtnGlow} executeCommand={executeCommand} triggerHaptic={triggerHaptic} heldButton={heldButton} setHeldButton={setHeldButton} buttons={btn.buttons} target={target} setActiveSet={btn.setActiveSet} setPopoverState={setPopoverState} setCommandPreview={setCommandPreview} />

                    <XboxCluster uiPositions={btn.uiPositions} isEditMode={btn.isEditMode} handleDragStart={handleDragStart} buttons={btn.buttons} selectedButtonIds={btn.selectedButtonIds} dragState={btn.dragState} handleButtonClick={handleButtonClick} wasDraggingRef={wasDraggingRef} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} setEditingButtonId={btn.setEditingButtonId} setSelectedIds={btn.setSelectedIds} activePrompt={activePrompt} executeCommand={executeCommand} setCommandPreview={setCommandPreview} heldButton={heldButton} setHeldButton={setHeldButton} joystick={joystick} target={target} isGridEnabled={btn.isGridEnabled} gridSize={btn.gridSize} setActiveSet={btn.setActiveSet} setButtons={btn.setButtons} isMobile={isMobile} isLandscape={isLandscape} />
                </>
            )}


            {btn.isEditMode && (
                <>
                    <div className="add-btn-fab" onClick={(e) => { e.stopPropagation(); btn.createButton(); }} style={{ zIndex: 2000 }}><Plus size={32} /></div>
                    <div className="exit-design-mode-fab" onClick={() => btn.setIsEditMode(false)} title="Exit Design Mode" style={{ zIndex: 2000 }}><X size={32} /></div>
                </>
            )}
        </>
    );
};
