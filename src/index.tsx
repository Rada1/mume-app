import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';

import './index.css';
import './components/Messages/MessageLog.css';
import './components/Controls/Stats.css';
import './components/Controls/CustomButtons.css';
import './components/Controls/SwipeWheel.css';
import './components/Controls/Landscape.css';
import './components/Drawers/Drawers.css';
import './components/Modals/Modals.css';
import './components/css/Popovers.css';
import './components/css/HelpGuides.css';
import './components/css/PremiumSwitch.css';
import './styles/effects.css';

import { MainContentLayer } from './components/Layout/MainContentLayer';
import { HUDClustersLayer } from './components/Layout/HUDClustersLayer';
import { DrawerManager } from './components/Drawers/DrawerManager';
import { ModalsLayer } from './components/Layout/ModalsLayer';
import { AtmosphericLayer } from './components/Layout/AtmosphericLayer';
import ErrorBoundary from './components/Utility/ErrorBoundary';
import { GameProvider, useGame, useUI, useVitals, useLog } from './context/GameContext';
import { MapperProvider } from './context/MapperContext';
import { SpatButtons } from './components/Controls/SpatButtons';
import { useSpatButtons } from './hooks/useSpatButtons';
import SwipeFeedbackOverlay from './components/Overlay/SwipeFeedbackOverlay';
import ObjectDragOverlay from './components/Overlay/ObjectDragOverlay';
import { AgentHUD } from './components/Utility/AgentHUD';
import { PerfHUD } from './components/Utility/PerfHUD';
import { useSettingsStore } from './stores/useSettingsStore';
import { useDisplayMode } from './hooks/useDisplayMode';
import { normalizeTerrain } from './utils/terrainUtils';
import { toThemeLinkedColor } from './utils/themeLinkedColors';
import { Analytics } from '@vercel/analytics/react';


// Note: numToWord, pluralize*, ARRIVE_REGEX etc. have been moved to src/hooks/useMessageLog.ts
import { useEffectTimerStore } from './stores/useEffectTimerStore';
import { useVitalsStore } from './stores/useVitalsStore';

if (typeof window !== 'undefined') {
    (window as any).useEffectTimerStore = useEffectTimerStore;
    (window as any).useVitalsStore = useVitalsStore;
}


