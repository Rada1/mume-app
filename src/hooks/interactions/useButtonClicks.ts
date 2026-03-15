import { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { CustomButton } from '../../types';

export const useButtonClicks = (deps: InteractionDeps) => {
    const {
        executeCommand, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport, setParley, parley
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
        else if (cmd.includes('%n') && target) {
            cmd = cmd.replace(/%n/g, target);
        }

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
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef, viewport, setParley, parley]);

    return { handleButtonClick };
};
