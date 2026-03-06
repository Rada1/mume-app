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
        draggedTarget,
        setDraggedTarget,
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
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (!targetEl) return;

        const name = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
        const startX = e.clientX;
        const startY = e.clientY;
        let hasStarted = false;

        const onMove = (me: PointerEvent) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!hasStarted && dist > 15) {
                hasStarted = true;
                triggerHaptic(20);
            }

            if (hasStarted) {
                setDraggedTarget({ name, type: 'target', x: me.clientX, y: me.clientY });

                // Drawer peeking logic
                if (me.clientX > window.innerWidth - 100) {
                    setUI(prev => ({ ...prev, isDrawerPeeking: true }));
                } else if (me.clientX < window.innerWidth - 150) {
                    setUI(prev => ({ ...prev, isDrawerPeeking: false }));
                }
            }
        };

        const onUp = (ue: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);

            if (hasStarted) {
                const dropTarget = document.elementFromPoint(ue.clientX, ue.clientY);
                if (dropTarget?.closest('.right-drawer') || (viewport.isMobile && ue.clientX > window.innerWidth - 100)) {
                    triggerHaptic(40);
                    setTarget(name);
                    addMessage('system', `Target set to: ${name}`);
                    // If it was peeking, maybe open it fully or just close? 
                    // User said "open up slightly indicating you can drop", so dropping should just fulfill the action.
                }
                setDraggedTarget(null);
                setUI(prev => ({ ...prev, isDrawerPeeking: false }));
            }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [triggerHaptic, viewport.isMobile, setDraggedTarget, setUI, setTarget, addMessage]);

    const handleSendCallback = useCallback((e?: React.FormEvent) => {
        handleSend(e);
    }, [handleSend]);

    return (
        <div
            className={`app-container ${theme}-mode ${isMobile ? 'is-mobile' : 'is-desktop'} ${isLandscape ? 'is-landscape' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''} ${popoverState ? 'has-popover' : ''}`}
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
            ref={containerRef}
            onClick={handleBackgroundClick}
        >
            <div className={`app-content-shaker ${rumble ? 'rumble-active' : ''}`} style={{ flex: 1, position: 'relative' }}>
                <div className="background-layer" style={{
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                    display: bgImage ? 'block' : 'none'
                }} />
                <AtmosphericLayer />

                {draggedTarget && (
                    <div style={{
                        position: 'fixed',
                        left: draggedTarget.x,
                        top: draggedTarget.y,
                        pointerEvents: 'none',
                        zIndex: 99999,
                        transform: 'translate(-50%, -50%) scale(1.1)',
                        background: 'rgba(74, 222, 128, 0.7)',
                        opacity: 0.8,
                        color: '#000',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.9rem',
                        border: '2px solid #fff'
                    }}>
                        {draggedTarget.name}
                    </div>
                )}

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
