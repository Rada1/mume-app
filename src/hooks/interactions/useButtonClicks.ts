import { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { CustomButton } from '../../types';
import { sanitizeGameTarget } from '../../utils/gameUtils';

export const useButtonClicks = (deps: InteractionDeps) => {
    const {
        executeCommand, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport, setParley, parley
    } = deps;

    const handleButtonClick = useCallback((button: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => {
        e.stopPropagation();
        triggerHaptic(20);

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

        let finalContext = sanitizeGameTarget(context) || context;
        let detectedParent = parentNoun;

        // If no explicit parentNoun, try to detect it from the context (e.g. loaf.backpack)
        if (!detectedParent && finalContext && finalContext.includes('.')) {
            const parts = finalContext.split('.');
            const lastPart = parts[parts.length - 1];
            // MUME indices are numeric (e.g. food.2). Only treat as parent container if it's a noun.
            if (isNaN(parseInt(lastPart))) {
                detectedParent = lastPart;
            }
        }

        if (detectedParent && finalContext && finalContext.endsWith(`.${detectedParent}`)) {
            finalContext = finalContext.slice(0, -(detectedParent.length + 1));
        }

        let cmd = button.command;
        if (finalContext) { cmd = cmd.includes('%n') ? cmd.replace(/%n/g, finalContext) : cmd; }
        else if (cmd.includes('%n') && target) {
            cmd = cmd.replace(/%n/g, target);
        }
        if (parentNoun) { cmd = cmd.includes('%p') ? cmd.replace(/%p/g, parentNoun) : cmd; }

        let finalCmd = cmd;
        if (deps.isTrackpadModifierActive && !(button as any)._skipJoystick) {
            // Requirement 2: Trackpad Long-Press (Modifier) + Button Tap = Look <button>
            // We use the button's base noun/command as the target for the look command
            const lookTarget = button.command.trim();
            if (lookTarget && lookTarget !== '__clear_target__') {
                finalCmd = `look ${lookTarget}`;
            }
        } else if (joystick.currentDir && !(button as any)._skipJoystick) {
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
                parentNoun,
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
                parentNoun,
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
            // Prepend 'get' if item is in a container, unless the command is already a get/look/take
            const isAlreadyGet = /^(get|look|take|buy|sell|mend)\b/i.test(finalCmd);
            if (detectedParent && context && !isAlreadyGet) {
                const itemNoun = finalContext || context.split('.')[0];
                executeCommand(`get ${itemNoun} ${detectedParent}`, true, true, false, false, { fromUi: true });
            }

            // EXPLICITLY pass shouldFocus: false to avoid unintentional keyboard pop on mobile
            setCommandPreview(finalCmd); executeCommand(finalCmd, false, false, false, false, { shouldFocus: false, fromUi: true });

            // Handle Close Keyboard feature
            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }

            setTimeout(() => setCommandPreview(null), 150);
            if (button.setId === 'inventorylist' || button.setId === 'equipmentlist') {
                setTimeout(() => {
                    if (button.setId === 'inventorylist' || button.command.includes('remove')) executeCommand('inv', false, true, true, true, { fromUi: true });
                    if (button.setId === 'equipmentlist' || button.command.includes('wear') || button.command.includes('hold')) executeCommand('eq', false, true, true, true, { fromUi: true });

                    // Refresh parent container if it was extracted from
                    if (parentNoun) {
                        // We use the parentNoun (which is the context of the parent) to refresh it
                        executeCommand(`look in ${parentNoun}`, true, true, false, false, { fromUi: true });
                    }
                }, 400);
            }
        }
        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef, viewport, setParley, parley]);

    return { handleButtonClick };
};
