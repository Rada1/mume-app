import { useCallback } from 'react';
import { CustomButton } from '../../types';
import { InteractionDeps } from './types';
import { getButtonCommand } from '../../utils/buttonUtils';

export const useButtonHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, input, setInput, target, setTarget, addMessage, triggerHaptic, btn, joystick,
        popoverState, setPopoverState, wasDraggingRef, viewport,
        setIsMapExpanded, setIsCharacterOpen, setIsItemsDrawerOpen,
        setInventoryLines, setEqLines, setStatsLines, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        ui, parley, setParley
    } = deps;

    const handleButtonClick = useCallback((button: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => {
        e.stopPropagation();

        if (btn.isEditMode) {
            if (button.setId !== 'Xbox' && !wasDraggingRef.current) btn.setEditingButtonId(button.id);
            return;
        }

        const targetEl = (e.currentTarget as HTMLElement);
        if (popoverState && !['menu', 'assign', 'select-assign', 'select-recipient', 'teleport-manage'].includes(button.actionType || '')) setPopoverState(null);
        if (targetEl?.classList) { targetEl.classList.remove('btn-glow-active'); void targetEl.offsetWidth; targetEl.classList.add('btn-glow-active'); }

        if (viewport.isMobile && !viewport.isKeyboardOpen) {
            const inputEl = document.querySelector('.input-field') as HTMLInputElement;
            if (inputEl && document.activeElement === inputEl) {
                inputEl.blur();
            }
        }

        let cmd = button.command;
        if (context) { cmd = cmd.includes('%n') ? cmd.replace(/%n/g, context) : cmd; }
        else if (cmd.includes('%n') && target) {
            cmd = cmd.replace(/%n/g, target);
        } else if (cmd.includes('%n')) {
            addMessage('system', 'No target selected.');
            return;
        }

        const { joystick: joyState, setJoystickConsumed } = (() => {
            if (!joystick || !joystick.currentDir) return { joystick: null, setJoystickConsumed: () => {} };
            return { joystick: { currentDir: joystick.currentDir, isTargetModifierActive: joystick.isTargetModifierActive }, setJoystickConsumed: joystick.setIsJoystickConsumed };
        })();

        if (button.actionType === 'menu') {
            triggerHaptic(10);
            if (popoverState && popoverState.id === button.id) setPopoverState(null);
            else setPopoverState({
                id: button.id, anchorEl: targetEl, button, context, isContainer,
                options: (button as any).inlineOptions || [], type: 'menu', parentNoun
            });
            return;
        } else if (button.actionType === 'select-assign') {
            triggerHaptic(10);
            if (popoverState && popoverState.id === button.id) setPopoverState(null);
            else setPopoverState({
                id: button.id, anchorEl: targetEl, button, type: 'select-assign'
            });
            return;
        } else if (button.actionType === 'select-recipient') {
            triggerHaptic(10);
            if (popoverState && popoverState.id === button.id) setPopoverState(null);
            else setPopoverState({
                id: button.id, anchorEl: targetEl, button, type: 'select-recipient'
            });
            return;
        } else if (button.actionType === 'assign') {
            triggerHaptic(10);
            if (popoverState && popoverState.id === button.id) setPopoverState(null);
            else setPopoverState({ id: button.id, anchorEl: targetEl, button, type: 'assign' });
            return;
        } else if (button.actionType === 'teleport-manage') {
             triggerHaptic(10);
             if (popoverState && popoverState.id === button.id) setPopoverState(null);
             else setPopoverState({ id: button.id, anchorEl: targetEl, button, type: 'teleport-manage' });
             return;
        } else if (button.actionType === 'command') {
            triggerHaptic(10);
            const finalResult = getButtonCommand(button, 0, 0, context, undefined, [], joyState, target);
            const finalCmd = finalResult?.cmd;
            if (finalCmd) {
                executeCommand(finalCmd);
                setJoystickConsumed(true);
            }
            if (popoverState) setPopoverState(null);
            return;
        } else if (button.actionType === ('swap' as any)) {
            triggerHaptic(10);
            if ((button as any).targetSet) { btn.setActiveSet((button as any).targetSet); }
            if (popoverState) setPopoverState(null);
            return;
        } else if (button.actionType === ('map' as any)) {
            triggerHaptic(10);
            if (ui.mapExpanded) { setIsMapExpanded(false); }
            else { setIsMapExpanded(true); }
            if (popoverState) setPopoverState(null);
            return;
        } else if (button.actionType === ('character' as any)) {
            triggerHaptic(10);
            setIsCharacterOpen(ui.drawer !== 'character');
            setInventoryLines([]);
            setStatsLines([]);
            setEqLines([]);
            if (ui.drawer !== 'character') {
                isWaitingForStats.current = true;
                isWaitingForEq.current = true;
                isWaitingForInv.current = true;
                executeCommand('info', true);
                setTimeout(() => { executeCommand('eq', true); }, 50);
                setTimeout(() => { executeCommand('inv', true); }, 100);
            }
            if (popoverState) setPopoverState(null);
            return;
        } else if (button.actionType === ('items' as any)) {
             triggerHaptic(10);
             setIsItemsDrawerOpen(ui.drawer !== 'items');
             if (popoverState) setPopoverState(null);
             return;
        } else if (button.actionType === ('target' as any)) {
             triggerHaptic(10);
             if (target === button.command) { setTarget(null); }
             else { setTarget(button.command); }
             if (popoverState) setPopoverState(null);
             return;
        } else if (button.actionType === ('parley' as any)) {
            triggerHaptic(10);
            if (parley?.command === button.command && parley?.active) { setParley((prev: any) => ({ ...prev, active: false })); }
            else { setParley({ active: true, command: button.command, target: target }); }
            if (popoverState) setPopoverState(null);
            return;
        } else if (button.actionType === ('input' as any)) {
             triggerHaptic(10);
             const current = input.trim();
             setInput(current ? `${current} ${cmd} ` : `${cmd} `);
             if (popoverState) setPopoverState(null);
             const inputEl = document.querySelector('.input-field') as HTMLInputElement;
             if (inputEl) { setTimeout(() => { inputEl.focus(); }, 100); }
             return;
        }

        triggerHaptic(10);
        executeCommand(cmd);
        if (popoverState) setPopoverState(null);
    }, [btn, popoverState, setPopoverState, viewport, executeCommand, triggerHaptic, target, joystick, ui, setIsMapExpanded, setIsCharacterOpen, setInventoryLines, setStatsLines, setEqLines, isWaitingForStats, isWaitingForEq, isWaitingForInv, setIsItemsDrawerOpen, setTarget, parley, setParley, input, setInput, addMessage, wasDraggingRef]);

    return { handleButtonClick };
};
