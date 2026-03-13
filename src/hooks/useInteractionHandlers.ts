import { useCallback, useRef } from 'react';
import { CaptureStage, CustomButton, MessageType } from '../types';
import { getButtonCommand } from '../utils/buttonUtils';

export interface InteractionDeps {
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean }) => void;
    input: string;
    setInput: (val: string) => void;
    setTarget: (val: string | null) => void;
    addMessage: (type: MessageType, text: string) => void;
    triggerHaptic: (ms: number) => void;
    btn: {
        isEditMode: boolean;
        setEditingButtonId: (id: string | null) => void;
        setActiveSet: (setId: string) => void;
        buttons: CustomButton[];
        setButtons: (fn: (prev: CustomButton[]) => CustomButton[]) => void;
    };

    joystick: {
        currentDir: string | null;
        isTargetModifierActive: boolean;
        setIsJoystickConsumed: (val: boolean) => void;
    };
    target: string | null;
    popoverState: any;
    setPopoverState: (val: any) => void;
    setCommandPreview: (val: string | null) => void;
    wasDraggingRef: React.RefObject<boolean>;
    viewport: any;
    setIsMapExpanded: (val: boolean) => void;
    setIsCharacterOpen: (val: boolean) => void;
    setIsItemsDrawerOpen: (val: boolean) => void;
    setIsSettingsOpen: (val: boolean) => void;
    setSettingsTab: (val: any) => void;
    setInventoryLines: (val: any) => void;
    setEqLines: (val: any) => void;
    setStatsLines: (val: any) => void;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    captureStage: React.MutableRefObject<CaptureStage>;
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'character' | 'items';
        setManagerOpen: boolean;
        isDrawerPeeking: boolean;
    };
    setUI: React.Dispatch<React.SetStateAction<any>>;
    setActiveDragData: (val: any) => void;
    heldButton: any;
    setHeldButton: (val: any) => void;
    parley: import('../types').ParleyState;
    setParley: React.Dispatch<React.SetStateAction<import('../types').ParleyState>>;
}

