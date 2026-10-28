/** @file useButtonClicks.ts — Handles command button execution and interaction feedback. */
import React, { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { CustomButton } from '../../types';
import { shouldKeepInlineActionPopoverOpen } from '../../utils/popoverPanelUtils';
import { triggerRingAnimation, getPressedColor } from './pointerUtils';
import { perfMonitor } from '../../utils/perfMonitor';
import { decodeCommandEntities } from '../../utils/commandTextUtils';
import { resolveButtonClickCommand } from './resolveButtonClickCommand';
import { applyTacticalCommandPrefix, isFollowersCommandAction, useTacticalCommandPrefixStore } from '../../stores/useTacticalCommandPrefixStore';

// --- Logic Section ---
export const useButtonClicks = (deps: InteractionDeps) => {
    const {
        executeCommand, setInput, setTarget, addMessage, triggerHaptic, btn, joystick, target,
        popoverState, setPopoverState, setCommandPreview, wasDraggingRef, viewport, setParley, parley,
        keywordOverrides,
        handleTabClick, setCharTab,
        playClickSound, isSoundEnabled, initAudio
    } = deps;
    const applyOptimisticChange = typeof deps.applyOptimisticChange === 'function'
        ? deps.applyOptimisticChange
        : () => {};

    const handleButtonClick = useCallback((button: CustomButton & { entityId?: string, _skipInteractionFire?: boolean, _skipJoystick?: boolean }, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => perfMonitor.measureCommandSubmission(() => {
        initAudio();
        e.stopPropagation();
        if (isSoundEnabled) playClickSound();
        triggerHaptic(20);

        // Mark interaction as "fired" if we are currently holding another button (swipe combo)
        // This prevents the originating swipe button from firing its command on release.
        if (deps.setHeldButton && !button._skipInteractionFire) {
            deps.setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
        }

        if (btn.isEditMode) {
            if (button.setId !== 'Tactical' && !wasDraggingRef.current) btn.setEditingButtonId(button.id);
            return;
        }

        if (isFollowersCommandAction(button)) {
            useTacticalCommandPrefixStore.getState().armFollowers();
            setCommandPreview(null);
            return;
        }

        // --- Redirect Guildmaster Practice to Drawer ---
        if (button.id === 'btn-guildmaster-practice') {
            handleTabClick('character');
            setCharTab('skills');
            executeCommand('practice', true, true, true, true);
            return;
        }

        const targetEl = (e.currentTarget as HTMLElement);
        const keepInlinePanelOpen = shouldKeepInlineActionPopoverOpen(popoverState, window.innerWidth);
        if (popoverState && !keepInlinePanelOpen && !['menu', 'assign', 'select-assign', 'select-recipient', 'select-container'].includes(button.actionType || '')) {
            setPopoverState(null);
        }
        const isMobileMenuItem = viewport.isMobile && Boolean(targetEl?.closest('[data-menu-item="true"]'));
        if (targetEl?.classList && !isMobileMenuItem) {
            targetEl.classList.remove('btn-glow-active'); 
            void targetEl.offsetWidth; 
            targetEl.classList.add('btn-glow-active'); 

            // Trigger visual feedback ring using the button's highlight color
            const rect = targetEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const color = getPressedColor(targetEl);
            triggerRingAnimation(cx, cy, color);
        }

        const inputEl = document.querySelector('.input-field');
        const preserveInputFocus = viewport.isMobile && !!popoverState && !!inputEl && document.activeElement === inputEl;

        // --- Keyboard Focus Fix (Mobile) ---
        // If we are on mobile, and the keyboard is NOT currently open (according to viewport tracker),
        // we explicitly blur the input to ensure focus isn't "stuck" there.
        // A stuck focus causes the OS to re-trigger the keyboard on the next pointer interaction.
        if (viewport.isMobile && !viewport.isKeyboardOpen && !preserveInputFocus) {
            const inputEl = document.querySelector('.input-field') as HTMLInputElement;
            if (inputEl && document.activeElement === inputEl) {
                inputEl.blur();
            }
        }

        const { finalCmd, baseCmd, finalContext, detectedParent, consumesJoystick } = resolveButtonClickCommand({
            button, context, parentNoun, direction, target, keywordOverrides,
            popoverCategory: popoverState?.category, popoverSetId: popoverState?.setId,
            isTrackpadModifierActive: Boolean(deps.isTrackpadModifierActive),
            joystickDirection: joystick.currentDir,
            joystickTargetModifierActive: joystick.isTargetModifierActive
        });
        if (consumesJoystick) {
            joystick.setIsJoystickConsumed(true);
            joystick.setIsSwipeWheelHidden(true);
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
                isContainer,
                parentNoun,
                direction: direction || popoverState?.direction,
                entityId: button.entityId,
                type: button.command === 'give-target-select' ? 'give-target-select' : undefined
            });

            // If we are opening a menu, and 'closeKeyboard' is enabled, blur focus
            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }
            return;
        }
        else if (['assign', 'menu', 'select-assign', 'select-recipient', 'select-container'].includes(button.actionType || '')) {
            const rect = targetEl?.getBoundingClientRect();
            const eventX = (e as any).clientX !== undefined ? (e as any).clientX : (e as any).nativeEvent?.clientX;
            const eventY = (e as any).clientY !== undefined ? (e as any).clientY : (e as any).nativeEvent?.clientY;

            setPopoverState({
                x: eventX || (rect ? rect.right + 10 : window.innerWidth / 2),
                y: eventY || (rect ? rect.top : window.innerHeight / 2),
                sourceHeight: rect?.height, setId: button.command,
                context: button.actionType === 'select-assign' ? (joystick.currentDir || (joystick.isTargetModifierActive ? target : '')) : (context || button.label),
                assignSourceId: (button.actionType === 'assign' || button.actionType === 'select-assign') ? button.id : undefined,
                isContainer,
                parentNoun,
                direction: direction || popoverState?.direction,
                entityId: button.entityId,
                category: popoverState?.category,
                type: button.actionType === 'select-recipient' ? 'give-recipient-select' : (button.actionType === 'select-container' ? 'put-container-select' : undefined)
            });

            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }
        } else if (button.actionType === 'preload' || finalCmd.startsWith('input:')) {
            const isInputPrefix = finalCmd.startsWith('input:');
            const prefill = isInputPrefix ? finalCmd.slice(6) : (baseCmd + (baseCmd.endsWith(' ') ? '' : ' '));
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
            const parleyTarget = context || target || null;
            setParley({ active: true, mode: 'parley', command: 'tell', target: parleyTarget, message: '' });

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
            const isAlreadyGet = /^(get|look|take|buy|sell|mend|unsaddle)\b/i.test(finalCmd);
            if (detectedParent && finalContext && !isAlreadyGet) {
                // For nested items, finalContext (e.g. '2.boots') is the exact target
                executeCommand(`get ${finalContext} ${detectedParent}`, true, true, false, false, { fromUi: true });
            }
            const executableCmd = applyTacticalCommandPrefix(decodeCommandEntities([...(deps.heldButton?.commandPrefixes || []), finalCmd].filter(Boolean).join(' ')));
            // --- Optimistic Updates for Common Actions ---
            const firstWord = executableCmd.split(' ')[0].toLowerCase();
            const remainder = executableCmd.slice(firstWord.length).trim();
            if (firstWord === 'wear' || firstWord === 'hold') {
                applyOptimisticChange({ type: 'wear', noun: remainder });
            } else if (firstWord === 'remove') {
                applyOptimisticChange({ type: 'remove', noun: remainder });
            } else if (firstWord === 'drop') {
                const fromSource = (button.setId === 'equipmentlist' || button.setId === 'cat-worn-object') ? 'eq' : 'inv';
                applyOptimisticChange({ type: 'drop', noun: remainder, from: fromSource });
            } else if (firstWord === 'give' && remainder.includes(' ')) {
                const parts = remainder.split(' ');
                const itemNoun = parts[0];
                const fromSource = (button.setId === 'equipmentlist' || button.setId === 'cat-worn-object') ? 'eq' : 'inv';
                applyOptimisticChange({ type: 'give', noun: itemNoun, from: fromSource });
            } else if (firstWord === 'put' && remainder.includes(' ')) {
                const parts = remainder.split(' ');
                const itemNoun = parts[0];
                const containerNoun = parts[1];
                applyOptimisticChange({ type: 'put', noun: itemNoun, containerNoun });
            }

            // EXPLICITLY pass shouldFocus: false to avoid unintentional keyboard pop on mobile
            setInput('');
            setCommandPreview(executableCmd);
            executeCommand(
                executableCmd,
                false,
                false,
                false,
                false,
                { shouldFocus: preserveInputFocus, fromUi: true }
            );

            // Handle Close Keyboard feature
            if (button.trigger?.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }

            setTimeout(() => setCommandPreview(null), 150);
            if ((button.setId === 'inventorylist' || button.setId === 'equipmentlist') && remainder
                && /^(?:get|take|drop|give|put|remove|wear|wield|hold|eat|drink|quaff|recite|pour|fill|empty|light|snuff|cover|uncover|sacrifice|junk|sell|mend)$/.test(firstWord)) {
                setTimeout(() => {
                    if (button.setId === 'inventorylist' || button.command.includes('remove')) executeCommand('inv', true, true, true, true, { fromUi: true, shouldFocus: false });
                    if (button.setId === 'equipmentlist' || button.command.includes('wear') || button.command.includes('hold')) executeCommand('eq', true, true, true, true, { fromUi: true, shouldFocus: false });

                    // Refresh parent container if it was extracted from
                    if (parentNoun) {
                        // We use the parentNoun (which is the context of the parent) to refresh it
                        executeCommand(`look in ${parentNoun}`, true, true, false, false, { fromUi: true });
                    }
                }, 400);
            }
        }
        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
    }), [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef, viewport, setParley, parley, keywordOverrides, applyOptimisticChange]);

    return { handleButtonClick };
};
