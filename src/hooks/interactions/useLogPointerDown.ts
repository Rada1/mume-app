/**
 * @file useLogPointerDown.ts
 * @description Hook for handling the initial pointer down event in the message log.
 */

import { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { sanitizeGameTarget } from '../../utils/gameUtils';
import { getButtonCommand } from '../../utils/buttonUtils';

export const useLogPointerDown = (
    deps: InteractionDeps,
    lookModFiredRef: React.MutableRefObject<boolean>,
    logLongPressTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    longPressJustFiredRef?: React.MutableRefObject<boolean>,
    heldBtnFiredRef?: React.MutableRefObject<boolean>
) => {
    const {
        executeCommand, triggerHaptic, btn, joystick, target,
        viewport,
        heldButton, heldButtonRef, setHeldButton, setCommandPreview, lastCommandContextRef, isTrackpadModifierActive,
        keywordOverrides, parley, setParley
    } = deps;

    const markHeldTargetFired = useCallback(() => {
        const firedAt = Date.now();
        setHeldButton((prev: any) => prev ? { ...prev, lastTargetFireAt: firedAt } : null);
        setCommandPreview(null);
        if (heldBtnFiredRef) heldBtnFiredRef.current = true;
    }, [setHeldButton, setCommandPreview, heldBtnFiredRef]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        const targetEl = (e.target instanceof HTMLElement) ? e.target.closest('.inline-btn') as HTMLElement : (e.target as any)?.parentElement?.closest('.inline-btn') as HTMLElement;
        const label = targetEl?.innerText.trim() || '';

        const isLong = joystick.isTargetModifierActive;
        const rawContextStrDown = targetEl ? (targetEl.getAttribute('data-context') || targetEl.innerText.trim()) : '';
        const effectiveContextStrDown = rawContextStrDown && keywordOverrides[rawContextStrDown] ? keywordOverrides[rawContextStrDown] : rawContextStrDown;
        const contextStr = sanitizeGameTarget(effectiveContextStrDown) || effectiveContextStrDown;

        // --- 1. Overlay Button Handling ---
        const activeHeldButton = heldButtonRef?.current || heldButton;
        const isTargetableInline = targetEl?.getAttribute('data-targetable') !== 'false';

        const sourceButton = activeHeldButton
            ? btn.buttons.find(b => b.id === activeHeldButton.id)
            : null;

        if (targetEl && isTargetableInline && activeHeldButton && sourceButton?.actionType !== 'modifier' && !activeHeldButton.didFire && !activeHeldButton.id.startsWith('log-inline-')) {
            if (sourceButton) {
                const resolved = getButtonCommand(sourceButton, activeHeldButton.dx || 0, activeHeldButton.dy || 0, contextStr, undefined, activeHeldButton.modifiers || [], joystick, target, isLong, activeHeldButton.commandPrefixes || []);
                if (resolved?.cmd) {
                    lastCommandContextRef.current = { context: rawContextStrDown, displayText: label };
                    executeCommand(resolved.cmd);
                    markHeldTargetFired();
                    triggerHaptic(60);
                    return;
                }
            }

            let finalCmd = isLong ? (activeHeldButton.longCommand || activeHeldButton.baseCommand) : activeHeldButton.baseCommand;
            if (finalCmd) {
                if (finalCmd === '__parley__') {
                    lastCommandContextRef.current = { context: rawContextStrDown, displayText: label };
                    setParley({ active: true, command: parley.command || 'tell', target: contextStr || rawContextStrDown, message: '' });
                    setTimeout(() => {
                        const inputEl = document.querySelector('input') as HTMLInputElement;
                        if (!inputEl) return;
                        const wasReadOnly = inputEl.readOnly;
                        if (viewport.isMobile) inputEl.readOnly = false;
                        inputEl.focus();
                        if (viewport.isMobile) {
                            setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                        }
                    }, 10);
                    markHeldTargetFired();
                    triggerHaptic(60);
                    return;
                }

                if (contextStr) {
                    finalCmd = finalCmd.includes('%n') ? finalCmd.replace(/%n/g, contextStr) : `${finalCmd} ${contextStr}`;
                }
                finalCmd = [...(activeHeldButton.commandPrefixes || []), finalCmd].filter(Boolean).join(' ');
                lastCommandContextRef.current = { context: rawContextStrDown, displayText: label };
                executeCommand(finalCmd);
                markHeldTargetFired();
                triggerHaptic(60);
                return;
            }
        }

        // --- 2. Modifier Hotkeys (Look) ---
        else if (targetEl && isTargetableInline && (joystick.isTargetModifierActive || isTrackpadModifierActive)) {
             if (contextStr) {
                 executeCommand(`look ${contextStr}`);
                 joystick.setIsJoystickConsumed(true);
                 triggerHaptic(60);
                 lookModFiredRef.current = true;
                 setTimeout(() => { lookModFiredRef.current = false; }, 300);
                 return;
             }
        }

        // --- 3. Interaction State Setup ---
        if (targetEl) targetEl.classList.add('pressed');
        if (logLongPressTimerRef.current) clearTimeout(logLongPressTimerRef.current);

    }, [
        btn, joystick, target, executeCommand, triggerHaptic, setHeldButton, heldButton,
        viewport, lastCommandContextRef, keywordOverrides, isTrackpadModifierActive,
        lookModFiredRef, parley.command, setParley,
        logLongPressTimerRef, markHeldTargetFired
    ]);

    return { handleLogPointerDown };
};