export const useInteractionHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, input, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
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

    const handleButtonClick = useCallback((button: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => {
        e.stopPropagation();
        
        if (btn.isEditMode) {
            if (button.setId !== 'Xbox' && !wasDraggingRef.current) btn.setEditingButtonId(button.id);
            return;
        }

        const targetEl = (e.currentTarget as HTMLElement);
        if (popoverState && !['menu', 'assign', 'select-assign', 'select-recipient', 'teleport-manage'].includes(button.actionType || '')) setPopoverState(null);
        if (targetEl?.classList) { targetEl.classList.remove('btn-glow-active'); void targetEl.offsetWidth; targetEl.classList.add('btn-glow-active'); }

        // --- Keyboard Focus Fix (Mobile) ---
        // If we are on mobile, and the keyboard is NOT currently open (according to viewport tracker),
        // we explicitly blur the input to ensure focus isn't "stuck" there. 
        // A stuck focus causes the OS to re-trigger the keyboard on the next pointer interaction.
        if (viewport.isMobile && !viewport.isKeyboardOpen) {
            const inputEl = document.querySelector('.input-field') as HTMLInputElement;
            if (inputEl && document.activeElement === inputEl) {
                inputEl.blur();
            }
        }

        let cmd = button.command;
        if (context) { cmd = cmd.includes('%n') ? cmd.replace(/%n/g, context) : cmd; }
        let finalCmd = cmd;
        if (joystick.currentDir && !(button as any)._skipJoystick) {
            const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
            finalCmd = `${finalCmd} ${dirMap[joystick.currentDir] || joystick.currentDir}`;
            joystick.setIsJoystickConsumed(true);
        } else if (joystick.isTargetModifierActive && target && !(button as any)._skipJoystick) {
            finalCmd = `${finalCmd} ${target}`; joystick.setIsJoystickConsumed(true);
        }

        if (button.actionType === 'nav' || button.actionType === 'menu') {
            const rect = targetEl?.getBoundingClientRect();
            const eventX = (e as any).clientX !== undefined ? (e as any).clientX : (e as any).nativeEvent?.clientX;
            const eventY = (e as any).clientY !== undefined ? (e as any).clientY : (e as any).nativeEvent?.clientY;

            setPopoverState({
                ...popoverState,
                x: eventX || (rect ? rect.right + 10 : window.innerWidth / 2),
                y: eventY || (rect ? rect.top : window.innerHeight / 2),
                setId: button.command,
                context: context || button.label,
                assignSourceId: popoverState?.assignSourceId,
                executeAndAssign: popoverState?.executeAndAssign,
                menuDisplay: popoverState?.menuDisplay,
                isContainer,
                type: undefined
            });

            // If we are opening a menu, and 'closeKeyboard' is enabled, blur focus
            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }
            return;
        }
        else if (['assign', 'menu', 'select-assign', 'select-recipient'].includes(button.actionType || '')) {
            const rect = targetEl?.getBoundingClientRect();
            const eventX = (e as any).clientX !== undefined ? (e as any).clientX : (e as any).nativeEvent?.clientX;
            const eventY = (e as any).clientY !== undefined ? (e as any).clientY : (e as any).nativeEvent?.clientY;

            setPopoverState({
                x: eventX || (rect ? rect.right + 10 : window.innerWidth / 2),
                y: eventY || (rect ? rect.top : window.innerHeight / 2),
                sourceHeight: rect?.height, setId: button.command,
                context: button.actionType === 'select-assign' ? (joystick.currentDir || (joystick.isTargetModifierActive ? target : '')) : (context || button.label),
                assignSourceId: (button.actionType === 'assign' || button.actionType === 'select-assign') ? button.id : undefined,
                executeAndAssign: button.actionType === 'select-assign', menuDisplay: button.menuDisplay,
                isContainer,
                type: button.actionType === 'select-recipient' ? 'give-recipient-select' : undefined
            });

            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }
        } else if (button.actionType === 'teleport-manage') {
            setPopoverState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150, type: 'teleport-manage', setId: 'teleport' });
        } else if (button.actionType === 'preload' || finalCmd.startsWith('input:')) {
            const isInputPrefix = finalCmd.startsWith('input:');
            const prefill = isInputPrefix ? finalCmd.slice(6) : (button.command + (button.command.endsWith(' ') ? '' : ' '));
            setInput(prefill);

            // Only trigger keyboard on mobile if it's explicitly an 'input:' command
            const shouldFocus = !viewport.isMobile || isInputPrefix;

            if (shouldFocus) {
                setTimeout(() => {
                    const inputEl = document.querySelector('input') as HTMLInputElement;
                    if (inputEl) {
                        // On mobile, we need to temporarily disable readOnly to allow focus to trigger keyboard
                        const wasReadOnly = inputEl.readOnly;
                        if (isInputPrefix && viewport.isMobile) inputEl.readOnly = false;

                        inputEl.focus();

                        // Restore readOnly after a short delay so the keyboard stays up but future taps are protected
                        if (isInputPrefix && viewport.isMobile) {
                            setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                        }

                        const len = inputEl.value.length;
                        inputEl.setSelectionRange(len, len);
                    }
                }, 10);
            }
        } else if (finalCmd === '__clear_target__' || button.command === '__clear_target__') {
            setTarget(null); addMessage('system', 'Target cleared.');
        } else if (finalCmd === '__parley__') {
            const parleyTarget = context || target || '';
            setParley({ active: true, command: parley.command || 'tell', target: parleyTarget });
            
            // Focus keyboard
            setTimeout(() => {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) {
                    const wasReadOnly = inputEl.readOnly;
                    if (viewport.isMobile) inputEl.readOnly = false;
                    inputEl.focus();
                    if (viewport.isMobile) {
                        setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                    }
                }
            }, 10);
        } else {
            // Prepend 'get' if item is in a container
            if (parentNoun && context) {
                const itemNoun = context.split('.')[0];
                executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
            }

            // EXPLICITLY pass shouldFocus: false to avoid unintentional keyboard pop on mobile
            setCommandPreview(finalCmd); executeCommand(finalCmd, false, false, false, false, { shouldFocus: false });

            // Handle Close Keyboard feature
            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }

            setTimeout(() => setCommandPreview(null), 150);
            if (button.setId === 'inventorylist' || button.setId === 'equipmentlist') {
                setTimeout(() => {
                    if (button.setId === 'inventorylist' || button.command.includes('remove')) executeCommand('inv', false, true, true, true);
                    if (button.setId === 'equipmentlist' || button.command.includes('wear') || button.command.includes('hold')) executeCommand('eq', false, true, true, true);
                    
                    // Refresh parent container if it was extracted from
                    if (parentNoun) {
                        // We use the parentNoun (which is the context of the parent) to refresh it
                        executeCommand(`look in ${parentNoun}`, true, true);
                    }
                }, 400);
            }
        }
        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef, viewport]);

    const handleInputSwipe = useCallback((dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'down') {
            if (ui.mapExpanded) {
                setIsMapExpanded(false);
            } else if (isWaitingForStats.current || isWaitingForEq.current || isWaitingForInv.current) {
                setIsItemsDrawerOpen(false); setIsCharacterOpen(false); setIsMapExpanded(false);
            } else executeCommand('s');
        } else if (dir === 'right') {
            executeCommand('stat', true, true, true, true); setIsCharacterOpen(true);
        } else if (dir === 'left') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            setIsItemsDrawerOpen(true);
        }
    }, [viewport.isMobile, triggerHaptic, setIsMapExpanded, isWaitingForStats, isWaitingForEq, isWaitingForInv, setIsCharacterOpen, setIsItemsDrawerOpen, executeCommand, ui]);

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
        const now = Date.now();
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;

        console.log('[DEBUG] handleLogClick:', {
            now,
            lastLogClick: lastLogClickRef.current,
            hasTarget: !!targetEl,
            targetText: targetEl?.innerText,
            targetCmd: targetEl?.getAttribute('data-cmd')
        });

        // --- Double-tap detection FIRST (before any targetEl guard) ---
        // This allows double-tapping on plain text to set target, not just inline buttons.
        const doubleTapThreshold = viewport.isMobile ? 400 : 300;

        if (now - lastLogClickRef.current < doubleTapThreshold) {
            console.log('[DEBUG] Double Tap Detected');
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

        console.log('[DEBUG] Inline Action:', { action, cmd, context });

        // BUTTON COMBO LOGIC: If a physical action GameButton is being held, 
        // and we tap an inline button, fire that action at this target.
        // Note: 'log-inline-' ids are inline-log tracking, not GameButton holds.
        if (heldButton && !heldButton.didFire && heldButton.baseCommand && !heldButton.id.startsWith('log-inline-')) {
            console.log('[DEBUG] Executing Button Combo:', { button: heldButton.id, target: context });
            const contextStr = context || targetEl.innerText.trim();
            // Use getButtonCommand or manually construct it if it's a simple command
            let finalCmd = heldButton.baseCommand;
            if (contextStr) {
                if (finalCmd.includes('%n')) finalCmd = finalCmd.replace(/%n/g, contextStr);
                else finalCmd = `${finalCmd} ${contextStr}`;
            }
            
            executeCommand(finalCmd);
            setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
            triggerHaptic(60);
            return;
        }

        if (action === 'menu') {
            console.log('[DEBUG] Opening Popover Menu - Position:', e.clientX, e.clientY);
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
    }, [handleLogDoubleClick, viewport.isMobile, heldButton, executeCommand, setHeldButton, triggerHaptic, setPopoverState, setInput, setTarget, addMessage]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        console.log('[DEBUG] handleLogPointerDown:', targetEl?.innerText);
        if (!targetEl) return;

        triggerHaptic(15);

        // --- Multi-touch Button Combo ---
        if (heldButton && !heldButton.didFire && heldButton.baseCommand && !heldButton.id.startsWith('log-inline-')) {
            const context = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            let finalCmd = heldButton.baseCommand;
            if (context) {
                if (finalCmd.includes('%n')) finalCmd = finalCmd.replace(/%n/g, context);
                else finalCmd = `${finalCmd} ${context}`;
            }
            executeCommand(finalCmd);
            setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
            triggerHaptic(60);
            return;
        }

        if (viewport.isMobile) {
            // Cleanup any existing timer
            if (logLongPressTimerRef.current) clearTimeout(logLongPressTimerRef.current);
            logDragStartPosRef.current = { x: e.clientX, y: e.clientY };
            isLogDraggingRef.current = false;

            const pointerId = e.pointerId;

            // Setup the long press timer for mobile "grabbing"
            logLongPressTimerRef.current = setTimeout(() => {
                if (logDragStartPosRef.current) {
                    triggerHaptic(60);
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

                    // CAPTURE POINTER
                    try { targetEl.setPointerCapture(pointerId); } catch (err) { console.error('Capture failed', err); }

                    setHeldButton((prev: any) => ({
                        ...prev,
                        isLogDragging: true,
                        x: logDragStartPosRef.current?.x || 0,
                        y: logDragStartPosRef.current?.y || 0,
                        label: label,
                        originalLabel: label
                    }));

                    console.log('[DEBUG] Mobile Inline Drag Initiated (Long Press & Scroll Locked)');
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
                                    setCommandPreview(original); // Preview just the word to append? 
                                    // Actually, if we're "appending", maybe show nothing in preview to avoid confusion with "replace"
                                    // A clean implementation is to show the word itself.
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
                    // CHECK DROP TARGET
                    const targetUnderPointer = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter');
                    
                    if (recipient && !recipient.classList.contains('dragging')) {
                        const recipientName = recipient.getAttribute('data-context');
                        const draggedNoun = context; // 'context' is from the outer handleLogPointerDown scope
                        
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
                        // Check if dropped on input bar
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

            window.addEventListener('pointermove', handleGlobalMove);
            window.addEventListener('pointerup', handleGlobalUp);
            window.addEventListener('pointercancel', handleGlobalUp);

            // Original heldButton logic for backwards compatibility
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
    }, [setHeldButton, triggerHaptic, heldButton, executeCommand, viewport.isMobile, setActiveDragData]);

    const handleLogPointerUp = useCallback((e: React.PointerEvent) => {
        // Only clear heldButton if it was set by the log's own pointerdown handler.
        // GameButton holds (no 'log-inline-' prefix) must be cleared by the GameButton's onPointerUp.
        if (heldButton && heldButton.id.startsWith('log-inline-')) {
            console.log('[DEBUG] Clearing log-inline heldButton on PointerUp');
            setHeldButton(null);
        }
    }, [heldButton, setHeldButton]);

    const handleDragStart = useCallback((e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (!targetEl) return;

        const cmd = targetEl.getAttribute('data-cmd');
        const context = targetEl.getAttribute('data-context');
        const id = targetEl.getAttribute('data-id');

        console.log('[DEBUG] Drag Start:', { cmd, context, id });

        if (context) {
            const dragData = {
                type: 'inline-btn',
                cmd: cmd,
                context: context,
                id: id
            };

            // Set global state for robust retrieval
            setActiveDragData(dragData);

            const jsonStr = JSON.stringify(dragData);
            console.log('[DEBUG] Setting Data:', jsonStr);

            // Set both types for maximum cross-browser compatibility
            e.dataTransfer.setData('application/json', jsonStr);
            e.dataTransfer.setData('text/plain', jsonStr);
            e.dataTransfer.effectAllowed = 'move';

            // Highlight that we're dragging
            targetEl.classList.add('dragging');

            triggerHaptic(10);
        }
    }, [triggerHaptic, setActiveDragData]);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (targetEl) {
            targetEl.classList.remove('dragging');
        }
        // Always clear the global state
        console.log('[DEBUG] Drag End - Clearing Global State');
        setActiveDragData(null);
    }, [setActiveDragData]);

    return { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd };
};
