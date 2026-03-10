import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import './components/MessageLog.css';
import './components/Controls/Joystick.css';
import './components/Controls/Stats.css';
import './components/Controls/Xbox.css';
import './components/Controls/CustomButtons.css';
import './components/Controls/SwipeWheel.css';
import './components/Controls/Landscape.css';
import './components/Drawers.css';
import './components/Modals.css';

import { MainContentLayer } from './components/Layout/MainContentLayer';
import { HUDClustersLayer } from './components/Layout/HUDClustersLayer';
import { ModalsLayer } from './components/Layout/ModalsLayer';
import { AtmosphericLayer } from './components/Layout/AtmosphericLayer';
import { GameProvider, useGame } from './context/GameContext';
import { SpatButtons } from './components/SpatButtons';
import { useSpatButtons } from './hooks/useSpatButtons';

// Note: numToWord, pluralize*, ARRIVE_REGEX etc. have been moved to src/hooks/useMessageLog.ts

const MudClient = () => {
    const {
        theme,
        accentColor,
        rumble,
        setIsSetManagerOpen,
        isLoading,
        bgImage,
        telnet,
        btn,
        editor,
        containerRef,
        viewport,
        handleSend,
        handleInputSwipe,
        triggerHaptic,
        messages,
        popoverState,
        executeCommand,
        setTarget,
        addMessage,
        handleLogClick,
        handleLogDoubleClick,
        env,
        setUI
    } = useGame();

    const { isMobile, isKeyboardOpen, isLandscape, scrollContainerRef } = viewport;

    const [heldButton, setHeldButton] = useState<{ id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null>(null);
    const [commandPreview, setCommandPreview] = useState<string | null>(null);
    const [joystickGlow, setJoystickGlow] = useState(false);
    const [btnGlow, setBtnGlow] = useState({ up: false, down: false });
    const [managerSelectedSet, setManagerSelectedSet] = useState<string | null>(null);
    const [returnToManager, setReturnToManager] = useState(false);

    const { handleDragStart, wasDraggingRef } = editor;

    const { spatButtons, setSpatButtons } = useSpatButtons(messages, scrollContainerRef, triggerHaptic);

    // --- Global Mobile Focus Fix ---
    // This is the most aggressive way to prevent the "stuck focus" keyboard pop-up bug.
    // We listen for any touchstart on the entire document. If the touch is NOT on the input field,
    // we immediately blur the input field. This happens BEFORE the click/pointer events fire,
    // preventing the OS from thinking the user is interacting with a focused input.
    useEffect(() => {
        if (!isMobile) return;

        const handleGlobalTouch = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            // Don't blur if the user is actually trying to type or click the prompt
            if (target.tagName === 'INPUT' || target.classList.contains('cmd-prompt') || target.closest('.input-form')) {
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
        return () => document.removeEventListener('touchstart', handleGlobalTouch, { capture: true });
    }, [isMobile]);

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accentColor);
    }, [accentColor]);

    useEffect(() => {
        if (btn.editingButtonId === null && returnToManager) {
            setIsSetManagerOpen(true);
            setReturnToManager(false);
        }
    }, [btn.editingButtonId, returnToManager, setIsSetManagerOpen]);

    const hasAutoConnected = useRef(false);
    useEffect(() => {
        if (!hasAutoConnected.current && telnet && typeof telnet.connect === 'function') {
            hasAutoConnected.current = true;
            const timer = setTimeout(() => {
                telnet.connect();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [telnet]);

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (btn.isEditMode) {
            const target = e.target as HTMLElement;
            // Don't clear selection if clicking on a button, its handle, or a cluster
            if (target.closest('.custom-btn') ||
                target.closest('.hud-cluster') ||
                target.closest('.xbox-cluster') ||
                target.closest('.joystick-cluster') ||
                target.closest('.resize-handle') ||
                target.closest('.modal')) {
                return;
            }
            btn.setSelectedIds(new Set());
            btn.setEditingButtonId(null);
        }
    };

    const handleMouseUp = useCallback(() => { }, []);
    const handleDoubleClick = useCallback(() => { }, []);
    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        // No longer needed for dragging as we use native HTML5 Drag and Drop
    }, []);

    const handleSendCallback = useCallback((e?: React.FormEvent) => {
        handleSend(e);
    }, [handleSend]);

    return (
        <div
            className={`app-container ${theme}-mode ${isMobile ? 'is-mobile' : 'is-desktop'} ${isLandscape ? 'is-landscape' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''} ${popoverState ? 'has-popover' : ''} ${useGame().ui.mapExpanded ? 'is-map-expanded' : ''}`}
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
                <div className="background-layer" style={{
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                    display: bgImage ? 'block' : 'none'
                }} />
                <AtmosphericLayer />



                <MainContentLayer
                    handleMouseUp={handleMouseUp}
                    handleLogPointerDown={handleLogPointerDown}
                    handleSend={handleSendCallback}
                    handleInputSwipe={handleInputSwipe}
                    commandPreview={commandPreview}
                    setCommandPreview={setCommandPreview}
                    heldButton={heldButton}
                    setHeldButton={setHeldButton}
                />

                <HUDClustersLayer
                    handleDragStart={handleDragStart}
                    wasDraggingRef={wasDraggingRef}
                    commandPreview={commandPreview}
                    setCommandPreview={setCommandPreview}
                    heldButton={heldButton}
                    setHeldButton={setHeldButton}
                    joystickGlow={joystickGlow}
                    setJoystickGlow={setJoystickGlow}
                    btnGlow={btnGlow}
                    setBtnGlow={setBtnGlow}
                />
            </div>

            <ModalsLayer
                isLoading={isLoading}
                returnToManager={returnToManager}
                setReturnToManager={setReturnToManager}
                managerSelectedSet={managerSelectedSet}
                setManagerSelectedSet={setManagerSelectedSet}
                connect={() => telnet.connect()}
            />
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <GameProvider>
        <MudClient />
    </GameProvider>
);