const MudClient = () => {
    const {
        theme,
        accentColor,
        isLoading,
        telnet,
        btn,
        editor,
        containerRef,
        viewport,
        handleSend,
        handleInputSwipe,
        triggerHaptic,
        executeCommand,
        handleLogClick,
        handleLogDoubleClick,
        handleLogPointerDown,
        handleLogPointerUp,
        env,
        mumeEditState,
        setMumeEditState,
        isBloomEnabled,
        isImmersionMode,
        inCombat,
        isNewbieMode,
        commandPreview,
        setCommandPreview,
        gameState,
        currentTerrain
    } = useGame();

    const { rumble, setTarget, heldButton, heldButtonRef, setHeldButton } = useVitals();
    const { setIsSetManagerOpen, popoverState, setUI, ui, setManagerSelectedSet } = useUI();
    const { addMessage } = useLog();

    const { isMobile, isKeyboardOpen, isLandscape, scrollContainerRef } = viewport;
    const displayMode = useDisplayMode();

    const [btnGlow, setBtnGlow] = useState({ up: false, down: false });
    const [returnToManager, setReturnToManager] = useState(false);

    const { handleDragStart, wasDraggingRef } = editor;

    const { spatButtons, setSpatButtons } = useSpatButtons(scrollContainerRef, triggerHaptic);

    // --- Global Mobile Focus Fix ---
    // This is the most aggressive way to prevent the "stuck focus" keyboard pop-up bug.
    // We listen for any touchstart on the entire document. If the touch is NOT on the input field,
    // we immediately blur the input field. This happens BEFORE the click/pointer events fire,
    // preventing the OS from thinking the user is interacting with a focused input.
    useEffect(() => {
        if (!isMobile) return;

        const handleGlobalTouch = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            // Don't blur if the user is actually trying to type, click the prompt, or interact with an active button
            if (
                target.tagName === 'INPUT' || 
                target.classList.contains('cmd-prompt') || 
                target.closest('.input-form') ||
                target.closest('.inline-btn') ||
                target.closest('.popover-item') ||
                target.closest('.message-log') ||
                target.closest('.message-log-container')
            ) {
                return;
            }

            const inputEl = document.querySelector('.input-field') as HTMLInputElement;
            if (inputEl && document.activeElement === inputEl) {
                // We use requestAnimationFrame to ensure the blur happens 
                // at the very start of the interaction cycle.
                requestAnimationFrame(() => {
                    inputEl.blur();
                    console.log('[Global] Force blurred input to prevent keyboard pop');
                });
            }
        };

        document.addEventListener('touchstart', handleGlobalTouch, { passive: true, capture: true });
        return () => {
            document.removeEventListener('touchstart', handleGlobalTouch, { capture: true });
        };
    }, [isMobile]);

    const { objectColor, playerColor, npcColor, targetColor, theme: settingsTheme, fontFamily } = useSettingsStore();

    useEffect(() => {
        if (fontFamily) {
            document.documentElement.style.setProperty('--font-main', fontFamily);
            document.documentElement.style.setProperty('--font-mono', fontFamily);
        }
    }, [fontFamily]);

    // Sync popover state to body for CSS selector support across portals
    useEffect(() => {
        if (popoverState) {
            document.body.classList.add('has-popover');
        } else {
            document.body.classList.remove('has-popover');
        }
        return () => document.body.classList.remove('has-popover');
    }, [popoverState]);

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accentColor);
        const hex = accentColor.replace('#', '');
        const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
        const r = parseInt(full.substring(0, 2), 16);
        const g = parseInt(full.substring(2, 4), 16);
        const b = parseInt(full.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
        }
    }, [accentColor]);

    useEffect(() => {
        document.documentElement.style.setProperty('--color-obj', toThemeLinkedColor(objectColor, settingsTheme) || objectColor);
    }, [objectColor, settingsTheme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--color-player', toThemeLinkedColor(playerColor, settingsTheme) || playerColor);
    }, [playerColor, settingsTheme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--color-npc', toThemeLinkedColor(npcColor, settingsTheme) || npcColor);
    }, [npcColor, settingsTheme]);

    useEffect(() => {
        const themedTargetColor = toThemeLinkedColor(targetColor, settingsTheme) || targetColor;
        document.documentElement.style.setProperty('--color-target', themedTargetColor);
        document.documentElement.style.setProperty('--target-color', themedTargetColor);
    }, [targetColor, settingsTheme]);


    useEffect(() => {
        if (btn.editingButtonId === null && returnToManager) {
            setIsSetManagerOpen(true);
            setReturnToManager(false);
        }
    }, [btn.editingButtonId, returnToManager, setIsSetManagerOpen]);





    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (btn.isEditMode) {
            const target = e.target as HTMLElement;
            // Don't clear selection if clicking on a button, its handle, or a cluster
            if (target.closest('.custom-btn') ||
                target.closest('.hud-cluster') ||
                target.closest('.resize-handle') ||
                target.closest('.modal')) {
                return;
            }
            btn.setSelectedIds(new Set());
            btn.setEditingButtonId(null);
        }
    };

    const handleDoubleClick = useCallback(() => { }, []);

    const handleSendCallback = useCallback((e?: React.FormEvent) => {
        handleSend(e);
    }, [handleSend]);

    const heldButtonActionType = typeof heldButton?.id === 'string'
        ? btn.buttons.find((button: any) => button.id === heldButton.id)?.actionType
        : undefined;
    const isTacticalTargetingActive = !!heldButton
        && !heldButton.didFire
        && typeof heldButton.id === 'string'
        && (heldButton.id.startsWith('tactical-') || heldButton.id === 'map-long-press')
        && heldButtonActionType !== 'modifier';
    const isDrawerTargetingActive = !!heldButton
        && !heldButton.didFire
        && typeof heldButton.id === 'string'
        && (heldButton.id.startsWith('drawer-') || heldButton.id.startsWith('shop-'));

    return (
        <div
            className={`app-container state-${gameState} ${theme}-mode ${isImmersionMode ? 'immersion-mode' : ''} ${isMobile ? 'is-mobile' : 'is-desktop'} ${displayMode.isBrowser ? 'display-browser' : 'display-standalone'} ${isLandscape ? 'is-landscape' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''} ${popoverState ? 'has-popover' : ''} ${ui.mapExpanded ? 'is-map-expanded' : ''} ${ui.drawer !== 'none' ? `has-drawer-open drawer-${ui.drawer}` : ''} ${isMobile && !isLandscape && ui.drawer !== 'none' ? 'drawer-open-portrait' : ''} ${isBloomEnabled ? 'bloom-enabled' : ''} ${inCombat ? 'in-combat' : ''} ${isNewbieMode ? 'newbie-mode' : ''} ${isTacticalTargetingActive ? 'tactical-targeting-active' : ''} ${isDrawerTargetingActive ? 'drawer-targeting-active' : ''} terrain-${normalizeTerrain(currentTerrain || 'building')} lighting-${env?.lighting || 'none'}`}
            ref={containerRef}
            onDragOver={(e: React.DragEvent) => {
                e.preventDefault();
                // If dragging an item/target near the right edge, peek the drawer
                if (e.clientX > window.innerWidth - 80) {
                    setUI(prev => {
                        if (prev.isDrawerPeeking) return prev;
                        return { ...prev, isDrawerPeeking: true };
                    });
                } else if (e.clientX < window.innerWidth - 150) {
                    setUI(prev => {
                        if (!prev.isDrawerPeeking) return prev;
                        return { ...prev, isDrawerPeeking: false };
                    });
                }

                // Add visual feedback to log container
                const target = e.target as HTMLElement;
                const logContainer = target.closest('.message-log-container');
                if (logContainer) {
                    logContainer.classList.add('drop-hover-active');
                }
            }}
            onDragLeave={(e: React.DragEvent) => {
                const target = e.target as HTMLElement;
                const logContainer = target.closest('.message-log-container');
                if (logContainer) {
                    logContainer.classList.remove('drop-hover-active');
                }
            }}
            onDragEnd={(e: React.DragEvent) => {
                setUI(prev => ({ ...prev, isDrawerPeeking: false }));
                const target = e.target as HTMLElement;
                const logContainer = document.querySelector('.message-log-container.drop-hover-active');
                if (logContainer) {
                    logContainer.classList.remove('drop-hover-active');
                }
            }}
            onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                setUI(prev => ({ ...prev, isDrawerPeeking: false }));

                const logContainer = document.querySelector('.message-log-container.drop-hover-active');
                if (logContainer) {
                    logContainer.classList.remove('drop-hover-active');
                }

                const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                if (!dataStr) return;

                let data;
                try {
                    data = JSON.parse(dataStr);
                } catch (err) {
                    return; // Not our JSON payload
                }

                // Check if it's an item dropped from a drawer (inventory or eq) into the main view
                if (data && data.type === 'inline-btn' && data.context && (data.cmd === 'inventorylist' || data.cmd === 'equipmentlist' || data.cmd === 'item')) {
                    triggerHaptic(40);
                    executeCommand(`drop ${data.context}`);
                }
            }}
            onClick={handleBackgroundClick}
        >
            <div className={`app-content-shaker ${rumble ? 'rumble-active' : ''}`} style={{ flex: 1, position: 'relative' }}>
                <AtmosphericLayer />

                <ErrorBoundary name="Main Content">
                    <MainContentLayer
                        handleMouseUp={() => { }}
                        handleLogPointerDown={handleLogPointerDown}
                        handleLogPointerUp={handleLogPointerUp}
                        handleSend={handleSendCallback}
                        handleInputSwipe={handleInputSwipe}
                        commandPreview={commandPreview}
                        setCommandPreview={setCommandPreview}
                        heldButton={heldButton}
                        setHeldButton={setHeldButton}
                        mumeEditState={mumeEditState}
                        setMumeEditState={setMumeEditState}
                        wasDraggingRef={wasDraggingRef}
                    />
                </ErrorBoundary>

                <ErrorBoundary name="HUD Controls">
                    <HUDClustersLayer
                        handleDragStart={handleDragStart}
                        wasDraggingRef={wasDraggingRef}
                        commandPreview={commandPreview}
                        setCommandPreview={setCommandPreview}
                        heldButton={heldButton}
                        setHeldButton={setHeldButton}
                        btnGlow={btnGlow}
                        setBtnGlow={setBtnGlow}
                        handleSend={handleSendCallback}
                        handleInputSwipe={handleInputSwipe}
                    />
                </ErrorBoundary>

            </div>

            <DrawerManager
                heldButton={heldButton}
                heldButtonRef={heldButtonRef}
                setHeldButton={setHeldButton}
                setCommandPreview={setCommandPreview}
            />


            {typeof document !== 'undefined' && createPortal(
                <ErrorBoundary name="Modals & Dialogs">
                    <div className={`modals-layer-wrapper ${isLandscape ? 'is-landscape' : ''}`}>
                        <ModalsLayer
                            isLoading={isLoading}
                            returnToManager={returnToManager}
                            setReturnToManager={setReturnToManager}
                            managerSelectedSet={ui.managerSelectedSet}
                            setManagerSelectedSet={setManagerSelectedSet}
                            connect={() => telnet.connect()}
                        />
                        <SwipeFeedbackOverlay />
                        <ObjectDragOverlay />
                    </div>
                </ErrorBoundary>,
                document.body
            )}


            {heldButton?.isLogDragging && createPortal(
                <div 
                    className="log-drag-ghost" 
                    style={{ 
                        left: heldButton.x, 
                        top: heldButton.y,
                        zIndex: 10000000
                    }}
                >
                    {heldButton.label || heldButton.baseCommand}
                </div>,
                document.body
            )}

            <AgentHUD />
            <PerfHUD />
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <GameProvider>
        <MapperProvider>
            <MudClient />
            <Analytics />
        </MapperProvider>
    </GameProvider>
);
