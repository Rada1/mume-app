import { useCallback, useRef } from 'react';
import { CustomButton, MessageType } from '../types';

export interface InteractionDeps {
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
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
}

export const useInteractionHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport,
        setIsMapExpanded, setIsCharacterOpen, setIsItemsDrawerOpen,
        setInventoryLines, setEqLines, setStatsLines, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        ui
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

        let cmd = button.command;
        if (context) { cmd = cmd.includes('%n') ? cmd.replace(/%n/g, context) : `${cmd} ${context}`; }
        let finalCmd = cmd;
        if (joystick.currentDir) {
            const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
            finalCmd = `${finalCmd} ${dirMap[joystick.currentDir] || joystick.currentDir}`;
            joystick.setIsJoystickConsumed(true);
        } else if (joystick.isTargetModifierActive && target) {
            finalCmd = `${finalCmd} ${target}`; joystick.setIsJoystickConsumed(true);
        }

        if (button.actionType === 'nav') btn.setActiveSet(button.command);
        else if (['assign', 'menu', 'select-assign', 'select-recipient'].includes(button.actionType || '')) {
            const rect = targetEl?.getBoundingClientRect();
            setPopoverState({
                x: rect ? rect.right + 10 : (e as any).clientX || window.innerWidth / 2,
                y: rect ? rect.top : (e as any).clientY || window.innerHeight / 2,
                sourceHeight: rect?.height, setId: button.command,
                context: button.actionType === 'select-assign' ? (joystick.currentDir || (joystick.isTargetModifierActive ? target : '')) : (context || button.label),
                assignSourceId: (button.actionType === 'assign' || button.actionType === 'select-assign') ? button.id : undefined,
                executeAndAssign: button.actionType === 'select-assign', menuDisplay: button.menuDisplay,
                type: button.actionType === 'select-recipient' ? 'give-recipient-select' : undefined
            });
        } else if (button.actionType === 'teleport-manage') {
            setPopoverState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150, type: 'teleport-manage', setId: 'teleport' });
        } else if (button.actionType === 'preload') {
            setInput(button.command + ' '); (document.querySelector('input') as HTMLElement)?.focus();
        } else if (finalCmd === '__clear_target__' || button.command === '__clear_target__') {
            setTarget(null); addMessage('system', 'Target cleared.');
        } else {
            setCommandPreview(finalCmd); executeCommand(finalCmd, false, false);
            setTimeout(() => setCommandPreview(null), 150);
            if (button.setId === 'inventorylist' || button.setId === 'equipmentlist') {
                setTimeout(() => {
                    if (button.setId === 'inventorylist' || button.command.includes('remove')) executeCommand('inv', false, true, true, true);
                    if (button.setId === 'equipmentlist' || button.command.includes('wear') || button.command.includes('hold')) executeCommand('eq', false, true, true, true);
                }, 500);
            }
        }
        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
        if (button.trigger?.closeKeyboard) (document.activeElement as HTMLElement)?.blur();
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef]);

    const handleInputSwipe = useCallback((dir: string) => {
        if (!viewport.isMobile) return;
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
        else if (action === 'command' && cmd) {
            const finalCmd = context ? (cmd.includes('%n') ? cmd.replace(/%n/g, context) : `${cmd} ${context}`) : cmd;
            executeCommand(finalCmd);
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

        if (context) {
            const dragData = {
                type: 'inline-btn',
                cmd: cmd,
                context: context,
                id: id
            };
            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'move';

            // Highlight that we're dragging
            targetEl.classList.add('dragging');

            triggerHaptic(10);
        }
    }, [triggerHaptic]);

    return { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick, handleDragStart };
};
