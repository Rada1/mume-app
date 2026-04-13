/**
 * @file useLogPointerDown.ts
 * @description Hook for handling the initial pointer down event in the message log.
 */

import { useCallback, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { sanitizeGameTarget } from '../../utils/gameUtils';
import { getButtonCommand } from '../../utils/buttonUtils';

export const useLogPointerDown = (
    deps: InteractionDeps,
    lookModFiredRef: React.MutableRefObject<boolean>,
    logLongPressTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    logDragStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>,
    isLogDraggingRef: React.MutableRefObject<boolean>,
    longPressJustFiredRef?: React.MutableRefObject<boolean>
) => {
    const {
        executeCommand, triggerHaptic, btn, joystick, target,
        viewport, entities, selectedObjectIds, toggleObjectSelection,
        heldButton, setHeldButton, lastCommandContextRef, isTrackpadModifierActive,
        keywordOverrides
    } = deps;

    const handleLogPointerDown = useCallback((e: React.PointerEvent, startDrag: (e: React.PointerEvent, targetEl: HTMLElement, label: string, contextStr: string) => void) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        const isShopItem = targetEl?.getAttribute('data-cmd') === 'inline-shopitem';
        const label = targetEl?.innerText.trim() || '';

        const isLong = joystick.isTargetModifierActive;
        const rawContextStrDown = targetEl ? (targetEl.getAttribute('data-context') || targetEl.innerText.trim()) : '';
        const effectiveContextStrDown = rawContextStrDown && keywordOverrides[rawContextStrDown] ? keywordOverrides[rawContextStrDown] : rawContextStrDown;
        const contextStr = sanitizeGameTarget(effectiveContextStrDown) || effectiveContextStrDown;

        // --- 1. Overlay Button Handling ---
        if (targetEl && heldButton && !heldButton.didFire && !heldButton.id.startsWith('log-inline-')) {
            const sourceButton = btn.buttons.find(b => b.id === heldButton.id);
            if (sourceButton) {
                const resolved = getButtonCommand(sourceButton, heldButton.dx || 0, heldButton.dy || 0, contextStr, undefined, heldButton.modifiers || [], joystick, target, isLong);
                if (resolved?.cmd) {
                    lastCommandContextRef.current = { context: rawContextStrDown, displayText: label };
                    executeCommand(resolved.cmd);
                    setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                    triggerHaptic(60);
                    return;
                }
            }

            let finalCmd = isLong ? (heldButton.longCommand || heldButton.baseCommand) : heldButton.baseCommand;
            if (finalCmd) {
                if (contextStr) {
                    finalCmd = finalCmd.includes('%n') ? finalCmd.replace(/%n/g, contextStr) : `${finalCmd} ${contextStr}`;
                }
                lastCommandContextRef.current = { context: rawContextStrDown, displayText: label };
                executeCommand(finalCmd);
                setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                triggerHaptic(60);
                return;
            }
        } 
        
        // --- 2. Modifier Hotkeys (Look) ---
        else if (targetEl && (joystick.isTargetModifierActive || isTrackpadModifierActive)) {
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
        
        logDragStartPosRef.current = { x: e.clientX, y: e.clientY };
        isLogDraggingRef.current = false;

        const isMobile = viewport.isMobile;

        // --- 4. Long Press Timer ---
        logLongPressTimerRef.current = setTimeout(() => {
            if (!logDragStartPosRef.current) return;

            if (targetEl) {
                // Multi-select or Drag Start
                const id = targetEl.getAttribute('data-id') || '';
                const setId = targetEl.getAttribute('data-cmd') || '';
                if (id) {
                    const isSelected = Array.from(selectedObjectIds).some(entry => entry === id || entry.endsWith(':' + id));
                    if (!isSelected) {
                        toggleObjectSelection(id, setId);
                        if (longPressJustFiredRef) longPressJustFiredRef.current = true;
                        triggerHaptic(80);
                    }
                }

                // --- DRAG-AND-DROP DISABLED ---
                // To re-enable, uncomment the line below:
                // startDrag(e, targetEl, label, contextStr);
            }
        }, isMobile ? 450 : 500);

    }, [
        btn, joystick, target, executeCommand, triggerHaptic, setHeldButton, heldButton, 
        viewport, lastCommandContextRef, keywordOverrides, isTrackpadModifierActive, 
        selectedObjectIds, toggleObjectSelection, lookModFiredRef,
        logLongPressTimerRef, logDragStartPosRef, isLogDraggingRef
    ]);

    return { handleLogPointerDown };
};
