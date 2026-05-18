import React from 'react';
import SettingsModal from '../Modals/SettingsModal';
import EditButtonModal from '../Modals/EditButtonModal';
import SetManagerModal from '../Modals/SetManagerModal';
import { PopoverManager } from '../Popovers/PopoverManager';
import { DrawerManager } from '../Drawers/DrawerManager';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { KeywordEditModal } from '../Modals/KeywordEditModal';
import { LibraryModal } from '../Modals/LibraryModal';


import { useSettingsStore } from '../../stores/useSettingsStore';

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
        inlineCategories,
        setInlineCategories,
        customTraits,
        setCustomTraits,
        connectionUrl,
        setConnectionUrl,
        bgImage,
        setBgImage,
        bgImageBottom,
        setBgImageBottom,
        handleFileUpload,
        handleBottomFileUpload,
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
        displayInventoryLines,
        statsLines,
        scoreLines,
        displayEqLines,
        executeCommand,
        handleButtonClick,
        teleportTargets,
        setTeleportTargets,
        roomPlayers,
        roomNpcs,
        roomItems,
        entities,
        registerEntity,
        selectedObjectIds,
        clearObjectSelection,
        triggerHaptic,
        addMessage,
        setSettings,
        autoConnect,
        setAutoConnect,
        showDebugEchoes,
        setShowDebugEchoes,
        status,
        uiMode,
        setUiMode,
        disableSmoothScroll,
        setDisableSmoothScroll,
        isImmersionMode,
        setIsImmersionMode,
        favorites,
        setFavorites,
        objectColor,
        playerColor,
        npcColor,
        roomColor,
        isBloomEnabled,
        setIsBloomEnabled,
        showSpectatePromptInLog,
        setShowSpectatePromptInLog,
        isTimestampEnabled,
        setIsTimestampEnabled,
        isTextRevealEnabled,
        setIsTextRevealEnabled,
        autoSaveSessions,
        setAutoSaveSessions,
        parley,
        setParley,
        whoList,
        refreshLogHighlights,
        practice,
        openKeywordEdit,
        keywordEditState, setKeywordEditState,
        setKeywordOverride, removeKeywordOverride,
        keywordOverrides,
        keywordFailureBanner, setKeywordFailureBanner,
        gameState,
        accountState,
        setAccountState,
        viewport,
        fontFamily,
        setFontFamily,
        characterInfo,
    } = useGame() as any;

    const { setTarget } = useVitals();

    const {
        isSettingsOpen,
        setIsSettingsOpen,
        settingsTab,
        setSettingsTab,
        isLibraryOpen,
        setIsLibraryOpen,
        setIsSetManagerOpen,
        popoverState,
        setPopoverState,
        ui,
        setUI,
        handleTabClick,
        setGearTab,
        setPlayersTab,
        setCharTab
    } = useUI();

    const popoverRef = React.useRef<HTMLDivElement>(null);

    // Global click-outside to close popovers
    React.useEffect(() => {
        const handleClickOutside = (event: PointerEvent) => {
            if (!popoverState) return;
            const target = event.target as Node;

            // Don't close if clicking inside the popover
            // Don't close if clicking inside the popover or on an inline button
            if (popoverRef.current && popoverRef.current.contains(target)) return;
            if (target instanceof HTMLElement && target.closest('.inline-btn')) return;

            // Dial menus use a different overlay logic, but we still need to prevent execution
            if (popoverState.menuDisplay === 'dial') {
                const dialOverlay = document.querySelector('.dial-menu-overlay');
                const dialCenter = document.querySelector('.dial-menu-center');
                if (dialCenter && dialCenter.contains(target)) return;
                if (dialOverlay && !dialOverlay.contains(target)) {
                    (window as any).popoverIsClosing = true;
                    setPopoverState(null);
                    setTimeout(() => { (window as any).popoverIsClosing = false; }, 300);
                }
            } else {
                (window as any).popoverIsClosing = true;
                setPopoverState(null);
                setTimeout(() => { (window as any).popoverIsClosing = false; }, 300);
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
                    bgImageBottom={bgImageBottom}
                    setBgImageBottom={setBgImageBottom}
                    handleFileUpload={handleFileUpload}
                    handleBottomFileUpload={handleBottomFileUpload}
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
                    showDebugEchoes={showDebugEchoes}
                    setShowDebugEchoes={setShowDebugEchoes}
                    uiMode={uiMode}
                    setUiMode={setUiMode}
                    disableSmoothScroll={disableSmoothScroll}
                    setDisableSmoothScroll={setDisableSmoothScroll}
                    isImmersionMode={isImmersionMode}
                    setIsImmersionMode={setIsImmersionMode}
                    isBloomEnabled={isBloomEnabled}
                    setIsBloomEnabled={setIsBloomEnabled}
                    isTimestampEnabled={isTimestampEnabled}
                    setIsTimestampEnabled={setIsTimestampEnabled}
                    isTextRevealEnabled={isTextRevealEnabled}
                    setIsTextRevealEnabled={setIsTextRevealEnabled}
                    autoSaveSessions={autoSaveSessions}
                    setAutoSaveSessions={setAutoSaveSessions}
                    fontFamily={fontFamily}
                    setFontFamily={setFontFamily}
                    showSpectatePromptInLog={showSpectatePromptInLog}
                    setShowSpectatePromptInLog={setShowSpectatePromptInLog}
                    isEditMode={btn.isEditMode}
                    setIsEditMode={btn.setIsEditMode}
                    isGridEnabled={btn.isGridEnabled}
                    setIsGridEnabled={btn.setIsGridEnabled}
                    createButton={btn.createButton}
                    setIsSetManagerOpen={setIsSetManagerOpen}
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
                    inlineCategories={inlineCategories}
                    setInlineCategories={setInlineCategories}
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
                roomNpcs={roomNpcs}
                roomItems={roomItems}
                inventoryLines={displayInventoryLines}
                eqLines={displayEqLines}
                setSettings={setSettings || {}}
                inlineCategories={inlineCategories}
                setInlineCategories={setInlineCategories}
                customTraits={customTraits}
                setCustomTraits={setCustomTraits}
                favorites={favorites}
                setFavorites={setFavorites}
                parley={parley}
                setParley={setParley}
                whoList={whoList}
                refreshLogHighlights={refreshLogHighlights}
                practice={practice}
                openKeywordEdit={openKeywordEdit}
                entities={entities}
                registerEntity={registerEntity}
                selectedObjectIds={selectedObjectIds}
                clearObjectSelection={clearObjectSelection}
                keywordOverrides={keywordOverrides}
                accountState={accountState}
                setAccountState={setAccountState}
                characterInfo={characterInfo}
                handleTabClick={handleTabClick}
                setGearTab={setGearTab}
                setPlayersTab={setPlayersTab}
                setCharTab={setCharTab}
                playerColor={playerColor}
                npcColor={npcColor}
                objectColor={objectColor}
                roomColor={roomColor}
            />




            {keywordEditState && (
                <KeywordEditModal
                    context={keywordEditState.context}
                    displayText={keywordEditState.displayText}
                    currentKeyword={keywordOverrides?.[keywordEditState.context] ?? keywordEditState.context}
                    hasOverride={!!(keywordOverrides?.[keywordEditState.context])}
                    onSave={(kw: string) => { setKeywordOverride(keywordEditState.context, kw); setKeywordEditState(null); }}
                    onReset={() => { removeKeywordOverride(keywordEditState.context); setKeywordEditState(null); }}
                    onClose={() => setKeywordEditState(null)}
                />
            )}

            {keywordFailureBanner && (
                <div
                    style={{
                        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,180,50,0.5)',
                        color: 'rgba(255,200,80,1)', padding: '10px 18px', borderRadius: 10,
                        fontSize: '0.85rem', zIndex: 50000, cursor: 'pointer', maxWidth: 320,
                        textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
                    }}
                    onClick={() => { openKeywordEdit(keywordFailureBanner.context, keywordFailureBanner.displayText); setKeywordFailureBanner(null); }}
                >
                    ⚠ Keyword "{keywordFailureBanner.context}" not found — tap to fix
                </div>
            )}

            {isLibraryOpen && (
                <LibraryModal
                    isOpen={isLibraryOpen}
                    onClose={() => setIsLibraryOpen(false)}
                />
            )}

        </>
    );
};
