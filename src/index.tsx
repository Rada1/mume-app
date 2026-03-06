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

    const handleBackgroundClick = () => {
        if (btn.isEditMode) {
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
            className={`app-container ${theme}-mode ${isMobile ? 'is-mobile' : 'is-desktop'} ${isLandscape ? 'is-landscape' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''} ${popoverState ? 'has-popover' : ''}`}
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
            ref={containerRef}
            onDragOver={(e: React.DragEvent) => {
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
            }}
            onDragEnd={() => {
                setUI(prev => ({ ...prev, isDrawerPeeking: false }));
            }}
            onDrop={(e: React.DragEvent) => {
                setUI(prev => ({ ...prev, isDrawerPeeking: false }));
                try {
                    const dataStr = e.dataTransfer.getData('application/json');
                    if (!dataStr) return;
                    const data = JSON.parse(dataStr);
                    // Check if it's an item dropped from a drawer (inventory or eq) into the main view
                    if (data.type === 'inline-btn' && data.context && (data.cmd === 'inventorylist' || data.cmd === 'equipmentlist' || data.cmd === 'item')) {
                        triggerHaptic(40);
                        executeCommand(`drop ${data.context}`);
                    }
                } catch (err) {
                    // Ignore parse errors from other dragged types
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

            <SpatButtons
                spatButtons={spatButtons}
                isMobile={isMobile}
                setActiveSet={btn.setActiveSet}
                executeCommand={executeCommand}
                setSpatButtons={setSpatButtons}
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
