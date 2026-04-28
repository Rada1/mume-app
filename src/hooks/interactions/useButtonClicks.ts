import React, { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { CustomButton } from '../../types';
import { sanitizeGameTarget } from '../../utils/gameUtils';
import { triggerRingAnimation, getPressedColor } from './pointerUtils';

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

    const handleButtonClick = useCallback((button: CustomButton & { entityId?: string, _skipInteractionFire?: boolean }, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => {
        console.log('[useButtonClicks] handleButtonClick:', { 
            buttonId: button.id, 
            actionType: button.actionType,
            command: button.command,
            context,
            direction: direction || popoverState?.direction,
            isEditMode: btn.isEditMode
        });
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
        
        // --- Redirect Guildmaster Practice to Drawer ---
        if (button.id === 'cat-guildmaster-practice') {
            handleTabClick('character');
            setCharTab('skills');
            executeCommand('practice', true, true, true, true);
            return;
        }

        const targetEl = (e.currentTarget as HTMLElement);
        if (popoverState && !['menu', 'assign', 'select-assign', 'select-recipient', 'select-container', 'teleport-manage'].includes(button.actionType || '')) setPopoverState(null);
        if (targetEl?.classList) { 
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

        const effectiveContext = (context && keywordOverrides[context]) ? keywordOverrides[context] : context;
        console.log('[useButtonClicks] context resolution:', { context, effectiveContext, keywordOverride: context ? keywordOverrides[context] : undefined });
        let finalContext = sanitizeGameTarget(effectiveContext) || effectiveContext || '';
        console.log('[useButtonClicks] finalContext:', finalContext);
        let detectedParent = parentNoun;

        // If no explicit parentNoun, try to detect it from the context (e.g. food.2.backpack or 2.boots.backpack)
        if (!detectedParent && finalContext && finalContext.includes('.')) {
            const parts = finalContext.split('.');
            // If it ends with a known container noun (e.g. .backpack), that's the parent.
            const lastPart = parts[parts.length - 1];
            if (isNaN(parseInt(lastPart))) {
                detectedParent = lastPart;
            }
        }

        // If we found a parent container in the context string, strip it to get the item target
        if (detectedParent && finalContext && finalContext.endsWith(`.${detectedParent}`)) {
            finalContext = finalContext.slice(0, -(detectedParent.length + 1));
        }

        // MUME Duplicate Handling:
        // finalContext might be '2.boots' or 'food.2'. 
        // We want to keep '2.boots' as is. If it's 'food.2', sanitizeGameTarget might have 
        // messed with it, but here we prioritize the keyword if available.

        let cmd = button.command;
        if (finalContext) { cmd = cmd.includes('%n') ? cmd.replace(/%n/g, finalContext) : cmd; }
        else if (cmd.includes('%n') && target) {
            cmd = cmd.replace(/%n/g, target);
        }
        if (parentNoun) { cmd = cmd.includes('%p') ? cmd.replace(/%p/g, parentNoun) : cmd; }
        
        // Direction resolution with fallback
        const isDirection = (s: string) => ['n','s','e','w','u','d','north','south','east','west','up','down','ne','nw','se','sw'].includes(s.toLowerCase());
        const resolvedDir = direction || (finalContext && isDirection(finalContext) ? finalContext : undefined) || (target && isDirection(target) ? target : undefined);
        
        if (resolvedDir) { cmd = cmd.includes('%d') ? cmd.replace(/%d/g, resolvedDir) : cmd; }
        
        // Smart Append for Doors: If a door button command has no placeholders, append the resolved direction or target
        if (button.setId === 'doors' && !button.command.includes('%')) {
            const appendTarget = resolvedDir || target || finalContext;
            if (appendTarget && !cmd.toLowerCase().includes(appendTarget.toLowerCase())) {
                cmd = `${cmd} ${appendTarget}`;
                console.log('[useButtonClicks] Smart Append for doors:', cmd);
            }
        }

        // Strip any remaining placeholders to avoid sending raw templates to game
        cmd = cmd.replace(/%[ndp]/g, '').replace(/%%n/g, '').trim();

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
            console.log(`[useButtonClicks] Combo fired: hiding swipe wheel`);
            joystick.setIsSwipeWheelHidden(true);
        } else if (joystick.isTargetModifierActive && target && !(button as any)._skipJoystick) {
            finalCmd = `${finalCmd} ${target}`; 
            joystick.setIsJoystickConsumed(true);
            console.log(`[useButtonClicks] Target combo fired: hiding swipe wheel`);
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

            console.log('[useButtonClicks] Setting PopoverState for specialized action:', {
                type: button.actionType === 'select-recipient' ? 'give-recipient-select' : (button.actionType === 'select-container' ? 'put-container-select' : undefined),
                setId: button.command,
                context: button.actionType === 'select-assign' ? (joystick.currentDir || (joystick.isTargetModifierActive ? target : '')) : (context || button.label)
            });
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
            setParley({ active: true, command: parley.command || 'tell', target: parleyTarget, message: '' });

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
            if (detectedParent && finalContext && !isAlreadyGet) {
                // For nested items, finalContext (e.g. '2.boots') is the exact target
                executeCommand(`get ${finalContext} ${detectedParent}`, true, true, false, false, { fromUi: true });
            }

            // --- Optimistic Updates for Common Actions ---
            const firstWord = finalCmd.split(' ')[0].toLowerCase();
            const remainder = finalCmd.slice(firstWord.length).trim();
            if (firstWord === 'wear' || firstWord === 'hold') {
                applyOptimisticChange({ type: 'wear', noun: remainder });
            } else if (firstWord === 'remove') {
                applyOptimisticChange({ type: 'remove', noun: remainder });
            } else if (firstWord === 'drop') {
                const fromSource = (button.setId === 'equipmentlist' || button.setId === 'inline-obj-worn') ? 'eq' : 'inv';
                applyOptimisticChange({ type: 'drop', noun: remainder, from: fromSource });
            } else if (firstWord === 'give' && remainder.includes(' ')) {
                const parts = remainder.split(' ');
                const itemNoun = parts[0];
                const fromSource = (button.setId === 'equipmentlist' || button.setId === 'inline-obj-worn') ? 'eq' : 'inv';
                applyOptimisticChange({ type: 'give', noun: itemNoun, from: fromSource });
            } else if (firstWord === 'put' && remainder.includes(' ')) {
                const parts = remainder.split(' ');
                const itemNoun = parts[0];
                const containerNoun = parts[1];
                applyOptimisticChange({ type: 'put', noun: itemNoun, containerNoun });
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
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview, wasDraggingRef, viewport, setParley, parley, keywordOverrides, applyOptimisticChange]);

    return { handleButtonClick };
};
