/**
 * @file useLogPointerMove.ts
 * @description Hook for handling pointer move/drag events in the message log.
 */

import { useCallback } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { isItemContainer, sanitizeGameTarget } from '../../utils/gameUtils';
import { EntityCapability } from '../../types';

export const useLogPointerMove = (
    deps: InteractionDeps,
    logDragStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>,
    isLogDraggingRef: React.MutableRefObject<boolean>,
    moveCountRef: React.MutableRefObject<number>
) => {
    const {
        setUI, setHeldButton, setCommandPreview, triggerHaptic, 
        popoverState, setPopoverState, activeDragData, entities, 
        viewport
    } = deps;

    const handleLogPointerMove = useCallback((e: PointerEvent, isShopItem: boolean) => {
        if (isLogDraggingRef.current) {
            setHeldButton((prev: any) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);

            const drawerEl = document.querySelector('.right-drawer') as HTMLElement | null;
            const drawerRect = drawerEl?.getBoundingClientRect();
            const isOverDrawer = !!(drawerRect &&
                e.clientX >= drawerRect.left && e.clientX <= drawerRect.right &&
                e.clientY >= drawerRect.top && e.clientY <= drawerRect.bottom);

            // Drawer Peeking
            if (isOverDrawer || e.clientX > window.innerWidth - 80) {
                setUI((prev: any) => prev.isDrawerPeeking ? prev : { ...prev, isDrawerPeeking: true });
            } else if (e.clientX < window.innerWidth - 150) {
                setUI((prev: any) => !prev.isDrawerPeeking ? prev : { ...prev, isDrawerPeeking: false });
            }

            moveCountRef.current++;
            if (moveCountRef.current % 2 === 0) {
                const isNearEdge = isOverDrawer || e.clientX > window.innerWidth - 80;
                const verb = isShopItem ? 'buy' : 'get';

                if (isNearEdge) {
                    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
                    const overEquip = elUnder?.closest('[data-drawer-section="equipmentlist"]');
                    const overInv = elUnder?.closest('[data-drawer-section="inventorylist"]');
                    document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

                    if (overEquip) {
                        overEquip.querySelector('.drawer-section-drop-zone')?.classList.add('drop-hover-active');
                        setHeldButton((prev: any) => {
                            if (!prev) return null;
                            const original = prev.originalLabel || prev.label;
                            const newLabel = `${verb} + wear ${original}`;
                            if (prev.label === newLabel) return prev;
                            setCommandPreview(newLabel);
                            return { ...prev, label: newLabel };
                        });
                    } else {
                        const invTarget = overInv || document.querySelector('[data-drawer-section="inventorylist"]');
                        invTarget?.querySelector('.drawer-section-drop-zone')?.classList.add('drop-hover-active');
                        setHeldButton((prev: any) => {
                            if (!prev) return null;
                            const original = prev.originalLabel || prev.label;
                            const newLabel = `${verb} ${original}`;
                            if (prev.label === newLabel) return prev;
                            setCommandPreview(newLabel);
                            return { ...prev, label: newLabel };
                        });
                    }
                } else {
                    const targetUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
                    const recipient = targetUnderPointer?.closest('.pc-highlighter, .npc-highlighter');
                    const isOverInput = targetUnderPointer?.closest('.input-area');

                    document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

                    if (isOverInput) {
                        isOverInput.classList.add('drop-hover-active');
                        setHeldButton((prev: any) => {
                            if (!prev) return null;
                            const original = prev.originalLabel || prev.label;
                            setCommandPreview(original);
                            return { ...prev, label: `append: ${original}` };
                        });
                    } else if (recipient && !recipient.classList.contains('dragging')) {
                        const rawName = recipient.getAttribute('data-context');
                        const name = sanitizeGameTarget(rawName) || rawName;
                        const category = recipient.getAttribute('data-category');

                        if (category === 'inline-shopkeeper' && name && popoverState?.setId !== 'inline-shopkeeper-drop') {
                            const rect = recipient.getBoundingClientRect();
                            triggerHaptic(40);
                            setPopoverState({
                                x: Math.min(window.innerWidth - 180, rect.right + 10),
                                y: Math.max(80, rect.top - 20),
                                setId: 'inline-shopkeeper-drop',
                                context: activeDragData?.context || name,
                                parentNoun: name,
                                menuDisplay: 'list'
                            });
                        }

                        if (category !== 'inline-shopkeeper') recipient.classList.add('drop-hover-active');
                        
                        if (name) {
                            setHeldButton((prev: any) => {
                                if (!prev) return null;
                                const original = prev.originalLabel || prev.label;
                                const newLabel = isShopItem ? `buy + give ${original} ${name}` : `give ${original} ${name}`;
                                setCommandPreview(newLabel);
                                return { ...prev, label: newLabel };
                            });
                        }
                    } else {
                        const targetCandidate = targetUnderPointer?.closest('.inline-btn');
                        const context = targetCandidate?.getAttribute('data-context') || targetCandidate?.textContent?.trim();
                        if (targetCandidate && context && !targetCandidate.classList.contains('dragging')) {
                            const candId = targetCandidate.getAttribute('data-id') || '';
                            const candEntity = entities[candId];
                            const isContainer = candEntity ? candEntity.capabilities.includes(EntityCapability.Container) : isItemContainer(context);

                            if (isContainer) {
                                targetCandidate.classList.add('drop-hover-active');
                                setHeldButton((prev: any) => {
                                    if (!prev) return null;
                                    const original = prev.originalLabel || prev.label;
                                    const newLabel = `${verb} + put ${original} ${context}`;
                                    setCommandPreview(newLabel);
                                    return { ...prev, label: newLabel };
                                });
                            } else {
                                setHeldButton((prev: any) => prev ? { ...prev, label: prev.originalLabel || prev.label } : null);
                                setCommandPreview('');
                            }
                        } else {
                            setHeldButton((prev: any) => prev ? { ...prev, label: prev.originalLabel || prev.label } : null);
                            setCommandPreview('');
                        }
                    }
                }
            }
        } else if (logDragStartPosRef.current) {
            const dx = Math.abs(e.clientX - logDragStartPosRef.current.x);
            const dy = Math.abs(e.clientY - logDragStartPosRef.current.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const isMobile = viewport.isMobile;

            if (!isMobile && dist > 8) return true; // Signal to start drag
            if (isMobile && dist > 12) return false; // Signal to cancel long press
        }
        return false;
    }, [
        setUI, setHeldButton, setCommandPreview, triggerHaptic, popoverState, 
        setPopoverState, activeDragData, entities, viewport, isLogDraggingRef, 
        logDragStartPosRef, moveCountRef
    ]);

    return { handleLogPointerMove };
};
