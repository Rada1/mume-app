/**
 * @file useItemDrawerInteractions.ts
 * @description Logic orchestrator for Item Drawers (Inventory/Equipment) in the MUME client.
 * Handles drag-and-drop orchestration, multi-selection states, and cross-drawer peeking.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { DrawerLine, EntityCapability, OptimisticChange, GameEntity } from '../types';
import { isItemContainer, isFluidContainer } from '../utils/gameUtils';
import { getEffectiveKeyword, sanitizeGameTarget } from '../utils/keywordUtils';

interface ItemDrawerInteractionsDeps {
    drawerType: 'inventory' | 'equipment';
    lines: DrawerLine[];
    drawerRef: React.RefObject<HTMLDivElement>;
    isOpen: boolean;
    onClose: () => void;
    
    // Global State & Actions
    setUI: (val: any) => void;
    ui: any;
    executeCommand: (cmd: string, silent?: boolean, system?: boolean, hist?: boolean, drawer?: boolean, opts?: any) => void;
    triggerHaptic: (ms: number) => void;
    applyOptimisticChange: (change: OptimisticChange) => void;
    entities: Record<string, import('../types').GameEntity>;
    popoverState: any;
    setPopoverState: (val: any) => void;
    keywordOverrides: Record<string, string>;
}

export const useItemDrawerInteractions = (deps: ItemDrawerInteractionsDeps) => {
    const { 
        drawerType, lines, drawerRef, isOpen, onClose, 
        setUI, ui, executeCommand, triggerHaptic, applyOptimisticChange, 
        entities, popoverState, setPopoverState, keywordOverrides 
    } = deps;

    // --- State ---
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [activeDropTarget, setActiveDropTarget] = useState<{ type: 'log' | 'container' | 'section'; id: string } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [primedItemId, setPrimedItemId] = useState<string | null>(null);

    // --- Refs for continuous tracking ---
    const isDraggingRef = useRef(false);
    const pendingDragRef = useRef<{ line: DrawerLine; source: 'inventory' | 'equipment' } | null>(null);
    const draggedRef = useRef<{ line: DrawerLine; source: 'inventory' | 'equipment' } | null>(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const pointerTargetRef = useRef<HTMLElement | null>(null);
    const touchMoveHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
    const moveCountRef = useRef(0);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    
    // --- Stable access refs ---
    const linesRef = useRef(lines);
    const selectedItemsRef = useRef(selectedItems);
    const isSelectModeRef = useRef(isSelectMode);
    useEffect(() => { linesRef.current = lines; }, [lines]);
    useEffect(() => { selectedItemsRef.current = selectedItems; }, [selectedItems]);
    useEffect(() => { isSelectModeRef.current = isSelectMode; }, [isSelectMode]);

    // --- Helpers ---
    const exitSelectMode = useCallback(() => {
        setIsSelectMode(false);
        setSelectedItems(new Set());
    }, []);

    const cleanupDrag = useCallback(() => {
        isDraggingRef.current = false;
        pendingDragRef.current = null;
        draggedRef.current = null;
        pointerIdRef.current = null;
        pointerTargetRef.current = null;
        setDraggedItem(null);
        setActiveDropTarget(null);
        setPrimedItemId(null);
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', cleanupDrag);
        if (touchMoveHandlerRef.current) {
            window.removeEventListener('touchmove', touchMoveHandlerRef.current);
            touchMoveHandlerRef.current = null;
        }
        
        if (ui.isDrawerPeeking) {
            setUI((prev: any) => ({ ...prev, peekingDrawer: 'none', isDrawerPeeking: false, peekingSource: 'none' }));
        }

        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
    }, [ui.isDrawerPeeking, setUI]);

    // --- Cleanup Effects ---
    useEffect(() => {
        if (!isOpen) {
            cleanupDrag();
        }
    }, [isOpen, cleanupDrag]);

    useEffect(() => {
        if (popoverState && popoverState.setId !== 'inline-shopkeeper-drop') {
            cleanupDrag();
        }
    }, [popoverState, cleanupDrag]);

    const startActiveDrag = useCallback((x: number, y: number) => {
        if (pendingDragRef.current && !isDraggingRef.current) {
            triggerHaptic(40);
            const { line, source } = pendingDragRef.current;
            draggedRef.current = { line, source };
            
            // If in select mode and dragging an unselected item, select it
            if (isSelectModeRef.current && !selectedItemsRef.current.has(line.id)) {
                const newSet = new Set(selectedItemsRef.current);
                newSet.add(line.id);
                setSelectedItems(new Set(newSet));
            }
            
            const isMulti = isSelectModeRef.current && selectedItemsRef.current.size > 1 && selectedItemsRef.current.has(line.id);
            const entity = entities[line.entityId || ''];
            const displayNoun = isMulti
                ? `${selectedItemsRef.current.size} items`
                : (getEffectiveKeyword(line.text, line.html, entities[line.entityId || ''], keywordOverrides) || line.stableId || 'item');
                
            setDraggedItem({ line, source, x, y, itemNoun: displayNoun });
            isDraggingRef.current = true;
            setPrimedItemId(null);
            
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            
            window.addEventListener('pointermove', handleGlobalPointerMove);
            window.addEventListener('pointerup', handleGlobalPointerUp);
            const preventScroll = (e: TouchEvent) => e.preventDefault();
            touchMoveHandlerRef.current = preventScroll;
            window.addEventListener('touchmove', preventScroll, { passive: false });
        }
    }, [triggerHaptic, entities, setUI]);

    // --- Logic Section: Interaction Handlers ---

    const handlePointerDown = (e: React.PointerEvent, line: DrawerLine) => {
        if (!line.isItem) return;
        cleanupDrag();
        pointerIdRef.current = e.pointerId;
        pointerTargetRef.current = e.currentTarget as HTMLElement;
        startPosRef.current = { x: e.clientX, y: e.clientY };
        pendingDragRef.current = { line, source: drawerType };
        setPrimedItemId(line.id);
        window.addEventListener('pointercancel', cleanupDrag);

        if (isSelectModeRef.current) {
            // Wait a moment before starting drag to allow simple toggles
            longPressTimerRef.current = setTimeout(() => startActiveDrag(e.clientX, e.clientY), 150);
        } else {
            // Standard long-press for drag or selection
            longPressTimerRef.current = setTimeout(() => {
                triggerHaptic(60);
                setIsSelectMode(true);
                setSelectedItems(new Set([line.id]));
                startActiveDrag(e.clientX, e.clientY);
            }, 450);
        }

        // --- Critical Fix: Handle early pointerup to prevent ghost drags ---
        const handleUpEarly = (ev: PointerEvent) => {
            if (ev.pointerId !== e.pointerId) return;
            if (!isDraggingRef.current) {
                cleanupDrag();
            }
            window.removeEventListener('pointerup', handleUpEarly);
            window.removeEventListener('pointercancel', handleUpEarly);
        };
        window.addEventListener('pointerup', handleUpEarly);
        window.addEventListener('pointercancel', handleUpEarly);
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
        // Threshold check before starting drag
        if (startPosRef.current && !isDraggingRef.current) {
            const dx = Math.abs(e.clientX - startPosRef.current.x);
            const dy = Math.abs(e.clientY - startPosRef.current.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const threshold = e.pointerType === 'mouse' ? 10 : 8;
            if (dist > threshold) {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    startActiveDrag(e.clientX, e.clientY);
                } else {
                    cleanupDrag();
                }
                return;
            }
        }

        if (isDraggingRef.current) {
            // 1. Ghost Translation
            if (ghostRef.current) {
                ghostRef.current.style.left = `${e.clientX}px`;
                ghostRef.current.style.top = `${e.clientY}px`;
            }

            // 2. Auto-close edge logic
            if (isOpen && drawerRef.current) {
                const rect = drawerRef.current.getBoundingClientRect();
                const isLeft = rect.left < 50;
                if (isLeft && e.clientX > rect.right + 80) onClose();
                else if (!isLeft && e.clientX < rect.left - 50) onClose();
            }

            // 3. Scroll logic
            const contentEl = drawerRef.current?.querySelector('.drawer-content');
            if (contentEl) {
                const rect = contentEl.getBoundingClientRect();
                const threshold = 40;
                const scrollSpeed = 0.25;
                if (e.clientY < rect.top + threshold) {
                    contentEl.scrollTop -= (rect.top + threshold - e.clientY) * scrollSpeed;
                } else if (e.clientY > rect.bottom - threshold) {
                    contentEl.scrollTop += (e.clientY - (rect.bottom - threshold)) * scrollSpeed;
                }
            }

            moveCountRef.current++;
            if (moveCountRef.current % 2 !== 0) return;

            // 4. Hit Testing & Visual Feedback
            const target = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

            const dragLine = draggedRef.current!.line;
            const entity = entities[dragLine.entityId || ''];
            const isMultiDrag = isSelectModeRef.current && selectedItemsRef.current.size > 1 && selectedItemsRef.current.has(dragLine.id);
            const singleNoun = getEffectiveKeyword(dragLine.text, dragLine.html, entity, keywordOverrides);
            const labelNoun = isMultiDrag ? `${selectedItemsRef.current.size} items` : singleNoun;

            let label = "";
            const tab = target?.closest('.desktop-edge-tab') as HTMLElement;
            const oppositeDrawer = drawerType === 'inventory' ? 'equipment' : 'inventory';
            const oppositeTitle = drawerType === 'inventory' ? 'Equipment' : 'Inventory';

            if (tab && tab.getAttribute('title') === oppositeTitle) {
                if (ui.peekingDrawer !== oppositeDrawer) {
                    setUI((prev: any) => ({ ...prev, peekingDrawer: oppositeDrawer, isDrawerPeeking: true, peekingSource: drawerType }));
                }
                label = `${drawerType === 'inventory' ? 'Wear' : 'Remove'} ${labelNoun}`;
            } else if (ui.peekingDrawer !== 'none' && ui.isDrawerPeeking) {
                setUI((prev: any) => ({ ...prev, peekingDrawer: 'none', isDrawerPeeking: false, peekingSource: 'none' }));
            }

            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter') as HTMLElement | null;
            const targetItem = target?.closest('.inline-btn.auto-item') as HTMLElement | null;
            const inputArea = target?.closest('.input-area') as HTMLElement | null;
            const sectionTarget = target?.closest('[data-drawer-section]') as HTMLElement | null;

            if (logRecipient) {
                const ctx = logRecipient.getAttribute('data-context');
                if (ctx) {
                    const recipientName = sanitizeGameTarget(ctx) || ctx;
                    const category = logRecipient.getAttribute('data-category');
                    if (category === 'inline-shopkeeper' && !isMultiDrag) {
                        if (popoverState?.setId !== 'inline-shopkeeper-drop') {
                            const rect = logRecipient.getBoundingClientRect();
                            triggerHaptic(40);
                            setPopoverState({
                                x: Math.min(window.innerWidth - 180, rect.right + 10),
                                y: Math.max(80, rect.top - 20),
                                setId: 'inline-shopkeeper-drop',
                                context: labelNoun,
                                parentNoun: recipientName,
                                menuDisplay: 'list'
                            });
                        }
                        setActiveDropTarget({ type: 'log', id: recipientName });
                        label = `Mend / Sell / Give ${labelNoun}`;
                    } else {
                        logRecipient.classList.add('drop-hover-active');
                        setActiveDropTarget({ type: 'log', id: recipientName });
                        label = `Give ${labelNoun} to ${recipientName}`;
                    }
                }
            } else if (targetItem) {
                const targetContext = targetItem.getAttribute('data-context');
                const targetText = targetItem.innerText || '';
                const targetId = targetItem.getAttribute('data-id') || '';
                const targetEntity = entities[targetId];
                const targetName = targetItem.getAttribute('data-item-name') || targetContext || getEffectiveKeyword(targetText, undefined, targetEntity, keywordOverrides);
                const isTargetContainer = targetEntity ? targetEntity.capabilities.includes(EntityCapability.Container) : isItemContainer(targetText);

                if (!isMultiDrag && (entity?.capabilities.includes(EntityCapability.DrinkContainer) || isFluidContainer(dragLine.text)) && targetItem.getAttribute('data-cmd') === 'inline-water') {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'log', id: targetContext || 'water' });
                    label = `Fill ${labelNoun} from ${targetContext || 'water'}`;
                } else if (isTargetContainer && targetName !== singleNoun) {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'container', id: targetName || '' });
                    label = `Put ${labelNoun} in ${targetName}`;
                } else {
                    label = `Dragging ${labelNoun}`;
                }
            } else if (inputArea) {
                inputArea.classList.add('drop-hover-active');
                setActiveDropTarget({ type: 'log', id: 'input' });
                label = `Append ${labelNoun}`;
            } else if (sectionTarget) {
                const section = sectionTarget.getAttribute('data-drawer-section');
                if (section && section !== drawerType) {
                    sectionTarget.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'section', id: section });
                    label = `${section === 'equipment' ? 'Wear' : 'Remove'} ${labelNoun}`;
                }
            } else {
                setActiveDropTarget({ type: 'log', id: 'ground' });
                label = `Drop ${labelNoun} on ground`;
            }

            setDraggedItem((prev: any) => prev ? { ...prev, x: e.clientX, y: e.clientY, commandLabel: label } : null);
        }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isDraggingRef.current && draggedRef.current) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const currentItem = draggedRef.current.line;
            const currentSource = draggedRef.current.source;

            // Resolve Items
            const itemsToProcess = isSelectModeRef.current && selectedItemsRef.current.has(currentItem.id)
                ? Array.from(selectedItemsRef.current).map(id => linesRef.current.find(l => l.id === id)).filter(Boolean) as DrawerLine[]
                : [currentItem];

            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter') as HTMLElement | null;
            const targetContainer = target?.closest('.inline-btn.auto-item') as HTMLElement | null;
            const tab = target?.closest('.desktop-edge-tab') as HTMLElement;
            const oppositeTitle = drawerType === 'inventory' ? 'Equipment' : 'Inventory';
            const sectionTarget = target?.closest('[data-drawer-section]') as HTMLElement | null;
            const inLog = target?.closest('.message-log-container') || target?.classList.contains('drawer-backdrop');

            if (logRecipient || targetContainer || (tab && tab.getAttribute('title') === oppositeTitle) || sectionTarget || inLog) {
                triggerHaptic(60);
                
                itemsToProcess.forEach((item, idx) => {
                    const entity = entities[item.entityId || ''];
                    const noun = getEffectiveKeyword(item.text, item.html, entity, keywordOverrides);
                    const parentNoun = entity?.parentId ? entities[entity.parentId]?.noun : item.parentItemNoun;

                    setTimeout(() => {
                        // Optimistic Update
                        if (tab?.getAttribute('title') === oppositeTitle || (sectionTarget && sectionTarget.getAttribute('data-drawer-section') !== drawerType)) {
                            applyOptimisticChange({ type: drawerType === 'inventory' ? 'wear' : 'remove', item });
                        } else if (logRecipient) {
                            applyOptimisticChange({ type: 'give', item, from: drawerType === 'inventory' ? 'inv' : 'eq' });
                        } else if (inLog) {
                            applyOptimisticChange({ type: 'drop', item, from: drawerType === 'inventory' ? 'inv' : 'eq' });
                        }

                        // Command Execution
                        if (tab?.getAttribute('title') === oppositeTitle || (sectionTarget && sectionTarget.getAttribute('data-drawer-section') !== drawerType)) {
                            executeCommand(`${drawerType === 'inventory' ? 'wear' : 'remove'} ${noun}`);
                        } else if (logRecipient) {
                            const recipientName = sanitizeGameTarget(logRecipient.getAttribute('data-context')) || logRecipient.getAttribute('data-context');
                            if (drawerType === 'equipment') executeCommand(`remove ${noun}`, true, true);
                            else if (parentNoun) executeCommand(`get ${noun} ${parentNoun}`, true, true);
                            setTimeout(() => executeCommand(`give ${noun} ${recipientName}`), drawerType === 'inventory' && !parentNoun ? 0 : 120);
                        } else if (targetContainer && targetContainer.getAttribute('data-item-name') !== noun) {
                            const containerName = targetContainer.getAttribute('data-item-name');
                            if (drawerType === 'equipment') executeCommand(`remove ${noun}`, true, true);
                            else if (parentNoun) executeCommand(`get ${noun} ${parentNoun}`, true, true);
                            setTimeout(() => executeCommand(`put ${noun} ${containerName}`), drawerType === 'inventory' && !parentNoun ? 0 : 120);
                        } else if (inLog) {
                            if (drawerType === 'equipment') executeCommand(`remove ${noun}`, true, true);
                            else if (parentNoun) executeCommand(`get ${noun} ${parentNoun}`, true, true);
                            setTimeout(() => executeCommand(`drop ${noun}`), drawerType === 'inventory' && !parentNoun ? 0 : 120);
                        }

                        // Cleanup on last item
                        if (idx === itemsToProcess.length - 1) {
                            if (drawerType === 'equipment') setTimeout(() => executeCommand('eq', false, true, true, true), 200);
                            else setTimeout(() => executeCommand('inv', false, true, true, true), 200);
                        }
                    }, idx * 150);
                });

                exitSelectMode();
            }
        }
        cleanupDrag();
    };

    const executeActionForSelected = useCallback((action: 'drop' | 'wear' | 'get' | 'remove') => {
        const items = Array.from(selectedItemsRef.current)
            .map(id => linesRef.current.find(l => l.id === id))
            .filter(Boolean) as DrawerLine[];

        triggerHaptic(60);
        items.forEach((item, idx) => {
            const entity = entities[item.entityId || ''];
            const itemNoun = getEffectiveKeyword(item.text, item.html, entity, keywordOverrides);
            const parentNoun = entity?.parentId ? entities[entity.parentId]?.noun : item.parentItemNoun;

            setTimeout(() => {
                const finalAction = action === 'wear' && drawerType === 'equipment' ? 'remove' : 
                                   action === 'remove' && drawerType === 'inventory' ? 'wear' : action;

                if (action === 'drop') {
                    applyOptimisticChange({ type: 'drop', item, from: drawerType === 'inventory' ? 'inv' : 'eq' });
                    if (drawerType === 'equipment') executeCommand(`remove ${itemNoun}`, true, true);
                    else if (parentNoun) executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
                    setTimeout(() => executeCommand(`drop ${itemNoun}`), (drawerType === 'inventory' && !parentNoun) ? 0 : 120);
                } else if (action === 'wear' || action === 'remove') {
                    applyOptimisticChange({ type: drawerType === 'inventory' ? 'wear' : 'remove', item });
                    if (parentNoun) {
                        executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
                        setTimeout(() => executeCommand(`${finalAction} ${itemNoun}`), 120);
                    } else {
                        executeCommand(`${finalAction} ${itemNoun}`);
                    }
                } else if (action === 'get') {
                    if (parentNoun) {
                        executeCommand(`get ${itemNoun} ${parentNoun}`);
                    }
                }
                
                if (idx === items.length - 1) {
                    if (drawerType === 'equipment') setTimeout(() => executeCommand('eq', false, true, true, true), 200);
                    else setTimeout(() => executeCommand('inv', false, true, true, true), 200);
                }
            }, idx * 150);
        });

        exitSelectMode();
    }, [drawerType, executeCommand, triggerHaptic, applyOptimisticChange, entities, exitSelectMode]);

    return {
        handlePointerDown,
        draggedItem,
        selectedItems,
        isSelectMode,
        primedItemId,
        exitSelectMode,
        ghostRef,
        cleanupDrag,
        executeActionForSelected,
        setSelectedItems
    };
};
