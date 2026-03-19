import { useCallback, useEffect, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { getButtonCommand } from '../../utils/buttonUtils';
import { isItemContainer, sanitizeGameTarget } from '../../utils/gameUtils';

export const useLogTaps = (deps: InteractionDeps) => {
    const {
        executeCommand, input, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport,
        ui, setUI, setActiveDragData, heldButton, setHeldButton, parley, setParley,
        isTrackpadModifierActive
    } = deps;

    const lastLogClickRef = useRef<number>(0);
    const logLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLogDraggingRef = useRef(false);
    const moveCountRef = useRef(0);

    // Prevents handleLogPointerDown and handleLogClick from both firing the look command
    // for the same touch when isTrackpadModifierActive / isJoystickTargetActive is true.
    const lookModFiredRef = useRef(false);

    // Stable refs for modifier states so callbacks don't go stale between renders.
    const isTrackpadModifierActiveRef = useRef(isTrackpadModifierActive);
    const isJoystickTargetActiveRef = useRef(joystick.isTargetModifierActive);
    useEffect(() => { isTrackpadModifierActiveRef.current = isTrackpadModifierActive; }, [isTrackpadModifierActive]);
    useEffect(() => { isJoystickTargetActiveRef.current = joystick.isTargetModifierActive; }, [joystick.isTargetModifierActive]);

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
            const cleanSelection = sanitizeGameTarget(selection) || selection;
            setTarget(cleanSelection);
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
        // OR the joystick target modifier is active, apply that action to this target.
        const isLong = isJoystickTargetActiveRef.current;
        const rawContextStr = context || targetEl.innerText.trim();
        const contextStr = sanitizeGameTarget(rawContextStr) || rawContextStr;

        if (heldButton && !heldButton.didFire && !heldButton.id.startsWith('log-inline-')) {
            const sourceButton = btn.buttons.find(b => b.id === heldButton.id);
            if (sourceButton) {
                const resolved = getButtonCommand(sourceButton, heldButton.dx || 0, heldButton.dy || 0, contextStr, undefined, heldButton.modifiers || [], joystick, target, isLong);
                if (resolved?.cmd) {
                    executeCommand(resolved.cmd);
                    setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                    triggerHaptic(60);
                    return;
                }
            }

            // Fallback to legacy behavior
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
        } else if (isLong || isTrackpadModifierActiveRef.current) {
            // JOYSTICK/TRACKPAD COMBO: Look at target if modified tap.
            // Guard: skip if handleLogPointerDown already fired the look command for this touch.
            if (lookModFiredRef.current) {
                lookModFiredRef.current = false;
                return;
            }
            if (contextStr) {
                console.log(`[useLogTaps] Look Combo Triggered: target=${contextStr} (JoystickMod=${isLong}, TrackpadMod=${isTrackpadModifierActiveRef.current})`);
                executeCommand(`look ${contextStr}`);
                joystick.setIsJoystickConsumed(true);
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
            triggerHaptic(30);
        }
    }, [handleLogDoubleClick, viewport.isMobile, heldButton, executeCommand, setHeldButton, triggerHaptic, setPopoverState, setInput, setTarget, addMessage, ui.mapExpanded]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        const isShopItem = targetEl?.getAttribute('data-cmd') === 'inline-shopitem';
        const verb = isShopItem ? 'buy' : 'get';

        // --- Multi-touch Button Combo ---
        const isLong = isJoystickTargetActiveRef.current;
        const rawContextStrDown = targetEl ? (targetEl.getAttribute('data-context') || targetEl.innerText.trim()) : '';
        const contextStr = sanitizeGameTarget(rawContextStrDown) || rawContextStrDown;

        if (targetEl && heldButton && !heldButton.didFire && !heldButton.id.startsWith('log-inline-')) {
            const sourceButton = btn.buttons.find(b => b.id === heldButton.id);
            if (sourceButton) {
                const resolved = getButtonCommand(sourceButton, heldButton.dx || 0, heldButton.dy || 0, contextStr, undefined, heldButton.modifiers || [], joystick, target, isLong);
                if (resolved?.cmd) {
                    executeCommand(resolved.cmd);
                    setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                    triggerHaptic(60);
                    return;
                }
            }

            // Fallback
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
        } else if (targetEl && (isJoystickTargetActiveRef.current || isTrackpadModifierActiveRef.current)) {
             // JOYSTICK/TRACKPAD COMBO (Multi-touch down)
             if (contextStr) {
                 console.log(`[useLogTaps] Look Combo (Multi-touch) Triggered: target=${contextStr} (JoystickMod=${isJoystickTargetActiveRef.current}, TrackpadMod=${isTrackpadModifierActiveRef.current})`);
                 executeCommand(`look ${contextStr}`);
                 joystick.setIsJoystickConsumed(true);
                 triggerHaptic(60);
                 // Mark as handled so handleLogClick doesn't double-fire
                 lookModFiredRef.current = true;
                 setTimeout(() => { lookModFiredRef.current = false; }, 300);
                 return;
             }
        }

        // --- Pointer-based drag system (desktop + mobile) ---
        // Cleanup any existing timer
        if (logLongPressTimerRef.current) clearTimeout(logLongPressTimerRef.current);
        logDragStartPosRef.current = { x: e.clientX, y: e.clientY };
        isLogDraggingRef.current = false;

        const pointerId = e.pointerId;
        const x = e.clientX;
        const y = e.clientY;
        const isMobile = viewport.isMobile;

        // Helper: start the drag (shared between mobile long-press and desktop movement threshold)
        const startDrag = () => {
            if (!logDragStartPosRef.current) return;
            if (!targetEl) return;

            isLogDraggingRef.current = true;

            const cmd = targetEl.getAttribute('data-cmd') || '';
            const context = targetEl.getAttribute('data-context') || '';
            const idValue = targetEl.getAttribute('data-id') || '';
            const label = targetEl.innerText.trim();

            const dragData = { type: 'inline-btn', cmd, context, id: idValue };
            setActiveDragData(dragData);
            targetEl.classList.add('dragging');

            const logEl = document.querySelector('.message-log') as HTMLElement;
            if (logEl) {
                logEl.style.userSelect = 'none';
                logEl.style.webkitUserSelect = 'none';
                window.getSelection()?.removeAllRanges();
            }

            if (isMobile) {
                // LOCK SCROLL (mobile only — desktop doesn't need it)
                const logEl = document.querySelector('.message-log') as HTMLElement;
                if (logEl) {
                    logEl.style.overflow = 'hidden';
                    logEl.style.touchAction = 'none';
                }

                // CAPTURE POINTER (mobile only — desktop doesn't need it)
                if (targetEl.isConnected) {
                    try {
                        targetEl.setPointerCapture(pointerId);
                    } catch (err) {
                        if (!(err instanceof Error && err.name === 'InvalidStateError')) {
                            console.warn('[Interaction] Pointer capture failed:', err);
                        }
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
        };

        // Mobile: long-press timer (350ms) for both drag initiation and target selection
        if (isMobile) {
            logLongPressTimerRef.current = setTimeout(() => {
                if (logDragStartPosRef.current) {
                    triggerHaptic(60);

                    // --- TARGET SELECTION ---
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
                        const cleanSelection = sanitizeGameTarget(selection) || selection;
                        setTarget(cleanSelection);
                    }

                    if (!targetEl) return; // Exit if just text selection, no drag

                    startDrag();
                }
            }, 350);
        }

        // Add global listeners to handle move and up
        const handleGlobalMove = (moveEvent: PointerEvent) => {
            if (isLogDraggingRef.current) {
                // Update ghost position
                setHeldButton((prev: any) => prev ? { ...prev, x: moveEvent.clientX, y: moveEvent.clientY } : null);

                // --- Drawer Peeking Logic ---
                const drawerElMove = document.querySelector('.right-drawer') as HTMLElement | null;
                const drawerRectMove = drawerElMove?.getBoundingClientRect();
                const isOverDrawerMove = !!(drawerRectMove &&
                    moveEvent.clientX >= drawerRectMove.left && moveEvent.clientX <= drawerRectMove.right &&
                    moveEvent.clientY >= drawerRectMove.top && moveEvent.clientY <= drawerRectMove.bottom);

                if (isOverDrawerMove || moveEvent.clientX > window.innerWidth - 80) {
                    setUI((prev: any) => prev.isDrawerPeeking ? prev : { ...prev, isDrawerPeeking: true });
                } else if (moveEvent.clientX < window.innerWidth - 150) {
                    setUI((prev: any) => !prev.isDrawerPeeking ? prev : { ...prev, isDrawerPeeking: false });
                }

                // --- Label & Preview Logic ---
                moveCountRef.current++;
                if (moveCountRef.current % 2 === 0) {
                    const isNearEdge = isOverDrawerMove || moveEvent.clientX > window.innerWidth - 80;

                    if (isNearEdge) {
                         // Check which section we're hovering over in the peeked drawer
                         const elUnder = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                         const overEquip = elUnder?.closest('[data-drawer-section="equipmentlist"]');
                         const overInv = elUnder?.closest('[data-drawer-section="inventorylist"]');
                         document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

                         if (overEquip) {
                             overEquip.querySelector('.drawer-section-drop-zone')?.classList.add('drop-hover-active');
                             setHeldButton((prev: any) => {
                                 if (!prev) return null;
                                 const original = prev.originalLabel || prev.label;
                                 const newLabel = `${verb} + wear ${original}`;
                                 if (prev.label === newLabel) return prev;
                                 setCommandPreview(newLabel);
                                 return { ...prev, label: newLabel };
                             });
                         } else if (overInv) {
                             overInv.querySelector('.drawer-section-drop-zone')?.classList.add('drop-hover-active');
                             setHeldButton((prev: any) => {
                                 if (!prev) return null;
                                 const original = prev.originalLabel || prev.label;
                                 const newLabel = `${verb} ${original}`;
                                 if (prev.label === newLabel) return prev;
                                 setCommandPreview(newLabel);
                                 return { ...prev, label: newLabel };
                             });
                         } else {
                             overInv?.querySelector('.drawer-section-drop-zone')?.classList.add('drop-hover-active');
                             setHeldButton((prev: any) => {
                                 if (!prev) return null;
                                 const original = prev.originalLabel || prev.label;
                                 const newLabel = `${verb} ${original}`;
                                 if (prev.label === newLabel) return prev;
                                 setCommandPreview(newLabel);
                                 return { ...prev, label: newLabel };
                             });
                         }
                    } else {
                        const targetUnderPointer = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                        const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter');
                        const isOverInput = targetUnderPointer?.closest('.input-area');

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
                                    const newLabel = isShopItem ? `buy + give ${original} ${recipientName}` : `give ${original} ${recipientName}`;
                                    if (prev.label === newLabel) return prev;
                                    setCommandPreview(newLabel);
                                    return { ...prev, label: newLabel };
                                });
                            }
                        } else {
                            const targetCandidate = targetUnderPointer?.closest('.inline-btn');
                            const candidateContext = targetCandidate?.getAttribute('data-context') || targetCandidate?.textContent?.trim();
                            if (targetCandidate && candidateContext && isItemContainer(candidateContext) && !targetCandidate.classList.contains('dragging')) {
                                targetCandidate.classList.add('drop-hover-active');
                                setHeldButton((prev: any) => {
                                    if (!prev) return null;
                                    const original = prev.originalLabel || prev.label;
                                    const newLabel = `${verb} + put ${original} ${candidateContext}`;
                                    if (prev.label === newLabel) return prev;
                                    setCommandPreview(newLabel);
                                    return { ...prev, label: newLabel };
                                });
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
                }
            } else if (logDragStartPosRef.current) {
                const dx = Math.abs(moveEvent.clientX - logDragStartPosRef.current.x);
                const dy = Math.abs(moveEvent.clientY - logDragStartPosRef.current.y);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (!isMobile && dist > 8 && targetEl) {
                    // Desktop: movement threshold triggers drag immediately
                    if (logLongPressTimerRef.current) {
                        clearTimeout(logLongPressTimerRef.current);
                        logLongPressTimerRef.current = null;
                    }
                    startDrag();
                } else if (isMobile && dist > 12) {
                    // Mobile: movement cancels the long-press timer
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
                const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter, [data-player-name]');

                if (recipient && !recipient.classList.contains('dragging')) {
                    const recipientName = recipient.getAttribute('data-context') || recipient.getAttribute('data-player-name');
                    const rawDraggedContext = targetEl?.getAttribute('data-context');
                    const draggedContext = sanitizeGameTarget(rawDraggedContext) || rawDraggedContext;
                    if (draggedContext && recipientName) {
                        triggerHaptic(60);
                        if (isShopItem) {
                            executeCommand(`buy ${draggedContext}`);
                            setTimeout(() => executeCommand(`give ${draggedContext} ${recipientName}`), 125);
                        } else {
                            executeCommand(`give ${draggedContext} ${recipientName}`);
                        }
                    }
                } else {
                    const roomContainer = targetUnderPointer?.closest('.inline-btn:not(.dragging)');
                    const roomContainerContext = roomContainer?.getAttribute('data-context') || roomContainer?.textContent?.trim();
                    const rawDraggedContext2 = targetEl?.getAttribute('data-context');
                    const draggedContext = sanitizeGameTarget(rawDraggedContext2) || rawDraggedContext2;

                    if (roomContainer && roomContainerContext && isItemContainer(roomContainerContext) && draggedContext) {
                        triggerHaptic(60);
                        executeCommand(`${verb} ${draggedContext}`);
                        setTimeout(() => executeCommand(`put ${draggedContext} ${roomContainerContext}`), 125);
                    } else {
                        const drawerContainer = targetUnderPointer?.closest('.is-container');
                        const drawerElUp = document.querySelector('.right-drawer') as HTMLElement | null;
                        const drawerRectUp = drawerElUp?.getBoundingClientRect();
                        const isOverDrawerUp = !!(drawerRectUp &&
                            upEvent.clientX >= drawerRectUp.left && upEvent.clientX <= drawerRectUp.right &&
                            upEvent.clientY >= drawerRectUp.top && upEvent.clientY <= drawerRectUp.bottom);

                        if (drawerContainer && draggedContext) {
                            const containerName = drawerContainer.getAttribute('data-item-name');
                            if (containerName) {
                                triggerHaptic(60);
                                executeCommand(`${verb} ${draggedContext}`, true, true);
                                setTimeout(() => executeCommand(`put ${draggedContext} ${containerName}`), 125);
                            }
                        } else if (draggedContext && (isOverDrawerUp || upEvent.clientX > window.innerWidth - 80)) {
                            triggerHaptic(40);
                            const overEquipDrop = targetUnderPointer?.closest('[data-drawer-section="equipmentlist"]');
                            if (overEquipDrop) {
                                executeCommand(`${verb} ${draggedContext}`);
                                setTimeout(() => executeCommand(`wear ${draggedContext}`), 125);
                            } else {
                                executeCommand(`${verb} ${draggedContext}`);
                            }
                        } else if (targetUnderPointer?.closest('.input-area')) {
                            if (draggedContext) {
                                triggerHaptic(30);
                                const trimmed = input.trim();
                                setInput(trimmed ? `${trimmed} ${draggedContext} ` : `${draggedContext} `);
                            }
                        }
                    }
                }

                // RESTORE SELECTION & SCROLL
                const logEl = document.querySelector('.message-log') as HTMLElement;
                if (logEl) {
                    logEl.style.userSelect = 'auto';
                    logEl.style.webkitUserSelect = 'auto';
                    if (isMobile) {
                        logEl.style.overflow = 'auto';
                        logEl.style.touchAction = 'pan-y';
                    }
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

        // Original heldButton logic for backwards compatibility (mobile only)
        // On desktop, heldButton is only set when a drag actually starts (inside startDrag()),
        // so we don't set it speculatively on every pointerdown — that causes re-renders that
        // interfere with the click handler and produce a false "double glow" on desktop.
        if (isMobile && targetEl) {
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
    }, [setHeldButton, triggerHaptic, heldButton, executeCommand, viewport, setActiveDragData, setTarget, addMessage, input, setInput, setUI, setCommandPreview, joystick]);

    const handleLogPointerUp = useCallback((e: React.PointerEvent) => {
        // Only clear heldButton if it was set by the log's own pointerdown handler.
        // GameButton holds (no 'log-inline-' prefix) must be cleared by the GameButton's onPointerUp.
        if (heldButton && heldButton.id?.startsWith('log-inline-')) {
            setHeldButton(null);
        }
    }, [heldButton, setHeldButton]);

    return { handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp };
};
