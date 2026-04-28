/**
 * @file useLogPointerUp.ts
 * @description Hook for handling pointer up and drop logic in the message log.
 */

import { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { isItemNoun } from '../../utils/keywordUtils';

export const useLogPointerUp = (
    deps: InteractionDeps,
    logLongPressTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    isLogDraggingRef: React.MutableRefObject<boolean>
) => {
    const {
        executeCommand, triggerHaptic, setHeldButton, setActiveDragData,
        setCommandPreview, setPopoverState, popoverState, viewport,
        handleTabClick, setGearTab, setInput, input, setUI
    } = deps;

    const handleLogPointerUp = useCallback((
        e: PointerEvent,
        targetEl: HTMLElement | null,
        _pressedRect: DOMRect | null,
        _isShopItem: boolean,
        cleanupDrag: () => void
    ) => {
        if (logLongPressTimerRef.current) {
            clearTimeout(logLongPressTimerRef.current);
            logLongPressTimerRef.current = null;
        }

        if (isLogDraggingRef.current) {
            isLogDraggingRef.current = false;
            
            // Check if we dropped on a target
            const dropEl = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
            const dropTarget = dropEl?.closest('.drop-target') as HTMLElement;
            
            if (dropTarget) {
                const dropCmd = dropTarget.getAttribute('data-drop-command');
                const dropCtx = dropTarget.getAttribute('data-drop-context');
                const dropParent = dropTarget.getAttribute('data-drop-parent');
                const noun = targetEl?.getAttribute('data-noun') || targetEl?.innerText;

                if (dropCmd && dropCtx && noun) {
                    triggerHaptic(80);
                    let finalCmd = dropCmd.replace(/%n/g, noun);
                    if (dropParent) finalCmd = finalCmd.replace(/%p/g, dropParent);
                    
                    if (dropCmd === 'shop-mend') {
                        handleTabClick('equipment');
                        setGearTab('inv');
                    }
                    else executeCommand(finalCmd, false, false);
                    
                    cleanupDrag();
                    return;
                }
            }
        }

        // Standard release logic
        setTimeout(() => {
            cleanupDrag();
        }, 50);
    }, [
        viewport, executeCommand, triggerHaptic, setHeldButton, setActiveDragData, 
        setCommandPreview, setPopoverState, popoverState, handleTabClick, setGearTab,
        setInput, input, setUI, logLongPressTimerRef, isLogDraggingRef
    ]);

    return { handleLogPointerUp };
};
