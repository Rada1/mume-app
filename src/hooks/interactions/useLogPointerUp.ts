/**
 * @file useLogPointerUp.ts
 * @description Hook for handling pointer up and drop logic in the message log.
 */

import { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { isItemContainer, sanitizeGameTarget } from '../../utils/gameUtils';
import { triggerRingAnimation, getPressedColor } from './pointerUtils';

export const useLogPointerUp = (
    deps: InteractionDeps,
    logLongPressTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    isLogDraggingRef: React.MutableRefObject<boolean>
) => {
    const {
        executeCommand, triggerHaptic, setHeldButton, setActiveDragData,
        setCommandPreview, setPopoverState, popoverState, viewport,
        setIsInventoryOpen, setInput, input, setUI
    } = deps;

    const handleLogPointerUp = useCallback((
        e: PointerEvent,
        targetEl: HTMLElement | null,
        pressedRect: DOMRect | null,
        isShopItem: boolean,
        cleanupDrag: () => void
    ) => {
        if (logLongPressTimerRef.current) {
            clearTimeout(logLongPressTimerRef.current);
            logLongPressTimerRef.current = null;
        }

        const isMobile = viewport.isMobile;
        const verb = isShopItem ? 'buy' : 'get';

        /* --- DRAG-AND-DROP DISABLED ---
        if (isLogDraggingRef.current) {
            const upEvent = e;
            const targetUnderPointer = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
            
            // --- 1. Drop-Cmd Buttons (e.g. Mend, Sell) ---
            const dropBtn = targetUnderPointer?.closest('[data-drop-cmd]') as HTMLElement | null;
            if (dropBtn) {
                const dropCmd = dropBtn.getAttribute('data-drop-cmd');
                const dropCtx = dropBtn.getAttribute('data-drop-context');
                const dropParent = dropBtn.getAttribute('data-drop-parent');
                const rawDraggedContext = targetEl?.getAttribute('data-context');
                const noun = (rawDraggedContext && /^\d+\./.test(rawDraggedContext)) 
                    ? rawDraggedContext : (sanitizeGameTarget(rawDraggedContext) || rawDraggedContext);

                if (dropCmd && dropCtx && noun) {
                    triggerHaptic(80);
                    let finalCmd = dropCmd.replace(/%n/g, noun);
                    if (dropParent) finalCmd = finalCmd.replace(/%p/g, dropParent);
                    if (dropCmd === 'shop-mend') setIsInventoryOpen?.(true);
                    else executeCommand(finalCmd, false, false);
                    cleanupDrag();
                    return;
                }
            }

            // --- 2. Recipient Targets (PC/NPC) ---
            const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter, [data-player-name]');
            if (recipient && !recipient.classList.contains('dragging')) {
                const rawRecipientName = recipient.getAttribute('data-context') || recipient.getAttribute('data-player-name');
                const recipientName = sanitizeGameTarget(rawRecipientName) || rawRecipientName;
                const rawDraggedContext = targetEl?.getAttribute('data-context');
                const draggedContext = (rawDraggedContext && /^\d+\./.test(rawDraggedContext))
                    ? rawDraggedContext : (sanitizeGameTarget(rawDraggedContext) || rawDraggedContext);

                if (draggedContext && recipientName) {
                    const category = recipient.getAttribute('data-category');
                    if (category === 'inline-shopkeeper' && popoverState?.setId !== 'inline-shopkeeper-drop') {
                        triggerHaptic(60);
                        setPopoverState({
                            x: upEvent.clientX, y: upEvent.clientY, setId: 'inline-shopkeeper-drop',
                            context: draggedContext, parentNoun: recipientName, menuDisplay: 'list'
                        });
                    } else {
                        triggerHaptic(60);
                        executeCommand(`give ${draggedContext} ${recipientName}`);
                    }
                }
            } else {
                // --- 3. Container/Drawer/Input Drops ---
                const roomContainer = targetUnderPointer?.closest('.inline-btn:not(.dragging)');
                const roomContainerContext = roomContainer?.getAttribute('data-context') || roomContainer?.textContent?.trim();
                const rawDraggedContext2 = targetEl?.getAttribute('data-context');
                const draggedContext = (rawDraggedContext2 && /^\d+\./.test(rawDraggedContext2))
                    ? rawDraggedContext2 : (sanitizeGameTarget(rawDraggedContext2) || rawDraggedContext2);

                if (roomContainer && roomContainerContext && isItemContainer(roomContainerContext) && draggedContext) {
                    triggerHaptic(60);
                    executeCommand(`${verb} ${draggedContext}`);
                    setTimeout(() => executeCommand(`put ${draggedContext} ${roomContainerContext}`), 125);
                } else {
                    const drawerContainer = targetUnderPointer?.closest('.is-container');
                    const drawerEl = document.querySelector('.right-drawer');
                    const isOverDrawerUp = !!(drawerEl?.getBoundingClientRect() &&
                        upEvent.clientX >= (drawerEl as HTMLElement).getBoundingClientRect().left);

                    if (drawerContainer && draggedContext) {
                        const containerName = drawerContainer.getAttribute('data-item-name');
                        if (containerName) {
                            triggerHaptic(60);
                            executeCommand(`${verb} ${draggedContext}`, true, true);
                            setTimeout(() => executeCommand(`put ${draggedContext} ${containerName}`), 125);
                        }
                    } else if (draggedContext && (isOverDrawerUp || upEvent.clientX > window.innerWidth - 80)) {
                        triggerHaptic(40);
                        const overEquipDrop = targetUnderPointer?.closest('[data-drawer-section="equipmentlist"]');
                        if (overEquipDrop) {
                            executeCommand(`${verb} ${draggedContext}`);
                            setTimeout(() => executeCommand(`wear ${draggedContext}`), 125);
                        } else {
                            executeCommand(`${verb} ${draggedContext}`);
                        }
                    } else if (targetUnderPointer?.closest('.input-area')) {
                        if (draggedContext) {
                            triggerHaptic(30);
                            const trimmed = input.trim();
                            setInput(trimmed ? `${trimmed} ${draggedContext} ` : `${draggedContext} `);
                        }
                    }
                }
            }
            cleanupDrag();
        }
        --- */

        // --- 4. Pointer Interaction Feedback (Ring Animation) ---
        if (pressedRect && pressedRect.width > 0 && !isLogDraggingRef.current) {
            const cx = pressedRect.left + pressedRect.width / 2;
            const cy = pressedRect.top + pressedRect.height / 2;
            const color = targetEl ? getPressedColor(targetEl) : '#4b6eef';
            triggerRingAnimation(cx, cy, color);
            
            if (targetEl?.isConnected) {
                targetEl.animate([
                    { filter: 'brightness(2.5) contrast(1.2)' },
                    { filter: 'brightness(1) contrast(1)' }
                ], { 
                    duration: 280, 
                    easing: 'ease-out' 
                });
            }
        }

        // Delay cleanup slightly to allow the 'click' event (which fires after pointerup)
        // to process. If we cleanup immediately, useLogClicks might see heldButton as null.
        setTimeout(() => {
            cleanupDrag();
        }, 50);
    }, [
        viewport, executeCommand, triggerHaptic, setHeldButton, setActiveDragData, 
        setCommandPreview, setPopoverState, popoverState, setIsInventoryOpen, 
        setInput, input, setUI, logLongPressTimerRef, isLogDraggingRef
    ]);

    return { handleLogPointerUp };
};
