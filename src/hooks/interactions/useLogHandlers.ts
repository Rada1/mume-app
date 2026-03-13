import { useCallback, useRef } from 'react';
import { InteractionDeps } from './types';

export const useLogHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, input, setInput, target, setTarget, addMessage, triggerHaptic, btn, joystick,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport,
        setIsMapExpanded, setIsCharacterOpen, setIsItemsDrawerOpen,
        setInventoryLines, setEqLines, setStatsLines, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        ui, setUI, setActiveDragData, heldButton, setHeldButton, parley, setParley
    } = deps;

    const lastLogClickRef = useRef<number>(0);
    const logLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLogDraggingRef = useRef(false);
    const moveCountRef = useRef(0);

    const handleLogDoubleClick = useCallback((e: React.MouseEvent) => {
        let selection = window.getSelection()?.toString().trim();
        if (!selection) {
            const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
            if (targetEl) {
                selection = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            } else {
                const ev = e.nativeEvent as any;
                const x = ev.clientX || (ev.touches?.[0]?.clientX);
                const y = ev.clientY || (ev.touches?.[0]?.clientY);
                if (x !== undefined && y !== undefined) {
                    let range: Range | null = null;
                    if ((document as any).caretRangeFromPoint) {
                        range = (document as any).caretRangeFromPoint(x, y);
                    }
                    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                        if ((range as any).expand) {
                             (range as any).expand('word');
                        }
                        selection = range.toString().trim();
                    }
                }
            }
        }
        if (selection && selection.length > 1) {
            selection = selection.replace(/[^a-zA-Z]/g, '');
            if (selection.length > 0) {
                executeCommand(`look ${selection.toLowerCase()}`);
            }
        }
    }, [executeCommand]);

    const handleLogClick = useCallback((e: React.MouseEvent) => {
        const now = Date.now();
        if (now - lastLogClickRef.current < 300) {
            handleLogDoubleClick(e);
            return;
        }
        lastLogClickRef.current = now;

        const targetEl = e.target as HTMLElement;
        const inlineBtn = targetEl.closest('.inline-btn') as HTMLElement;
        if (inlineBtn) {
            const id = inlineBtn.getAttribute('data-id');
            const cmd = inlineBtn.getAttribute('data-cmd');
            const context = inlineBtn.getAttribute('data-context');
            const preventAction = inlineBtn.getAttribute('data-prevent-action');
            if (preventAction === 'true') { return; }
            if (id?.startsWith('link-') && context) {
                const url = context.startsWith('http') ? context : `http://${context}`;
                window.open(url, '_blank', 'noopener,noreferrer');
                return;
            }
            if (id?.startsWith('player-') || id?.startsWith('npc-')) {
                const lowerContext = context ? context.toLowerCase() : '';
                if (target === lowerContext) { setTarget(null); triggerHaptic(10); }
                else { setTarget(lowerContext); triggerHaptic(10); }
                return;
            }
            if (cmd) {
                if (cmd === 'kill' && context && id?.startsWith('combat-')) {
                    executeCommand(`kill ${context}`);
                    return;
                }
                const finalCmd = cmd.includes('%n') ? cmd.replace(/%n/g, context || '') : (context ? `${cmd} ${context}` : cmd);
                triggerHaptic(10);
                if (btn.isEditMode && btn.setEditingButtonId) {
                    const tempBtn = { id: `temp-${Date.now()}`, command: finalCmd, label: finalCmd, actionType: 'command' as any };
                    btn.setButtons(prev => {
                        const newBtn = { ...tempBtn, setId: 'Combat' } as any;
                        btn.setEditingButtonId(newBtn.id);
                        return [...prev, newBtn];
                    });
                    return;
                }
                executeCommand(finalCmd);
            }
        }
    }, [target, setTarget, handleLogDoubleClick, triggerHaptic, btn, executeCommand]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        if (!viewport.isMobile) return;
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (targetEl) {
            const context = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            logDragStartPosRef.current = { x: e.clientX, y: e.clientY };
            isLogDraggingRef.current = false;
            moveCountRef.current = 0;

            logLongPressTimerRef.current = setTimeout(() => {
                isLogDraggingRef.current = true;
                triggerHaptic(50);
                targetEl.classList.add('dragging');

                const logEl = document.querySelector('.message-log') as HTMLElement;
                if (logEl) {
                    logEl.style.overflow = 'hidden';
                    logEl.style.touchAction = 'none';
                }
                setUI((prev: any) => ({ ...prev, isDrawerPeeking: true }));

                const dragData = {
                    type: 'inline-btn',
                    cmd: targetEl.getAttribute('data-cmd') || '',
                    context: context,
                    id: targetEl.getAttribute('data-id') || ''
                };
                setActiveDragData(dragData);
            }, 300);

            const handleGlobalMove = (moveEvent: PointerEvent) => {
                moveCountRef.current++;
                if (isLogDraggingRef.current) {
                    if (moveCountRef.current % 3 === 0) {
                        const recipient = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('.pc-highlighter, .npc-highlighter') as HTMLElement;
                        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

                        if (moveEvent.clientX > window.innerWidth - 80) {
                            setHeldButton((prev: any) => {
                                if (!prev) return null;
                                const original = prev.originalLabel || prev.label;
                                const newLabel = `get ${original}`;
                                if (prev.label === newLabel) return prev;
                                setCommandPreview(newLabel);
                                return { ...prev, label: newLabel };
                            });
                        } else {
                            const targetUnderPointer = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                            if (targetUnderPointer?.closest('.input-area')) {
                                setHeldButton((prev: any) => {
                                    if (!prev) return null;
                                    const original = prev.originalLabel || prev.label;
                                    const newLabel = `append: ${original}`;
                                    if (prev.label === newLabel) return prev;
                                    setCommandPreview(original);
                                    return { ...prev, label: newLabel };
                                });
                            } else if (recipient && !recipient.classList.contains('dragging')) {
                                recipient.classList.add('drop-hover-active');
                                const recipientName = recipient.getAttribute('data-context');
                                if (recipientName) {
                                    setHeldButton((prev: any) => {
                                        if (!prev) return null;
                                        const original = prev.originalLabel || prev.label;
                                        const newLabel = `give ${original} ${recipientName}`;
                                        if (prev.label === newLabel) return prev;
                                        setCommandPreview(newLabel);
                                        return { ...prev, label: newLabel };
                                    });
                                }
                            } else {
                                setHeldButton((prev: any) => {
                                    if (!prev) return null;
                                    const original = prev.originalLabel || prev.label;
                                    if (prev.label === original) return prev;
                                    setCommandPreview('');
                                    return { ...prev, label: original };
                                });
                            }
                        }
                    }
                } else if (logDragStartPosRef.current) {
                    const dx = Math.abs(moveEvent.clientX - logDragStartPosRef.current.x);
                    const dy = Math.abs(moveEvent.clientY - logDragStartPosRef.current.y);
                    if (Math.sqrt(dx * dx + dy * dy) > 5) {
                        if (logLongPressTimerRef.current) {
                            clearTimeout(logLongPressTimerRef.current);
                            logLongPressTimerRef.current = null;
                        }
                    }
                }
            };

            const handleGlobalUp = (upEvent: PointerEvent) => {
                if (logLongPressTimerRef.current) {
                    clearTimeout(logLongPressTimerRef.current);
                    logLongPressTimerRef.current = null;
                }
                if (isLogDraggingRef.current) {
                    const targetUnderPointer = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter');
                    if (recipient && !recipient.classList.contains('dragging')) {
                        const recipientName = recipient.getAttribute('data-context');
                        const draggedNoun = context;
                        if (draggedNoun && recipientName) {
                            triggerHaptic(60);
                            executeCommand(`give ${draggedNoun} ${recipientName}`);
                        }
                    } else if (upEvent.clientX > window.innerWidth - 80) {
                        const draggedNoun = context;
                        if (draggedNoun) {
                            triggerHaptic(40);
                            executeCommand(`get ${draggedNoun}`);
                        }
                    } else {
                        const targetUnderPointer = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                        if (targetUnderPointer?.closest('.input-area')) {
                            const draggedNoun = context;
                            if (draggedNoun) {
                                triggerHaptic(30);
                                const trimmed = input.trim();
                                setInput(trimmed ? `${trimmed} ${draggedNoun} ` : `${draggedNoun} `);
                            }
                        }
                    }
                    const logEl = document.querySelector('.message-log') as HTMLElement;
                    if (logEl) {
                        logEl.style.overflow = 'auto';
                        logEl.style.touchAction = 'pan-y';
                    }
                    setUI((prev: any) => ({ ...prev, isDrawerPeeking: false }));
                }

                document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
                logDragStartPosRef.current = null;
                isLogDraggingRef.current = false;
                setHeldButton(null);
                setActiveDragData(null);
                setCommandPreview('');
                document.querySelectorAll('.inline-btn.dragging').forEach(el => el.classList.remove('dragging'));
                window.removeEventListener('pointermove', handleGlobalMove);
                window.removeEventListener('pointerup', handleGlobalUp as any);
                window.removeEventListener('pointercancel', handleGlobalUp as any);
            };

            window.removeEventListener('pointermove', handleGlobalMove);
            window.removeEventListener('pointerup', handleGlobalUp as any);
            window.removeEventListener('pointercancel', handleGlobalUp as any);

            window.addEventListener('pointermove', handleGlobalMove);
            window.addEventListener('pointerup', handleGlobalUp);
            window.addEventListener('pointercancel', handleGlobalUp);

            const id = 'log-inline-' + (targetEl.getAttribute('data-id') || Math.random());
            const cmd = targetEl.getAttribute('data-cmd') || '';
            const rect = targetEl.getBoundingClientRect();
            const baseCommand = cmd.includes('%n') ? cmd.replace(/%n/g, context) : (cmd ? `${cmd} ${context}` : context);

            setHeldButton({
                id,
                baseCommand,
                modifiers: [],
                dx: 0,
                dy: 0,
                didFire: false,
                isLogDragging: false,
                initialX: rect.left + rect.width / 2,
                initialY: rect.top + rect.height / 2
            });
        }
    }, [setHeldButton, triggerHaptic, viewport.isMobile, setActiveDragData, input, setInput, executeCommand, setUI, setCommandPreview]);

    const handleLogPointerUp = useCallback((e: React.PointerEvent) => {
        if (heldButton && heldButton.id.startsWith('log-inline-')) {
            setHeldButton(null);
        }
    }, [heldButton, setHeldButton]);

    return { handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp };
};
