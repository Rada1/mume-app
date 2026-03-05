import { useCallback } from 'react';
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
    setIsInventoryOpen: (val: boolean) => void;
    setIsCharacterOpen: (val: boolean) => void;
    setIsRightDrawerOpen: (val: boolean) => void;
    setInventoryLines: (val: any) => void;
    setEqLines: (val: any) => void;
    setStatsLines: (val: any) => void;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'inventory' | 'character' | 'right';
        setManagerOpen: boolean;
    };
}

export const useInteractionHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport,
        setIsMapExpanded, setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen,
        setInventoryLines, setEqLines, setStatsLines, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        ui
    } = deps;

    const handleButtonClick = useCallback((button: CustomButton, e: React.MouseEvent, context?: string) => {
        e.stopPropagation();
        if (btn.isEditMode) {
            if (!wasDraggingRef.current) btn.setEditingButtonId(button.id);
            return;
        }

        const targetEl = (e.currentTarget as HTMLElement);
        if (popoverState && !['menu', 'assign', 'select-assign', 'select-recipient', 'teleport-manage'].includes(button.actionType || '')) setPopoverState(null);
        if (targetEl?.classList) { targetEl.classList.remove('btn-glow-active'); void targetEl.offsetWidth; targetEl.classList.add('btn-glow-active'); }
        triggerHaptic(15);

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
                setIsInventoryOpen(false); setIsRightDrawerOpen(false); setIsCharacterOpen(false); setIsMapExpanded(false);
            } else executeCommand('s');
        } else if (dir === 'right') {
            setStatsLines([]); executeCommand('stat', false, true, true); setIsCharacterOpen(true);
        } else if (dir === 'left') {
            setInventoryLines([]); setEqLines([]); executeCommand('inventory', false, true, true, true);
            setTimeout(() => executeCommand('eq', false, true, true, true), 300);
            setIsRightDrawerOpen(true);
        }
    }, [viewport.isMobile, triggerHaptic, setIsMapExpanded, isWaitingForStats, isWaitingForEq, isWaitingForInv, setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen, executeCommand, setStatsLines, setInventoryLines, setEqLines, ui]);

    const handleLogClick = useCallback((e: React.MouseEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (!targetEl) return;
        e.stopPropagation(); triggerHaptic(20);
        const cmd = targetEl.getAttribute('data-cmd'), action = targetEl.getAttribute('data-action'), context = targetEl.getAttribute('data-context');
        if (action === 'menu') setPopoverState({ x: e.clientX, y: e.clientY, setId: cmd || 'selection', context: context || undefined });
        else if (action === 'command' && cmd) executeCommand(context ? (cmd.includes('%n') ? cmd.replace(/%n/g, context) : `${cmd} ${context}`) : cmd);
        else if (cmd === 'target' && context) { setTarget(context); addMessage('system', `Target set to: ${context}`); }
    }, [triggerHaptic, setPopoverState, executeCommand, setTarget, addMessage]);

    const handleLogDoubleClick = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection()?.toString().trim();
        if (selection) {
            setTarget(selection);
            addMessage('system', `Target set to: ${selection}`);
            triggerHaptic(30);
        }
    }, [setTarget, addMessage, triggerHaptic]);

    return { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick };
};
