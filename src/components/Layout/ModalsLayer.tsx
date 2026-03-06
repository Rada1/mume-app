import React from 'react';
import SettingsModal from '../SettingsModal';
import EditButtonModal from '../EditButtonModal';
import SetManagerModal from '../SetManagerModal';
import { PopoverManager } from '../Popovers/PopoverManager';
import { DrawerManager } from '../Drawers/DrawerManager';
import { useGame } from '../../context/GameContext';
import { OnboardingOverlay } from '../OnboardingOverlay';

interface ModalsLayerProps {
    isLoading: boolean;
    returnToManager: boolean;
    setReturnToManager: (val: boolean) => void;
    managerSelectedSet: string | null;
    setManagerSelectedSet: (val: string | null) => void;
    connect: () => void;
}

export const ModalsLayer: React.FC<ModalsLayerProps> = ({
    isLoading,
    returnToManager,
    setReturnToManager,
    managerSelectedSet,
    setManagerSelectedSet,
    connect
}) => {
    const {
        isSettingsOpen,
        setIsSettingsOpen,
        settingsTab,
        setSettingsTab,
        connectionUrl,
        setConnectionUrl,
        bgImage,
        setBgImage,
        handleFileUpload,
        exportSettings,
        exportSettingsFile,
        importSettings,
        loginName,
        setLoginName,
        loginPassword,
        setLoginPassword,
        soundTriggers,
        setSoundTriggers,
        newSoundPattern,
        setNewSoundPattern,
        newSoundRegex,
        setNewSoundRegex,
        handleSoundUpload,
        btn,
        ui,
        setUI,
        setIsSetManagerOpen,
        inventoryLines,
        statsLines,
        eqLines,
        executeCommand,
        handleButtonClick,
        teleportTargets,
        setTarget,
        setTeleportTargets,
        roomPlayers,
        triggerHaptic,
        popoverState,
        setPopoverState,
        addMessage,
        setSettings,
        autoConnect,
        setAutoConnect,
        hasSeenOnboarding
    } = useGame() as any;

    const popoverRef = React.useRef<HTMLDivElement>(null);

    // Global click-outside to close popovers
    React.useEffect(() => {
        const handleClickOutside = (event: PointerEvent) => {
            if (!popoverState) return;
            const target = event.target as Node;

            // Don't close if clicking inside the popover
            if (popoverRef.current && popoverRef.current.contains(target)) return;

            // Also check for Dial Menu (it doesn't use popoverRef directly)
            if (popoverState.menuDisplay === 'dial') {
                const dialOverlay = document.querySelector('.dial-menu-overlay');
                const dialCenter = document.querySelector('.dial-menu-center');
                if (dialCenter && dialCenter.contains(target)) return;
                // If it's a dial overlay itself, the DialMenu logic will handle it, 
                // but we might want to shut it down here too if it's "outside".
                if (dialOverlay && !dialOverlay.contains(target)) {
                    setPopoverState(null);
                }
            } else {
                setPopoverState(null);
            }
        };

        window.addEventListener('pointerdown', handleClickOutside, { capture: true });
        return () => window.removeEventListener('pointerdown', handleClickOutside, { capture: true });
    }, [popoverState, setPopoverState]);

    return (
        <>
            {isSettingsOpen && (


                <SettingsModal
                    connectionUrl={connectionUrl}
                    setConnectionUrl={setConnectionUrl}
                    bgImage={bgImage}
                    setBgImage={setBgImage}
                    handleFileUpload={handleFileUpload}
                    exportSettings={() => exportSettingsFile(btn.rawButtons)}
                    importSettings={(e) => importSettings(e, setIsSettingsOpen)}
                    isLoading={isLoading}
                    newSoundPattern={newSoundPattern}
                    setNewSoundPattern={setNewSoundPattern}
                    newSoundRegex={newSoundRegex}
                    setNewSoundRegex={setNewSoundRegex}
                    handleSoundUpload={handleSoundUpload}
                    soundTriggers={soundTriggers}
                    setSoundTriggers={setSoundTriggers}
                    resetButtons={btn.resetToDefaults}
                    connect={connect}
                    loginName={loginName}
                    setLoginName={setLoginName}
                    loginPassword={loginPassword}
                    setLoginPassword={setLoginPassword}
                    autoConnect={autoConnect}
                    setAutoConnect={setAutoConnect}
                />
            )}

            {btn.editingButtonId && (() => {
                const editingButton = btn.rawButtons.find(b => b.id === btn.editingButtonId);
                if (!editingButton) return null;
                return (
                    <EditButtonModal
                        editingButton={editingButton}
                        setEditingButtonId={btn.setEditingButtonId}
                        deleteButton={btn.deleteButton}
                        setButtons={btn.setButtons}
                        availableSets={btn.availableSets}
                        selectedButtonIds={btn.selectedButtonIds}
                    />
                );
            })()}

            {btn.isEditMode && btn.isGridEnabled && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 5,
                    backgroundImage: `
                        linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: `${btn.gridSize}% ${btn.gridSize}%`
                }} />
            )}

            {ui.setManagerOpen && (
                <SetManagerModal
                    buttons={btn.rawButtons}
                    availableSets={btn.availableSets}
                    onClose={() => setIsSetManagerOpen(false)}
                    onEditButton={(id, currentSet) => {
                        setManagerSelectedSet(currentSet);
                        setReturnToManager(true);
                        setIsSetManagerOpen(false);
                        btn.setEditingButtonId(id);
                    }}
                    onDeleteButton={btn.deleteButton}
                    onDeleteSet={btn.deleteSet}
                    onCreateButton={btn.createButton}
                    combatSet={btn.combatSet}
                    defaultSet={btn.defaultSet}
                    onSetCombatSet={btn.setCombatSet}
                    onSetDefaultSet={btn.setDefaultSet}
                    lastSelectedSet={managerSelectedSet}
                    onSelectedSetChange={setManagerSelectedSet}
                    isGridEnabled={btn.isGridEnabled}
                    onToggleGrid={btn.setIsGridEnabled}
                    gridSize={btn.gridSize}
                    onGridSizeChange={btn.setGridSize}
                    isSmartPopulateEnabled={btn.isSmartPopulateEnabled}
                    onToggleSmartPopulate={btn.setIsSmartPopulateEnabled}
                    setSettings={btn.setSettings}
                    setSetSettings={btn.setSetSettings}
                />
            )}

            <PopoverManager
                popoverState={popoverState}
                setPopoverState={setPopoverState}
                popoverRef={popoverRef}
                buttons={btn.buttons}
                setButtons={btn.setButtons}
                availableSets={btn.availableSets}
                executeCommand={executeCommand}
                addMessage={addMessage}
                setTarget={setTarget}
                teleportTargets={teleportTargets}
                setTeleportTargets={setTeleportTargets}
                handleButtonClick={handleButtonClick}
                triggerHaptic={triggerHaptic}
                roomPlayers={roomPlayers}
                setSettings={setSettings || {}}
            />

            <DrawerManager
                ui={ui}
                setUI={setUI}
                inventoryLines={inventoryLines}
                statsLines={statsLines}
                eqLines={eqLines}
                executeCommand={executeCommand}
                handleButtonClick={handleButtonClick}
                loginName={loginName}
                setLoginName={setLoginName}
                loginPassword={loginPassword}
                setLoginPassword={setLoginPassword}
                bgImage={bgImage}
                handleFileUpload={handleFileUpload}
                soundTriggers={soundTriggers}
                newSoundPattern={newSoundPattern}
                setNewSoundPattern={setNewSoundPattern}
                newSoundRegex={newSoundRegex}
                setNewSoundRegex={setNewSoundRegex}
                handleSoundUpload={handleSoundUpload}
                setSoundTriggers={setSoundTriggers}
            />

            {!hasSeenOnboarding && status === 'connected' && (
                <OnboardingOverlay />
            )}
        </>
    );
};
