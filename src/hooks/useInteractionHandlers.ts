import { useCallback, useRef } from 'react';
import { CustomButton, MessageType } from '../types';

export interface InteractionDeps {
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean }) => void;
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
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'character' | 'items';
        setManagerOpen: boolean;
    };
    setActiveDragData: (val: any) => void;
}

export const useInteractionHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport,
        setIsMapExpanded, setIsCharacterOpen, setIsItemsDrawerOpen,
        setInventoryLines, setEqLines, setStatsLines, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        ui, setActiveDragData
    } = deps;
    const lastLogClickRef = useRef<number>(0);

    const handleButtonClick = useCallback((button: CustomButton, e: React.MouseEvent, context?: string) => {
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
        } else {
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
                }, 500);
            }
        }
        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef]);

    const handleInputSwipe = useCallback((dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'down') {
            if (deps.ui.mapExpanded) {
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
    }, [viewport.isMobile, triggerHaptic, setIsMapExpanded, isWaitingForStats, isWaitingForEq, isWaitingForInv, setIsCharacterOpen, setIsItemsDrawerOpen, executeCommand, setStatsLines, setInventoryLines, setEqLines, ui]);

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
        // Increase threshold slightly for mobile tap latency
        const doubleTapThreshold = viewport.isMobile ? 400 : 300;

        if (now - lastLogClickRef.current < doubleTapThreshold) {
            handleLogDoubleClick(e);
            lastLogClickRef.current = 0;
            return;
        }
        lastLogClickRef.current = now;

        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (!targetEl) return;

        e.stopPropagation();
        triggerHaptic(20);

        const cmd = targetEl.getAttribute('data-cmd');
        const action = targetEl.getAttribute('data-action');
        const context = targetEl.getAttribute('data-context');

        // Use client coordinates or fallback for popover placement
        const x = e.clientX || (e.nativeEvent as MouseEvent).clientX;
        const y = e.clientY || (e.nativeEvent as MouseEvent).clientY;

        if (action === 'menu') {
            setPopoverState({
                x: x || window.innerWidth / 2,
                y: y || window.innerHeight / 2,
                setId: cmd || 'selection',
                context: context || undefined
            });
        }
        else if ((action === 'command' || action === 'preload') && cmd) {
            let finalCmd = cmd;
            if (context) {
                finalCmd = finalCmd.replace(/%n/g, context);
                // Also handle the $1 style placeholders if they were passed through
                finalCmd = finalCmd.replace(/\$1/g, context);
            }

            if (action === 'preload' || finalCmd.startsWith('input:')) {
                const isInputPrefix = finalCmd.startsWith('input:');
                const prefill = isInputPrefix ? finalCmd.slice(6) : (finalCmd + (finalCmd.endsWith(' ') ? '' : ' '));
                setInput(prefill);

                // Only trigger keyboard on mobile if it's explicitly an 'input:' command
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
        }
        else if (cmd === 'target' && context) {
            setTarget(context);
            addMessage('system', `Target set to: ${context}`);
        }
    }, [triggerHaptic, setPopoverState, executeCommand, setTarget, addMessage, handleLogDoubleClick, viewport.isMobile]);

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

    return { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick, handleDragStart, handleDragEnd };
};
