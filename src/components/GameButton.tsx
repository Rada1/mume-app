import React, { useRef } from 'react';
import { CustomButton, PopoverState, SwipeDirection } from '../types';
import { getButtonCommand } from '../utils/buttonUtils';
import { triggerSwipeFeedback } from './SwipeFeedbackOverlay';

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
    setHeldButton: (held: { id: string, baseCommand: string, modifiers: string[] } | null) => void;
    heldButton: { id: string, baseCommand: string, modifiers: string[] } | null;
    joystick: { currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void };
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
    // We use some internal state pointers on the element to avoid complex React state for high-frequency events
    const buttonRef = useRef<HTMLDivElement>(null);

    if (button.display === 'inline') return null;
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
            className={`custom-btn ${isFloating ? 'floating' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''} ${button.trigger?.enabled && button.isVisible ? 'triggered' : ''} ${className}`}
            data-id={button.id}
            style={{
                left: useDefaultPositioning ? `${button.style.x}%` : undefined,
                top: useDefaultPositioning ? `${button.style.y}%` : undefined,
                width: useDefaultPositioning ? `${button.style.w}px` : undefined,
                height: useDefaultPositioning ? `${button.style.h}px` : undefined,
                backgroundColor: button.style.backgroundColor || 'rgba(255,255,255,0.05)',
                borderColor: button.style.borderColor || 'rgba(255,255,255,0.2)',
                color: button.style.color || '#fff',
                fontSize: `${button.style.fontSize || 0.8}rem`,
                borderRadius: `${button.style.borderRadius || 8}px`,
                opacity: (button.isVisible || isEditMode) ? 1 : 0,
                pointerEvents: (button.isVisible || isEditMode) ? 'auto' : 'none',
                boxShadow: button.trigger?.enabled && button.isVisible ? `0 0 20px ${getGlowColor()}` : 'none',
                zIndex: isSelected ? 1001 : (isFloating ? 1000 : 100)
            } as any}
            onPointerDown={(e) => {
                if (isEditMode) {
                    handleDragStart(e, button.id, 'move');
                } else {
                    const el = e.currentTarget as any;
                    el._startX = e.clientX;
                    el._startY = e.clientY;
                    el._maxDist = 0;
                    el._didFire = false;
                    el._didLong = false;
                    wasDraggingRef.current = false;

                    // Long press for submenu/assignment
                    el._lpt = setTimeout(() => {
                        if (el._maxDist < 15) {
                            el._didFire = true;
                            el._didLong = true;
                            triggerHaptic(50);
                            const rect = el.getBoundingClientRect();

                            const action = button.longActionType || 'menu';
                            const targetSetId = button.longCommand || button.setId || 'main';

                            if (action === 'command' && button.longCommand) {
                                executeCommand(button.longCommand);
                            } else if (action === 'nav' && button.longCommand) {
                                setActiveSet(button.longCommand);
                            } else {
                                setPopoverState({
                                    x: rect.left,
                                    y: rect.top,
                                    setId: targetSetId,
                                    context: button.label,
                                    sourceHeight: rect.height,
                                    menuDisplay: button.menuDisplay,
                                    initialPointerX: rect.left + rect.width / 2,
                                    initialPointerY: rect.top + rect.height / 2,
                                    assignSourceId: action === 'assign' ? button.id : undefined
                                });
                            }
                        }
                    }, 500);

                    // Continuous trigger logic for swipe/modifiers
                    el._lst = setTimeout(() => {
                        if (!el._didLong && el._maxDist < 20) {
                            setHeldButton({ id: button.id, baseCommand: button.command, modifiers: [] });
                        }
                    }, 200);
                }
            }}
            onPointerMove={(e) => {
                if (isEditMode) return;
                const el = e.currentTarget as any;
                if (!el._startX) return;

                const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                el._maxDist = Math.max(el._maxDist || 0, dist);

                if (dist > 10) wasDraggingRef.current = true;

                // Long swipe detection (assignment or navigation)
                if (dist > 60 && !el._didFire && !el._didLong) {
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    let dir: SwipeDirection;
                    if (angle >= -22.5 && angle < 22.5) dir = 'right';
                    else if (angle >= 22.5 && angle < 67.5) dir = 'se';
                    else if (angle >= 67.5 && angle < 112.5) dir = 'down';
                    else if (angle >= 112.5 && angle < 157.5) dir = 'sw';
                    else if (angle >= 157.5 || angle < -157.5) dir = 'left';
                    else if (angle >= -157.5 && angle < -112.5) dir = 'nw';
                    else if (angle >= -112.5 && angle < -67.5) dir = 'up';
                    else dir = 'ne';

                    if (button.swipeCommands?.[dir]) {
                        const longCmd = button.swipeCommands[dir]!;
                        const longAction = button.swipeActionTypes?.[dir] || 'command';
                        const rect = el.getBoundingClientRect();
                        el._didFire = true;
                        triggerHaptic(30);

                        if (longAction === 'assign') {
                            setPopoverState({ x: rect.right + 10, y: rect.top, sourceHeight: rect.height, setId: longCmd, assignSourceId: button.id, assignSwipeDir: dir });
                        } else if (longAction === 'nav') {
                            setActiveSet(longCmd);
                        } else if (longAction === 'menu') {
                            setPopoverState({ x: rect.right + 10, y: rect.top, sourceHeight: rect.height, setId: longCmd, context: button.label, menuDisplay: button.menuDisplay, initialPointerX: rect.left + rect.width / 2, initialPointerY: rect.top + rect.height / 2 });
                        } else if (longAction === 'select-recipient') {
                            setPopoverState({ x: rect.right + 10, y: rect.top, sourceHeight: rect.height, type: 'give-recipient-select', setId: longCmd, context: longCmd });
                        } else {
                            executeCommand(longCmd, false, false);
                        }
                        setHeldButton(null);
                        setCommandPreview(null);
                    }
                }

                const preview = getButtonCommand(button, dx, dy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target);
                setCommandPreview(preview);
            }}
            onPointerUp={(e) => {
                const el = e.currentTarget as any;
                if (isEditMode) return;

                clearTimeout(el._lpt); el._lpt = null;
                clearTimeout(el._lst); el._lst = null;
                setHeldButton(null);
                setCommandPreview(null);

                if (el._didFire) { el._didFire = false; return; }

                const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                const preview = getButtonCommand(button, dx, dy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target);

                if (preview) {
                    executeCommand(preview, false, false);
                    if (joystick.currentDir) joystick.setIsJoystickConsumed(true);
                    triggerHaptic(15);
                    el.classList.remove('btn-glow-active'); void el.offsetWidth; el.classList.add('btn-glow-active');
                } else {
                    const isSwiped = Math.abs(dx) > 15 || Math.abs(dy) > 15;
                    let cmd = button.command;
                    let actionType = button.actionType || 'command';

                    if (isSwiped && button.swipeCommands) {
                        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        let dir: SwipeDirection;
                        if (angle >= -22.5 && angle < 22.5) dir = 'right';
                        else if (angle >= 22.5 && angle < 67.5) dir = 'se';
                        else if (angle >= 67.5 && angle < 112.5) dir = 'down';
                        else if (angle >= 112.5 && angle < 157.5) dir = 'sw';
                        else if (angle >= 157.5 || angle < -157.5) dir = 'left';
                        else if (angle >= -157.5 && angle < -112.5) dir = 'nw';
                        else if (angle >= -112.5 && angle < -67.5) dir = 'up';
                        else dir = 'ne';

                        if (button.swipeCommands[dir]) {
                            cmd = button.swipeCommands[dir]!;
                            actionType = button.swipeActionTypes?.[dir] || 'command';
                            triggerSwipeFeedback(e.clientX, e.clientY, angle, button.style.borderColor || button.style.backgroundColor || 'var(--accent)');
                        }
                    }

                    if (actionType === 'nav') setActiveSet(cmd);
                    else if (actionType === 'assign' || actionType === 'menu') {
                        const rect = el.getBoundingClientRect();
                        setPopoverState({
                            x: rect.right + 10, y: rect.top, sourceHeight: rect.height, setId: cmd,
                            context: button.label, assignSourceId: button.id, assignSwipeDir: undefined,
                            menuDisplay: button.menuDisplay, initialPointerX: rect.left + rect.width / 2, initialPointerY: rect.top + rect.height / 2
                        });
                    } else if (!isSwiped) {
                        handleButtonClick(button, e);
                    }
                }

                if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') {
                    setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (isEditMode) {
                    if (wasDraggingRef.current) return;
                    setEditButton(button);
                }
            }}
        >
            <div className="button-label">{button.label}</div>

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
