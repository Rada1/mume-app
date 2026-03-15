import { useCallback, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';

export const useLogTaps = (deps: InteractionDeps) => {
    const {
        executeCommand, input, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport,
        ui, setUI, setActiveDragData, heldButton, setHeldButton, parley, setParley
    } = deps;

    const lastLogClickRef = useRef<number>(0);
    const logLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLogDraggingRef = useRef(false);
    const moveCountRef = useRef(0);

    const handleLogDoubleClick = useCallback((e: React.MouseEvent) => {
        let selection = window.getSelection()?.toString().trim();

        // Mobile fallback: Rapid taps often don't resolve selection in JS before the event fires,
        // or browser selection has been suppressed by CSS rules.
        if (!selection) {
            const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
            if (targetEl) {
                selection = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            } else {
                // If tapping plain text, try to find the word under the tap coordinates
                const ev = e.nativeEvent as any;
                const x = ev.clientX || (ev.touches?.[0]?.clientX);
                const y = ev.clientY || (ev.touches?.[0]?.clientY);

                if (x !== undefined && y !== undefined) {
                    let range: Range | null = null;
                    // Try exact point first
                    if ((document as any).caretRangeFromPoint) {
                        range = (document as any).caretRangeFromPoint(x, y);
                    }

                    // If no range or not a text node, try a small radius for better "fat finger" support
                    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
                        const offsets = [
                            { dx: -5, dy: -5 }, { dx: 5, dy: -5 },
                            { dx: -5, dy: 5 }, { dx: 5, dy: 5 },
                            { dx: 0, dy: -10 }, { dx: 0, dy: 10 }
                        ];
                        for (const offset of offsets) {
                            const r = (document as any).caretRangeFromPoint(x + offset.dx, y + offset.dy);
                            if (r && r.startContainer.nodeType === Node.TEXT_NODE) {
                                range = r;
                                break;
                            }
                        }
                    }

                    if (range) {
                        const node = range.startContainer;
                        const offset = range.startOffset;
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent || "";
                            // Improved word boundary detection: find nearest non-whitespace/non-punctuation cluster
                            const beforeStr = text.slice(0, offset);
                            const afterStr = text.slice(offset);

                            const beforeWord = beforeStr.match(/(\w+)$/)?.[1] || "";
                            const afterWord = afterStr.match(/^(\w+)/)?.[1] || "";

                            selection = (beforeWord + afterWord).trim();
                        }
                    }
                }
            }
        }

        if (selection) {
            setTarget(selection);
            addMessage('system', `Target set to: ${selection}`);
            triggerHaptic(30);

            try {
                window.getSelection()?.removeAllRanges();
            } catch (err) {
                // Ignore failures to clear
            }
        }
    }, [setTarget, addMessage, triggerHaptic]);

    const handleLogClick = useCallback((e: React.MouseEvent) => {
        // IGNORE log clicks if the map is expanded on mobile to prevent accidental minimization
        if (ui.mapExpanded && viewport.isMobile) return;

        const now = Date.now();
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;

        // --- Double-tap detection FIRST (before any targetEl guard) ---
        // This allows double-tapping on plain text to set target, not just inline buttons.
        const doubleTapThreshold = viewport.isMobile ? 400 : 300;

        if (now - lastLogClickRef.current < doubleTapThreshold) {
            lastLogClickRef.current = 0;
            // If an inline btn was double-tapped, pass its context as the selection
            if (targetEl) {
                const context = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
                if (context) {
                    setTarget(context);
                    addMessage('system', `Target set to: ${context}`);
                    triggerHaptic(30);
                    e.stopPropagation();
                }
            } else {
                handleLogDoubleClick(e);
            }
            return;
        }
        lastLogClickRef.current = now;

        // After double-tap check, single-tap only works on inline buttons
        if (!targetEl) return;

        // Stop propagation to prevent message log selection or container clicks
        e.stopPropagation();

        const cmd = targetEl.getAttribute('data-cmd');
        const context = targetEl.getAttribute('data-context');
        const action = targetEl.getAttribute('data-action');
        const menuDisplay = targetEl.getAttribute('data-menu-display') as 'dial' | 'list' || undefined;

        // BUTTON COMBO LOGIC: If a physical action GameButton is being held,
        // and we tap an inline button, fire that action at this target.
        // Note: 'log-inline-' ids are inline-log tracking, not GameButton holds.
        if (heldButton && !heldButton.didFire && !heldButton.id.startsWith('log-inline-')) {
            const contextStr = context || targetEl.innerText.trim();
            const isLong = joystick.isTargetModifierActive;
            let finalCmd = isLong ? (heldButton.longCommand || heldButton.baseCommand) : heldButton.baseCommand;

            if (finalCmd) {
                if (contextStr) {
                    if (finalCmd.includes('%n')) finalCmd = finalCmd.replace(/%n/g, contextStr);
                    else finalCmd = `${finalCmd} ${contextStr}`;
                }

                executeCommand(finalCmd);
                setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                triggerHaptic(60);
                return;
            }
        }

        if (action === 'menu') {
            setPopoverState({
                x: e.clientX || (e.nativeEvent as MouseEvent).clientX,
                y: e.clientY || (e.nativeEvent as MouseEvent).clientY,
                setId: cmd || 'selection',
                context: context || undefined,
                menuDisplay
            });
        } else if ((action === 'command' || action === 'preload') && cmd) {
            let finalCmd = cmd;
            if (context) {
                finalCmd = finalCmd.replace(/%n/g, context).replace(/\$1/g, context);
            }

            if (action === 'preload' || finalCmd.startsWith('input:')) {
                const isInputPrefix = finalCmd.startsWith('input:');
                const prefill = isInputPrefix ? finalCmd.slice(6) : (finalCmd + (finalCmd.endsWith(' ') ? '' : ' '));
                setInput(prefill);

                const shouldFocus = !viewport.isMobile || isInputPrefix;
                if (shouldFocus) {
                    setTimeout(() => {
                        const inputEl = document.querySelector('input') as HTMLInputElement;
                        if (inputEl) {
                            const wasReadOnly = inputEl.readOnly;
                            if (isInputPrefix && viewport.isMobile) inputEl.readOnly = false;
                            inputEl.focus();
                            if (isInputPrefix && viewport.isMobile) {
                                setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                            }
                            const len = inputEl.value.length;
                            inputEl.setSelectionRange(len, len);
                        }
                    }, 10);
                }
            } else {
                executeCommand(finalCmd, false, false, false, false, { shouldFocus: false });
            }
            triggerHaptic(40);
        } else if (cmd === 'target' && context) {
            setTarget(context);
            addMessage('system', `Target set to: ${context}`);
            triggerHaptic(30);
        }
    }, [handleLogDoubleClick, viewport.isMobile, heldButton, executeCommand, setHeldButton, triggerHaptic, setPopoverState, setInput, setTarget, addMessage, ui.mapExpanded]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;

        // --- Multi-touch Button Combo ---
        if (targetEl && heldButton && !heldButton.didFire && !heldButton.id.startsWith('log-inline-')) {
            const context = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            const isLong = joystick.isTargetModifierActive;
            let finalCmd = isLong ? (heldButton.longCommand || heldButton.baseCommand) : heldButton.baseCommand;

            if (finalCmd) {
                if (context) {
                    if (finalCmd.includes('%n')) finalCmd = finalCmd.replace(/%n/g, context);
                    else finalCmd = `${finalCmd} ${context}`;
                }

                executeCommand(finalCmd);
                setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                triggerHaptic(60);
                return;
            }
        }

        if (viewport.isMobile) {
            // Cleanup any existing timer
            if (logLongPressTimerRef.current) clearTimeout(logLongPressTimerRef.current);
            logDragStartPosRef.current = { x: e.clientX, y: e.clientY };
            isLogDraggingRef.current = false;

            const pointerId = e.pointerId;
            const x = e.clientX;
            const y = e.clientY;

            // Setup the long press timer for both dragging (items) and target selection (text)
            logLongPressTimerRef.current = setTimeout(() => {
                if (logDragStartPosRef.current) {
                    triggerHaptic(60);

                    // --- TARGET SELECTION (NEW) ---
                    let selection = "";
                    if (targetEl) {
                        selection = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
                    } else {
                        // Word detection logic (matching double-click behavior)
                        let range: Range | null = null;
                        if ((document as any).caretRangeFromPoint) {
                            range = (document as any).caretRangeFromPoint(x, y);
                        }
                        if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
                            const offsets = [{ dx: -5, dy: -5 }, { dx: 5, dy: -5 }, { dx: -5, dy: 5 }, { dx: 5, dy: 5 }];
                            for (const offset of offsets) {
                                const r = (document as any).caretRangeFromPoint(x + offset.dx, y + offset.dy);
                                if (r && r.startContainer.nodeType === Node.TEXT_NODE) {
                                    range = r;
                                    break;
                                }
                            }
                        }
                        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                            const node = range.startContainer;
                            const offset = range.startOffset;
                            const text = node.textContent || "";
                            const beforeStr = text.slice(0, offset);
                            const afterStr = text.slice(offset);
                            const beforeWord = beforeStr.match(/(\w+)$/)?.[1] || "";
                            const afterWord = afterStr.match(/^(\w+)/)?.[1] || "";
                            selection = (beforeWord + afterWord).trim();
                        }
                    }

                    if (selection) {
                        setTarget(selection);
                        addMessage('system', `Target set to: ${selection}`);
                    }

                    if (!targetEl) return; // Exit if just text selection, no drag

                    isLogDraggingRef.current = true;

                    const cmd = targetEl.getAttribute('data-cmd') || '';
                    const context = targetEl.getAttribute('data-context') || '';
                    const idValue = targetEl.getAttribute('data-id') || '';
                    const label = targetEl.innerText.trim();

                    const dragData = { type: 'inline-btn', cmd, context, id: idValue };
                    setActiveDragData(dragData);
                    targetEl.classList.add('dragging');

                    // LOCK SCROLL
                    const logEl = document.querySelector('.message-log') as HTMLElement;
                    if (logEl) {
                        logEl.style.overflow = 'hidden';
                        logEl.style.touchAction = 'none';
                    }

                    // CAPTURE POINTER - Only if still connected
                    if (targetEl.isConnected) {
                        try {
                            targetEl.setPointerCapture(pointerId);
                        } catch (err) {
                            if (!(err instanceof Error && err.name === 'InvalidStateError')) {
                                console.warn('[Interaction] Pointer capture failed:', err);
                            }
                        }
                    }

                    setHeldButton((prev: any) => ({
                        ...prev,
                        isLogDragging: true,
                        x: logDragStartPosRef.current?.x || 0,
                        y: logDragStartPosRef.current?.y || 0,
                        label: label,
                        originalLabel: label
                    }));

                }
            }, 350);

            // Add global listeners to handle move (cancel if moved too far) and up (clear timer)
            const handleGlobalMove = (moveEvent: PointerEvent) => {
                if (isLogDraggingRef.current) {
                    // Update ghost position
                    setHeldButton((prev: any) => prev ? { ...prev, x: moveEvent.clientX, y: moveEvent.clientY } : null);

                    // --- Drawer Peeking Logic ---
                    if (moveEvent.clientX > window.innerWidth - 80) {
                        setUI((prev: any) => prev.isDrawerPeeking ? prev : { ...prev, isDrawerPeeking: true });
                    } else if (moveEvent.clientX < window.innerWidth - 150) {
                        setUI((prev: any) => !prev.isDrawerPeeking ? prev : { ...prev, isDrawerPeeking: false });
                    }

                    // --- Label & Preview Logic ---
                    moveCountRef.current++;
                    if (moveCountRef.current % 2 === 0) {
                        const isNearEdge = moveEvent.clientX > window.innerWidth - 80;

                        if (isNearEdge) {
                             // "Get" takes priority at the edge for drawers
                             setHeldButton((prev: any) => {
                                if (!prev) return null;
                                const original = prev.originalLabel || prev.label;
                                const newLabel = `get ${original}`;
                                if (prev.label === newLabel) return prev;
                                setCommandPreview(newLabel);
                                return { ...prev, label: newLabel };
                             });
                             // Cleanup log targeting highlights
                             document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
                        } else {
                            const targetUnderPointer = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                            const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter');
                            const isOverInput = targetUnderPointer?.closest('.input-area');

                            // Cleanup previous highlights
                            document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

                            if (isOverInput) {
                                isOverInput.classList.add('drop-hover-active');
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
                                // Revert to original label if not hovering anything special
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
                    if (Math.sqrt(dx * dx + dy * dy) > 5) { // Tighter threshold
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
                        const draggedContext = targetEl?.getAttribute('data-context');
                        if (draggedContext && recipientName) {
                            triggerHaptic(60);
                            executeCommand(`give ${draggedContext} ${recipientName}`);
                        }
                    } else if (upEvent.clientX > window.innerWidth - 80) {
                        const draggedContext = targetEl?.getAttribute('data-context');
                        if (draggedContext) {
                            triggerHaptic(40);
                            executeCommand(`get ${draggedContext}`);
                        }
                    } else {
                        const targetUnderPointer = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                        if (targetUnderPointer?.closest('.input-area')) {
                            const draggedContext = targetEl?.getAttribute('data-context');
                            if (draggedContext) {
                                triggerHaptic(30);
                                const trimmed = input.trim();
                                setInput(trimmed ? `${trimmed} ${draggedContext} ` : `${draggedContext} `);
                            }
                        }
                    }

                    // RESTORE SCROLL
                    const logEl = document.querySelector('.message-log') as HTMLElement;
                    if (logEl) {
                        logEl.style.overflow = 'auto';
                        logEl.style.touchAction = 'pan-y';
                    }

                    // RESTORE PEEK
                    setUI((prev: any) => ({ ...prev, isDrawerPeeking: false }));
                }

                // Global Cleanup
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

            // Cleanup previous listeners if any (guard against rapid restarts)
            window.removeEventListener('pointermove', handleGlobalMove);
            window.removeEventListener('pointerup', handleGlobalUp as any);
            window.removeEventListener('pointercancel', handleGlobalUp as any);

            window.addEventListener('pointermove', handleGlobalMove);
            window.addEventListener('pointerup', handleGlobalUp);
            window.addEventListener('pointercancel', handleGlobalUp);

            // Original heldButton logic for backwards compatibility (only if targetEl exists)
            if (targetEl) {
                const id = 'log-inline-' + (targetEl.getAttribute('data-id') || Math.random());
                const cmd = targetEl.getAttribute('data-cmd') || '';
                const context = targetEl.getAttribute('data-context') || '';
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
        }
    }, [setHeldButton, triggerHaptic, heldButton, executeCommand, viewport, setActiveDragData, setTarget, addMessage, input, setInput, setUI, setCommandPreview, joystick]);

    const handleLogPointerUp = useCallback((e: React.PointerEvent) => {
        // Only clear heldButton if it was set by the log's own pointerdown handler.
        // GameButton holds (no 'log-inline-' prefix) must be cleared by the GameButton's onPointerUp.
        if (heldButton && heldButton.id.startsWith('log-inline-')) {
            setHeldButton(null);
        }
    }, [heldButton, setHeldButton]);

    return { handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp };
};
