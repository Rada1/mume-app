import React, { useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CustomButton, PopoverState, SwipeDirection } from '../types';
import { getButtonCommand } from '../utils/buttonUtils';

interface GameButtonProps {
    button: CustomButton;
    isEditMode: boolean;
    isGridEnabled: boolean;
    gridSize: number;
    isSelected: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent | React.PointerEvent) => void;
    wasDraggingRef: React.RefObject<boolean>;
    triggerHaptic: (ms: number) => void;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setEditButton: (button: CustomButton) => void;
    activePrompt: string | null;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    setCommandPreview: (cmd: string | null) => void;
    setHeldButton: React.Dispatch<React.SetStateAction<{ id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null>>;
    heldButton: { id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null;
    joystick: { isActive: boolean, currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void };
    target: string | null;
    setActiveSet: (setId: string) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    className?: string;
    useDefaultPositioning?: boolean;
}

export const GameButton: React.FC<GameButtonProps> = ({
    button,
    isEditMode,
    isGridEnabled,
    gridSize,
    isSelected,
    dragState,
    handleDragStart,
    handleButtonClick,
    wasDraggingRef,
    triggerHaptic,
    setPopoverState,
    setEditButton,
    activePrompt,
    executeCommand,
    setCommandPreview,
    setHeldButton,
    heldButton,
    joystick,
    target,
    setActiveSet,
    setButtons,
    className = '',
    useDefaultPositioning = true
}) => {
    const [activeDir, setActiveDir] = React.useState<SwipeDirection | null>(null);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [wheelPos, setWheelPos] = React.useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);
    // We use some internal state pointers on the element to avoid complex React state for high-frequency events

    if (button.display === 'inline') return null;

    // Update preview when joystick becomes active (for Long Swipe combos)
    useEffect(() => {
        if (heldButton?.id === button.id && heldButton.dx !== undefined && heldButton.dy !== undefined) {
            const preview = getButtonCommand(button, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, target, joystick.isActive);
            setCommandPreview(preview?.cmd || null);
        }
    }, [joystick.isActive, heldButton?.id, button.id, joystick.currentDir, joystick.isTargetModifierActive, target]);
    if (!button.isVisible && !isEditMode) return null;

    const isFloating = button.display === 'floating';

    const getGlowColor = () => {
        if (button.trigger?.enabled && button.isVisible) {
            return button.style.borderColor || button.style.backgroundColor || 'var(--accent)';
        }
        return 'transparent';
    };

    return (
        <div
            ref={buttonRef}
            className={`custom-btn ${isFloating ? 'floating' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''} ${button.trigger?.enabled && button.isVisible ? 'triggered' : ''} ${activeDir ? 'is-swiping' : ''} ${className}`}
            data-id={button.id}
            style={{
                left: useDefaultPositioning ? `${button.style.x}%` : undefined,
                top: useDefaultPositioning ? `${button.style.y}%` : undefined,
                width: useDefaultPositioning ? `${button.style.w}px` : undefined,
                height: useDefaultPositioning ? `${button.style.h}px` : undefined,
                backgroundColor: button.style.backgroundColor || 'rgba(255,255,255,0.05)',
                borderColor: button.style.borderColor || 'rgba(255,255,255,0.2)',
                borderWidth: `${button.style.borderWidth !== undefined ? button.style.borderWidth : 1}px`,
                borderStyle: 'solid',
                '--btn-theme-rgb': button.style.borderColor ? (() => {
                    const hex = button.style.borderColor.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    return !isNaN(r) ? `${r}, ${g}, ${b}` : '255, 255, 255';
                })() : '255, 255, 255',
                color: button.style.color || '#fff',
                fontSize: `${button.style.fontSize || 0.8}rem`,
                borderRadius: `${button.style.borderRadius || 8}px`,
                '--set-accent': button.style.borderColor || 'var(--accent)',
                '--set-accent-rgb': button.style.borderColor ? (() => {
                    const hex = button.style.borderColor.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    return !isNaN(r) ? `${r}, ${g}, ${b}` : '255, 255, 255';
                })() : '255, 255, 255',
                opacity: (button.isVisible || isEditMode) ? (button.isDimmed ? 0.15 : 1) : 0,
                pointerEvents: (button.isVisible || isEditMode) ? (button.isDimmed && !isEditMode ? 'none' : 'auto') : 'none',
                boxShadow: (button.trigger?.enabled && button.isVisible) ? `0 0 20px ${getGlowColor()}` : 'none',
                zIndex: activeDir ? 20000 : (isSelected ? 1001 : (isFloating ? 1000 : 100))
            } as any}
            onPointerDown={(e) => {
                if (isEditMode) {
                    handleDragStart(e, button.id, 'move');
                } else {
                    // Prevent focus loss from input when tapping buttons
                    if (e.cancelable) {
                        e.preventDefault();
                    }

                    const el = e.currentTarget as any;
                    const rect = el.getBoundingClientRect();
                    el._startX = e.clientX;
                    el._startY = e.clientY;
                    el._startTime = Date.now();
                    el._maxDist = 0;
                    el._didFire = false;
                    el._didLong = false;
                    setWheelPos({ x: e.clientX, y: e.clientY });
                    wasDraggingRef.current = false;

                    // Immediate tap feedback
                    triggerHaptic(15);

                    const initialX = rect.left + rect.width / 2;
                    const initialY = rect.top + rect.height / 2;

                    // Immediately register as held so joystick can see it
                    setHeldButton({
                        id: button.id,
                        baseCommand: button.command,
                        modifiers: [],
                        dx: 0,
                        dy: 0,
                        didFire: false,
                        initialX,
                        initialY
                    });

                    // Set initial ray and cancel states
                    el.style.setProperty('--ray-color', button.style.borderColor || button.style.backgroundColor || 'var(--accent)');
                    el.style.setProperty('--cancel-opacity', '0');
                    el.style.setProperty('--cancel-scale', '0');
                }
            }}
            onPointerMove={(e) => {
                if (isEditMode) return;
                const el = e.currentTarget as any;
                if (!el._startX) return;

                // Stop button visuals if the joystick already fired our action (e.g. opened a menu)
                if (heldButton?.id === button.id && heldButton.didFire) {
                    if (activeDir) setActiveDir(null);
                    setCommandPreview(null);
                    el.style.setProperty('--ray-opacity', '0');
                    el.style.setProperty('--cancel-opacity', '0');
                    return;
                }

                const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                el._maxDist = Math.max(el._maxDist || 0, dist);

                if (dist > 10) wasDraggingRef.current = true;

                // Track finger for combos. If we're already swiping (>15px), ensure we're the held button
                if (dist > 15) {
                    if (!heldButton || heldButton.id !== button.id) {
                        setHeldButton({ id: button.id, baseCommand: button.command, modifiers: heldButton?.modifiers || [], dx, dy });
                    } else if (heldButton.dx !== dx || heldButton.dy !== dy) {
                        setHeldButton(prev => prev ? { ...prev, dx, dy } : null);
                    }
                }

                const distToCenter = Math.sqrt(dx * dx + dy * dy);
                const isLong = joystick.isTargetModifierActive;
                const preview = getButtonCommand(button, dx, dy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target, isLong);
                setCommandPreview(preview?.cmd || null);

                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                const isSwipedOut = el._maxDist > 25;
                // Cancellation logic: Absolute Screen Position
                // Instead of a relative wedge, we check if the pointer is physically over the 65px "Cancel" bubble
                // Bubble is at (window.innerWidth/2 + 100), (window.innerHeight/2 + 100)
                const cancelX = window.innerWidth / 2 + 100;
                const cancelY = window.innerHeight / 2 + 100;
                const distToCancelBubble = Math.sqrt(Math.pow(e.clientX - cancelX, 2) + Math.pow(e.clientY - cancelY, 2));

                const isCancelZone = distToCancelBubble < 45; // 45px radius for a 65px visual bubble (forgiving hitbox)

                if (isCancelZone) {
                    setActiveDir(null);
                    el.style.setProperty('--cancel-opacity', '1');
                    el.style.setProperty('--cancel-scale', '1.25');
                    setIsCancelling(true);
                } else if (preview?.isSwipe) {
                    setActiveDir(preview.dir || null);
                    el.style.setProperty('--cancel-opacity', '0');
                    setIsCancelling(false);
                } else if (preview && isSwipedOut && distToCenter < 20) {
                    setActiveDir('center' as any);
                    el.style.setProperty('--cancel-opacity', '0');
                    setIsCancelling(false);
                } else {
                    setActiveDir(null);
                    el.style.setProperty('--cancel-opacity', '0');
                    el.style.setProperty('--cancel-scale', '0.5');
                    setIsCancelling(false);
                }

                // Update the Dynamic Compass Ray
                const snappedAngle = Math.round(angle / 45) * 45;
                if (distToCenter > 20 && snappedAngle !== el._lastSnappedAngle) {
                    triggerHaptic(15);
                    el._lastSnappedAngle = snappedAngle;
                }

                // Live Menu Trigger: Swipe & Select
                // The menu check uses button.actionType directly because once the finger moves >15px,
                // getButtonCommand switches to swipe-direction mode and returns actionType='command'.
                const isMenuButton = ['menu', 'assign', 'select-assign'].includes(button.actionType || '')
                    || (isLong && ['menu', 'assign', 'select-assign'].includes(button.longActionType || ''));
                const menuSetId = isLong ? (button.longCommand || button.command) : button.command;
                if (isMenuButton && distToCenter > 25 && !el._didFire) {
                    const rect = el.getBoundingClientRect();
                    const initialX = rect.left + rect.width / 2;
                    const initialY = rect.top + rect.height / 2;
                    const isDial = button.menuDisplay === 'dial';
                    el._didFire = true;
                    setPopoverState({
                        x: isDial ? window.innerWidth / 2 : e.clientX,
                        y: isDial ? window.innerHeight / 2 : e.clientY,
                        sourceHeight: rect.height, setId: menuSetId,
                        context: button.label,
                        assignSourceId: (button.actionType === 'assign' || button.actionType === 'select-assign') ? button.id : undefined,
                        executeAndAssign: button.actionType === 'select-assign',
                        menuDisplay: button.menuDisplay,
                        initialPointerX: isDial ? initialX : undefined,
                        initialPointerY: isDial ? initialY : undefined
                    });
                    triggerHaptic(40);
                }

                el.style.setProperty('--ray-angle', `${snappedAngle}deg`);
                el.style.setProperty('--ray-length', `${distToCenter + 50}px`);
                const timePassed = Date.now() - el._startTime;
                const isHeld = timePassed > 150 || distToCenter > 60;

                // Keep ray visible during cancellation and turn it red for warning
                const shouldShowRay = distToCenter > 20 && isHeld && (preview || isCancelZone);
                el.style.setProperty('--ray-opacity', (shouldShowRay && !el._didFire) ? '1' : '0');
                el.style.setProperty('--ray-color', isCancelZone ? '#ef4444' : (button.style.borderColor || 'var(--set-accent, var(--accent))'));
            }}
            onPointerUp={(e) => {
                const el = e.currentTarget as any;
                if (isEditMode) return;

                if (heldButton?.id === button.id && heldButton.didFire) {
                    setHeldButton(null);
                    el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
                    return;
                }

                const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const isOverButton = dist < 25;
                const isLong = joystick.isTargetModifierActive;

                // If returned to center, we force a non-swipe check to trigger primary command
                const isReturnToCenter = isOverButton && el._maxDist > 15;
                const finalDx = isReturnToCenter ? 0 : dx;
                const finalDy = isReturnToCenter ? 0 : dy;

                const previewCmd = getButtonCommand(button, finalDx, finalDy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target, isLong);

                setHeldButton(null);
                setCommandPreview(null);
                setActiveDir(null);
                const finalIsCancelling = isCancelling;
                setIsCancelling(false);
                el.style.setProperty('--ray-opacity', '0');
                el.style.setProperty('--cancel-opacity', '0');
                el.style.setProperty('--cancel-scale', '0');

                // Clear lingering pointer state
                el._startX = null;
                el._startY = null;
                el._startTime = null;
                el._maxDist = 0;

                if (el._didFire) { el._didFire = false; return; }

                // Final check for cancellation (Absolute Screen Hitbox)
                const cancelX = window.innerWidth / 2 + 100;
                const cancelY = window.innerHeight / 2 + 100;
                const distToCancelBubble = Math.sqrt(Math.pow(e.clientX - cancelX, 2) + Math.pow(e.clientY - cancelY, 2));

                if (finalIsCancelling || distToCancelBubble < 45) return;

                if (previewCmd && previewCmd.cmd && previewCmd.cmd.trim() !== '') {
                    // Unified release: Execute whatever direction/command was being previewed
                    if (previewCmd.actionType === 'nav') {
                        setActiveSet(previewCmd.cmd);
                        triggerHaptic(35);
                    } else if (previewCmd.actionType === 'assign' || previewCmd.actionType === 'menu' || previewCmd.actionType === 'select-assign') {
                        const rect = el.getBoundingClientRect();
                        const isSwipe = el._maxDist > 15;
                        const isDial = button.menuDisplay === 'dial';
                        const initialX = rect.left + rect.width / 2;
                        const initialY = rect.top + rect.height / 2;

                        triggerHaptic(40);
                        setPopoverState({
                            x: isSwipe ? (isDial ? window.innerWidth / 2 : e.clientX) : rect.right + 10,
                            y: isSwipe ? (isDial ? window.innerHeight / 2 : e.clientY) : rect.top,
                            sourceHeight: rect.height,
                            setId: previewCmd.cmd,
                            context: previewCmd.actionType === 'select-assign' ? previewCmd.modifiers : button.label,
                            assignSourceId: (previewCmd.actionType === 'assign' || previewCmd.actionType === 'select-assign') ? button.id : undefined,
                            assignSwipeDir: previewCmd.dir,
                            executeAndAssign: previewCmd.actionType === 'select-assign',
                            menuDisplay: button.menuDisplay,
                            initialPointerX: (isSwipe && isDial) ? initialX : undefined,
                            initialPointerY: (isSwipe && isDial) ? initialY : undefined
                        });
                    } else {
                        executeCommand(previewCmd.cmd, false, false);
                        if (joystick.currentDir) joystick.setIsJoystickConsumed(true);
                        triggerHaptic(35);
                        el.classList.remove('btn-glow-active'); void el.offsetWidth; el.classList.add('btn-glow-active');
                    }
                } else {
                    // No preview (cancelled, static tap, or returned to center)
                    if (el._maxDist < 15 || isReturnToCenter) {
                        // Fire glow directly here — handleButtonClick's e.currentTarget may be null
                        el.classList.remove('btn-glow-active'); void el.offsetWidth; el.classList.add('btn-glow-active');

                        // Double-tap targeting: two taps within 300ms sets the button's command as target
                        const now = Date.now();
                        const lastTap = el._lastTapTime || 0;
                        el._lastTapTime = now;
                        if (now - lastTap < 300 && !isReturnToCenter) {
                            const targetCmd = button.command?.trim();
                            if (targetCmd && targetCmd !== '__clear_target__') {
                                executeCommand(`target ${targetCmd}`);
                                triggerHaptic(60);
                                return;
                            }
                        }

                        handleButtonClick(button, e);
                    }
                }

                if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') {
                    setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
                }
            }}
            onPointerCancel={(e) => {
                const el = e.currentTarget as any;
                clearTimeout(el._lpt); el._lpt = null;
                clearTimeout(el._lst); el._lst = null;
                if (el._repeatInterval) { clearInterval(el._repeatInterval); el._repeatInterval = null; }
                setHeldButton(null);
                setCommandPreview(null);
                setActiveDir(null);
                el.style.setProperty('--ray-opacity', '0');
                el.style.setProperty('--cancel-opacity', '0');
                el.style.setProperty('--cancel-scale', '0');
                // Clear lingering pointer state
                el._startX = null;
                el._startY = null;
                el._startTime = null;
                el._maxDist = 0;
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (isEditMode) {
                    if (wasDraggingRef.current) return;
                    setEditButton(button);
                }
            }}
        >
            {(activeDir || isCancelling) && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 50000,
                    '--wheel-center-x': '50%',
                    '--wheel-center-y': '50%',
                    '--set-accent': button.style.borderColor || 'var(--set-accent, var(--accent))',
                    '--set-accent-rgb': button.style.borderColor ? (() => {
                        const hex = button.style.borderColor.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        return !isNaN(r) ? `${r}, ${g}, ${b}` : 'var(--set-accent-rgb, var(--accent-rgb))';
                    })() : 'var(--set-accent-rgb, var(--accent-rgb))'
                } as any}>
                    <div className="swipe-wheel-container">
                        {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d, i) => {
                            const cmdVal = (button.swipeCommands?.[d as SwipeDirection] || '').trim();
                            const longCmdVal = (button.longSwipeCommands?.[d as SwipeDirection] || '').trim();
                            const angle = i * 45;
                            const isActive = activeDir === d;
                            const shouldFlip = angle > 90 && angle < 270;
                            return (
                                <div
                                    key={d}
                                    className={`swipe-slice ${isActive ? 'active' : ''}`}
                                    style={{
                                        transform: `rotate(${angle}deg)`,
                                        // Show slice if it has a command (short or long) OR if it's currently active (highlighted)
                                        opacity: (cmdVal || longCmdVal || isActive) ? 1 : 0,
                                        pointerEvents: 'auto',
                                    } as any}
                                >
                                    <div className="slice-separator" />
                                    {(cmdVal || longCmdVal) && (
                                        <span className={`swipe-slice-label ${shouldFlip ? 'flip' : ''}`}>
                                            {cmdVal || longCmdVal}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        <div className={`swipe-center ${(activeDir as any) === 'center' ? 'active' : ''}`}>
                            <svg className="curved-label-svg" viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                                <path id={`swipe-curve-${button.id}`} d="M 18,50 A 32,32 0 1 1 82,50 A 32,32 0 1 1 18,50" fill="transparent" />
                                <text style={{ fontSize: '12.5px', fontWeight: '900', fill: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <textPath href={`#swipe-curve-${button.id}`} startOffset="25%" textAnchor="middle">
                                        {button.command || button.label}
                                    </textPath>
                                </text>
                            </svg>
                        </div>
                    </div>
                    <div className="cancel-indicator" style={{
                        '--cancel-x': `calc(var(--wheel-center-x, 50%) + 100px)`,
                        '--cancel-y': `calc(var(--wheel-center-y, 50%) + 100px)`
                    } as any}>Cancel</div>
                </div>,
                document.body
            )}
            <div className="swipe-ray" />
            {button.icon ? (
                <img src={button.icon} className="button-icon" alt="" style={{ transform: `scale(${button.style.iconScale || 1})` }} />
            ) : (button.style.curvedText && button.style.shape === 'circle') ? (
                <svg className="curved-label-svg" viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                    <path id={`curve-${button.id}`} d="M 18,50 A 32,32 0 1 1 82,50 A 32,32 0 1 1 18,50" fill="transparent" />
                    <text style={{ fontSize: `${(button.style.fontSize || 1.1) * 14}px`, fontWeight: '900', fill: button.style.color || '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        <textPath href={`#curve-${button.id}`} startOffset="25%" textAnchor="middle">
                            {button.label}
                        </textPath>
                    </text>
                </svg>
            ) : (
                <div className="button-label">{button.label}</div>
            )}

            {isEditMode && (
                <>
                    <div
                        className="resize-handle"
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, button.id, 'resize');
                        }}
                    />
                </>
            )}

            {isEditMode && isGridEnabled && (
                <div className="grid-info" style={{ position: 'absolute', bottom: '-15px', left: 0, fontSize: '10px', opacity: 0.5, whiteSpace: 'nowrap' }}>
                    {Math.round(button.style.x)}%, {Math.round(button.style.y)}%
                </div>
            )}
        </div>
    );
};
