import React, { useState, useRef, useEffect } from 'react';
import { DrawerLine } from '../../types';
import { extractNoun, isItemContainer, isFluidContainer } from '../../utils/gameUtils';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';
import { useGame } from '../../context/GameContext';

interface EquipmentDrawerProps {
    isOpen: boolean;
    isPeeking?: boolean;
    onClose: () => void;
    eqLines: DrawerLine[];
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean) => void;
    triggerHaptic: (ms: number) => void;
    isLandscape?: boolean;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
}

export const EquipmentDrawer: React.FC<EquipmentDrawerProps> = ({
    isOpen,
    isPeeking,
    onClose,
    eqLines,
    inventoryLines,
    handleButtonClick,
    triggerHaptic,
    isLandscape,
    executeCommand,
    pendingDrawerContainerRef,
    inlineCategories = []
}) => {
    const [draggedItem, setDraggedItem] = useState<{ line: DrawerLine; source: 'inventory' | 'equipment'; x: number; y: number; commandLabel?: string } | null>(null);
    const [primedItemId, setPrimedItemId] = useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);
    const lastHoveredTargetRef = useRef<HTMLElement | null>(null);
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const { activeDragData, isMendingMode, setIsMendingMode, mendingTarget, setMendingTarget } = useGame();

    const ghostRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<any>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const pendingDragRef = useRef<{ line: DrawerLine; source: 'inventory' | 'equipment' } | null>(null);
    const draggedRef = useRef<{ line: DrawerLine; source: 'inventory' | 'equipment' } | null>(null);
    const isDraggingRef = useRef(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    const cleanupDrag = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
        setDraggedItem(null);
        setPrimedItemId(null);
        setActiveDropTarget(null);
        lastHoveredTargetRef.current = null;
        startPosRef.current = null;
        pendingDragRef.current = null;
        draggedRef.current = null;
        isDraggingRef.current = false;
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', cleanupDrag);
    };

    const moveCountRef = useRef(0);

    const handleSectionScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // Placeholder to avoid reference error, can be implemented later if sticky headers are needed
    };

    const isLineVisible = (line: DrawerLine, allLines: DrawerLine[]): boolean => {
        if (!line.parentItemId) return true;
        
        // Find the parent item
        const parent = allLines.find(l => l.id === line.parentItemId);
        if (!parent) return true; // Orphaned items shown by default
        
        // If parent is not expanded, this line is hidden
        if (!expandedContainers.has(parent.id)) return false;
        
        // Check if parent itself is visible (recursive)
        return isLineVisible(parent, allLines);
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
        if (startPosRef.current && !isDraggingRef.current) {
            const dx = Math.abs(e.clientX - startPosRef.current.x);
            const dy = Math.abs(e.clientY - startPosRef.current.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const threshold = e.pointerType === 'mouse' ? 10 : 15;
            
            if (dist > threshold) {
                // Instead of cleaning up, START the drag
                startActiveDrag(e.clientX, e.clientY);
            }
        }

        if (isDraggingRef.current) {
            if (ghostRef.current) {
                ghostRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(1.05)`;
            }

            if (isOpen && drawerRef.current) {
                const rect = drawerRef.current.getBoundingClientRect();
                if (e.clientX < rect.left - 50 || (rect.left < 50 && e.clientX < 80)) {
                    onClose();
                }
            }

            moveCountRef.current++;
            if (moveCountRef.current % 2 !== 0) return;

            const target = document.elementFromPoint(e.clientX, e.clientY);
            const currentDragged = draggedRef.current;
            if (!currentDragged) return;

            // Use extractNoun for a cleaner label
            const isMultiDrag = selectedItems.has(currentDragged.line.id);
            const dragCount = isMultiDrag ? selectedItems.size : 1;
            const itemNoun = extractNoun(currentDragged.line.text);
            const dragLabel = dragCount > 1 ? `${dragCount} items` : itemNoun;

            let commandLabel = "";
            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter') as HTMLElement | null;
            const inputArea = target?.closest('.input-area') as HTMLElement | null;
            const mainLog = target?.closest('.message-log-container') as HTMLElement | null;
            const targetItem = target?.closest('.inline-btn.auto-item') as HTMLElement | null;
            const sectionTarget = target?.closest('[data-drawer-section]') as HTMLElement | null;

            const logicalTarget = logRecipient || targetItem || inputArea || (mainLog && !target?.closest('.right-drawer') ? mainLog : null) || sectionTarget;

            if (logicalTarget !== lastHoveredTargetRef.current) {
                document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
                lastHoveredTargetRef.current = logicalTarget;
                if (logicalTarget && (!sectionTarget || logicalTarget !== sectionTarget)) {
                    logicalTarget.classList.add('drop-hover-active');
                }
            }

            if (logRecipient) {
                const ctx = logRecipient.getAttribute('data-context');
                if (ctx) {
                    setActiveDropTarget({ type: 'log', id: ctx });
                    commandLabel = `Give ${dragLabel} to ${ctx}`;
                }
            } else if (targetItem) {
                const targetCmd = targetItem.getAttribute('data-cmd');
                const targetContext = targetItem.getAttribute('data-context');
                const targetText = targetItem.innerText || '';
                const isTargetContainer = isItemContainer(targetText);
                const targetItemName = targetItem?.getAttribute('data-item-name') || targetContext || extractNoun(targetText);
                
                if (targetCmd === 'inline-water' && isFluidContainer(currentDragged.line.text)) {
                    setActiveDropTarget({ type: 'log', id: targetContext || 'water' });
                    commandLabel = `Fill ${dragLabel} from ${targetContext || 'water'}`;
                } else if (isTargetContainer && targetItemName !== (currentDragged?.line.context || currentDragged?.line.id)) {
                    setActiveDropTarget({ type: 'container', id: targetItemName! });
                    commandLabel = `Put ${dragLabel} in ${targetItemName}`;
                }
            } else if (inputArea) {
                setActiveDropTarget({ type: 'log', id: 'input' });
                commandLabel = `Paste ${dragLabel} in Command Bar`;
            } else if (mainLog && !target?.closest('.right-drawer')) {
                setActiveDropTarget({ type: 'log', id: 'ground' });
                commandLabel = `Drop ${dragLabel} on ground`;
            } else if (sectionTarget) {
                const section = sectionTarget.getAttribute('data-drawer-section');
                if (section && section !== currentDragged?.source) {
                    setActiveDropTarget({ type: 'section', id: section });
                    const action = (section === 'equipment' || section === 'equipmentlist') ? 'Wear' : 'Remove';
                    commandLabel = `${action} ${dragLabel}`;
                } else if (section && currentDragged?.line.parentItemNoun) {
                    setActiveDropTarget({ type: 'section', id: section });
                    commandLabel = `Get ${dragLabel} from ${currentDragged.line.parentItemNoun}`;
                } else {
                    setActiveDropTarget(null);
                }
            } else {
                setActiveDropTarget(null);
            }

            setDraggedItem(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, commandLabel } : null);
        }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isDraggingRef.current && draggedRef.current) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const currentItem = draggedRef.current.line;
            const currentSource = draggedRef.current.source;
            const isMultiDrag = selectedItems.has(currentItem.id);
            const itemsToProcess = isMultiDrag ? Array.from(selectedItems).map(id => {
                const line = [...eqLines, ...inventoryLines].find(l => l.id === id);
                if (!line) return null;
                const source = eqLines.some(l => l.id === id) ? 'equipment' : 'inventory';
                return { line, source };
            }).filter(Boolean) : [{ line: currentItem, source: currentSource }];

            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter');
            const targetBtn = target?.closest('.inline-btn.auto-item');
            const mainLog = target?.closest('.message-log-container');
            const sectionWrapper = target?.closest('[data-drawer-section]');

            if (logRecipient || targetBtn || (mainLog && !target?.closest('.right-drawer')) || sectionWrapper) {
                triggerHaptic(60);
                
                itemsToProcess.forEach((item, index) => {
                    if (!item) return;
                    const itm = item.line;
                    const src = item.source as 'inventory' | 'equipment';
                    const noun = extractNoun(itm.text);
                    const delay = index * 250;

                    setTimeout(() => {
                        if (logRecipient) {
                            const recipientName = logRecipient.getAttribute('data-context');
                            if (recipientName) {
                                if (src === 'equipment') {
                                    executeCommand(`remove ${noun}`, true, true);
                                    setTimeout(() => executeCommand(`give ${noun} ${recipientName}`, false, false), 120);
                                } else if (itm.parentItemNoun) {
                                    executeCommand(`get ${noun} ${itm.parentItemNoun}`, true, true);
                                    setTimeout(() => executeCommand(`give ${noun} ${recipientName}`, false, false), 120);
                                } else {
                                    executeCommand(`give ${noun} ${recipientName}`, false, false);
                                }
                            }
                        } else if (targetBtn) {
                            const targetCmd = targetBtn?.getAttribute('data-cmd');
                            const targetContext = targetBtn?.getAttribute('data-context');
                            const targetText = (targetBtn as HTMLElement)?.innerText || '';
                            const isTargetContainer = isItemContainer(targetText);
                            const targetItemName = targetBtn?.getAttribute('data-item-name') || targetContext || extractNoun(targetText);

                            if (targetCmd === 'inline-water' && isFluidContainer(itm.text)) {
                                if (src === 'equipment') {
                                    executeCommand(`remove ${noun}`, true, true);
                                    setTimeout(() => executeCommand(`fill ${noun} ${targetContext || 'water'}`, false, false), 120);
                                } else if (itm.parentItemNoun) {
                                    executeCommand(`get ${noun} ${itm.parentItemNoun}`, true, true);
                                    setTimeout(() => executeCommand(`fill ${noun} ${targetContext || 'water'}`, false, false), 120);
                                } else {
                                    executeCommand(`fill ${noun} ${targetContext || 'water'}`, false, false);
                                }
                            } else if (isTargetContainer && targetItemName !== (itm.context || itm.id)) {
                                if (src === 'equipment') {
                                    executeCommand(`remove ${noun}`, true, true);
                                    setTimeout(() => executeCommand(`put ${noun} ${targetItemName}`, false, false), 120);
                                } else if (itm.parentItemNoun) {
                                    executeCommand(`get ${noun} ${itm.parentItemNoun}`, true, true);
                                    setTimeout(() => executeCommand(`put ${noun} ${targetItemName}`, false, false), 120);
                                } else {
                                    executeCommand(`put ${noun} ${targetItemName}`, false, false);
                                }
                            }
                        } else if (mainLog && !target?.closest('.right-drawer')) {
                            if (src === 'equipment') {
                                executeCommand(`remove ${noun}`, true, true);
                                setTimeout(() => executeCommand(`drop ${noun}`, false, false), 120);
                            } else if (itm.parentItemNoun) {
                                executeCommand(`get ${noun} ${itm.parentItemNoun}`, true, true);
                                setTimeout(() => executeCommand(`drop ${noun}`, false, false), 120);
                            } else {
                                executeCommand(`drop ${noun}`, false, false);
                            }
                        } else if (sectionWrapper) {
                            const section = sectionWrapper.getAttribute('data-drawer-section');
                            if (section && section !== src) {
                                if (itm.parentItemNoun) {
                                    executeCommand(`get ${noun} ${itm.parentItemNoun}`, true, true);
                                    const c = (section === 'equipment' || section === 'equipmentlist') ? 'wear' : 'remove';
                                    setTimeout(() => executeCommand(`${c} ${noun}`, false, false), 120);
                                } else {
                                    const c = (section === 'equipment' || section === 'equipmentlist') ? 'wear' : 'remove';
                                    executeCommand(`${c} ${noun}`, false, false);
                                }
                            } else if (section && itm.id.includes('.')) {
                                const parts = itm.id.split('.');
                                let handle = parts[0];
                                let container = parts[1];
                                if (!isNaN(parseInt(handle)) && parts.length >= 3) {
                                    handle = `${parts[0]}.${parts[1]}`;
                                    container = parts[2];
                                }
                                executeCommand(`get ${handle} ${container}`, false, false);
                            }
                        }

                        // Final item cleanup/refresh logic
                        if (index === itemsToProcess.length - 1) {
                            setTimeout(() => {
                                executeCommand('inv', false, true, true, true);
                                executeCommand('eq', false, true, true, true);
                            }, 500);
                            setSelectedItems(new Set());
                        }
                    }, delay);
                });
                cleanupDrag();
                return;
            }
        }
        setTimeout(() => cleanupDrag(), 0);
    };

    useEffect(() => {
        return () => cleanupDrag();
    }, []);

    useEffect(() => {
        if (!isOpen && !isDraggingRef.current) {
            cleanupDrag();
        }
    }, [isOpen]);

    const startActiveDrag = (x: number, y: number) => {
        if (pendingDragRef.current && !isDraggingRef.current) {
            triggerHaptic(40);
            const line = pendingDragRef.current.line;
            const source = pendingDragRef.current.source;
            draggedRef.current = { line, source };
            setDraggedItem({ line, source, x, y });
            isDraggingRef.current = true;
            setPrimedItemId(null);
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            window.addEventListener('pointercancel', cleanupDrag);
        }
    };

    const handlePointerDown = (e: React.PointerEvent, line: DrawerLine, source: 'inventory' | 'equipment') => {
        if (!line.isItem) return;
        if (isMendingMode) {
            triggerHaptic(20);
            const newSelected = new Set(selectedItems);
            if (newSelected.has(line.id)) {
                newSelected.delete(line.id);
            } else {
                newSelected.add(line.id);
            }
            setSelectedItems(newSelected);
            return;
        }
        cleanupDrag();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        startPosRef.current = { x: e.clientX, y: e.clientY };
        pendingDragRef.current = { line, source };
        setPrimedItemId(line.id);

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', cleanupDrag);

        longPressTimerRef.current = setTimeout(() => {
            if (startPosRef.current) {
                startActiveDrag(startPosRef.current.x, startPosRef.current.y);
            }
        }, 350);
    };


    const renderLine = (line: DrawerLine, listType: 'inventorylist' | 'equipmentlist') => {
        const source = listType === 'inventorylist' ? 'inventory' : 'equipment';
        const isBeingDragged = draggedItem?.line.id === line.id;
        const isTargeted = activeDropTarget?.type === 'container' && activeDropTarget.id === (line.context || line.id);
        const isSelected = selectedItems.has(line.id);
        const depth = line.depth || 0;

        if (line.isItem) {
            const isPrimed = primedItemId === line.id;
            const itemNoun = extractNoun(line.text);
            const categories = (inlineCategories && inlineCategories.length > 0) ? inlineCategories : undefined;
            const category = getCategoryForName(line.text, categories) || 'inline-default';
            const glowColor = getGlowColorForCategory(category, categories);
            
            // Stronger visual cues: background, border, and subtle glow
            const colorRgb = glowColor ? (glowColor.match(/rgba?\((\d+, \d+, \d+)/)?.[1] || '100, 255, 100') : '100, 255, 100';
            const baseBackground = line.isContainer ? 'rgba(137, 180, 250, 0.25)' : (glowColor ? `rgba(${colorRgb}, 0.25)` : 'rgba(255, 255, 255, 0.05)');
            const primedBackground = glowColor ? `rgba(${colorRgb}, 0.4)` : 'rgba(255, 255, 255, 0.12)';
            const borderLeftStyle = glowColor ? `4px solid rgba(${colorRgb}, 0.8)` : '4px solid transparent';
            const glowEffect = glowColor ? `0 0 12px rgba(${colorRgb}, 0.15)` : 'none';

            return (
                <div key={line.id} style={{ display: 'flex', alignItems: 'center', marginLeft: `${depth * 20}px`, marginBottom: '4px' }}>
                    <div 
                        className={`drawer-checkbox ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(20);
                            const newSelected = new Set(selectedItems);
                            if (newSelected.has(line.id)) newSelected.delete(line.id);
                            else newSelected.add(line.id);
                            setSelectedItems(newSelected);
                        }}
                        style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                            marginRight: '10px',
                            backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                            cursor: 'pointer'
                        }}
                    >
                        {isSelected && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                    </div>
                    {line.prefixHtml && (
                        <div 
                            style={{ 
                                padding: '0 8px 0 0', 
                                opacity: 0.5, 
                                fontSize: '0.75rem', 
                                whiteSpace: 'nowrap',
                                color: 'var(--accent)',
                                fontStyle: 'italic',
                                flexShrink: 0
                            }}
                            dangerouslySetInnerHTML={{ __html: line.prefixHtml }}
                        />
                    )}
                    <div
                        className={`inline-btn auto-item ${isPrimed ? 'primed' : ''} ${isTargeted ? 'drop-target' : ''} ${line.isContainer ? 'is-container' : ''} ${isSelected ? 'selected' : ''}`}
                        data-item-name={line.context || line.id}
                        onPointerDown={(e) => handlePointerDown(e, line, source)}
                        onPointerUp={(e) => {
                            if (isDraggingRef.current) return;
                            cleanupDrag();
                            if (!line.isItem) return;
                            triggerHaptic(20);

                            if (line.isContainer) {
                                setExpandedContainers(prev => {
                                    const next = new Set(prev);
                                    if (next.has(line.id)) {
                                        next.delete(line.id);
                                    } else {
                                        next.add(line.id);
                                        pendingDrawerContainerRef.current = {
                                            containerId: line.id,
                                            cmd: listType,
                                            afterId: line.id
                                        };
                                        executeCommand(`look in ${line.context || line.id}`, true, true);
                                        const thisId = line.id;
                                        setTimeout(() => { 
                                            if (pendingDrawerContainerRef.current?.containerId === thisId) {
                                                pendingDrawerContainerRef.current = null; 
                                            }
                                        }, 5000);
                                    }
                                    return next;
                                });
                                return;
                            }

                            // Unified Button Click
                            handleButtonClick({
                                id: 'drawer-item-' + line.id,
                                label: itemNoun,
                                command: category,
                                actionType: 'menu',
                                setId: category,
                                isVisible: true,
                                style: { backgroundColor: glowColor || 'var(--accent)' }
                            } as any, e as any, line.context || line.id);
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: line.isItem ? (isPrimed ? primedBackground : baseBackground) : 'transparent',
                            borderRadius: '4px',
                            borderLeft: line.isItem ? borderLeftStyle : 'none',
                            boxShadow: line.isItem ? glowEffect : 'none',
                            fontSize: '0.85rem',
                            cursor: 'grab',
                            fontWeight: line.isContainer ? 'bold' : 'normal',
                            opacity: isBeingDragged ? 0.3 : 1,
                            color: line.isContainer ? '#89b4fa' : 'inherit',
                            transition: 'all 0.2s ease',
                            touchAction: 'none',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: line.html }} style={{ flex: 1 }} />
                        {line.isContainer && (
                            <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '8px', transition: 'transform 0.2s ease', transform: expandedContainers.has(line.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div key={line.id} style={{ 
                padding: '4px 10px', 
                fontSize: '0.8rem', 
                opacity: 0.6, 
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                color: 'var(--accent)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginTop: '8px'
            }} dangerouslySetInnerHTML={{ __html: line.html }} />
        );
    };

    return (
        <div 
            ref={drawerRef} 
            className={`right-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''} ${isLandscape ? 'landscape' : ''}`}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.closest('.drawer-checkbox') || target.tagName === 'INPUT') return;
                e.currentTarget.setPointerCapture(e.pointerId);
                (e.currentTarget as any)._startX = e.clientX;
                (e.currentTarget as any)._startY = e.clientY;
            }}
            onPointerUp={(e) => {
                const startX = (e.currentTarget as any)._startX;
                const startY = (e.currentTarget as any)._startY;
                if (startX !== undefined && startX !== null) {
                    const deltaX = startX - e.clientX;
                    const deltaY = Math.abs(e.clientY - (startY || 0));
                    // For right drawer, swiping right (negative deltaX) closes it
                    if (deltaX < -20 && Math.abs(deltaX) > deltaY) {
                        triggerHaptic(40);
                        onClose();
                    }
                }
                (e.currentTarget as any)._startX = null;
                (e.currentTarget as any)._startY = null;
            }}
            onPointerCancel={(e) => {
                (e.currentTarget as any)._startX = null;
            }}
            style={{ touchAction: 'pan-y' }}
        >
            <div className="drawer-header" style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', background: 'rgba(255,255,255,0.03)' }}>
                <div className="swipe-indicator" style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }} />
                <span className="drawer-title" style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px', color: 'var(--accent)' }}>Equipment & Items</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="drawer-content" onScroll={handleSectionScroll}>
                <div className="drawer-section" data-drawer-section="equipmentlist">
                    <div className="section-header">Equipment</div>
                    {eqLines.filter(l => isLineVisible(l, eqLines)).map(line => renderLine(line, 'equipmentlist'))}
                    {eqLines.length === 0 && <div className="empty-state">No equipment worn</div>}
                </div>

                <div className="drawer-section" data-drawer-section="inventorylist">
                    <div className="section-header">Inventory</div>
                    {inventoryLines.filter(l => isLineVisible(l, inventoryLines)).map(line => renderLine(line, 'inventorylist'))}
                    {inventoryLines.length === 0 && <div className="empty-state">Inventory is empty</div>}
                </div>
            </div>

            {isMendingMode && (
                <div className="drawer-footer mending-footer" style={{
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    gap: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <button 
                        className="footer-btn mend-cancel-btn"
                        onClick={() => {
                            setIsMendingMode(false);
                            setMendingTarget(null);
                            setSelectedItems(new Set());
                        }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff'
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        className="footer-btn mend-confirm-btn"
                        disabled={selectedItems.size === 0}
                        onClick={() => {
                            const items = Array.from(selectedItems).map(id => {
                                const line = [...eqLines, ...inventoryLines].find(l => l.id === id);
                                if (!line) return null;
                                const isEq = eqLines.some(l => l.id === id);
                                return { handle: line.context || line.id, isEq };
                            }).filter(Boolean);

                            items.forEach((item, index) => {
                                setTimeout(() => {
                                    if (item?.isEq) {
                                        executeCommand(`remove ${item.handle}`, false, false);
                                        executeCommand(`mend ${item.handle}`, false, false);
                                    } else {
                                        executeCommand(`mend ${item?.handle}`, false, false);
                                    }
                                }, index * 350); // Stagger commands
                            });

                            setIsMendingMode(false);
                            setMendingTarget(null);
                            setSelectedItems(new Set());
                            onClose();
                        }}
                        style={{
                            flex: 2,
                            padding: '12px',
                            borderRadius: '8px',
                            background: selectedItems.size > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
                            border: 'none',
                            color: selectedItems.size > 0 ? '#000' : 'rgba(255,255,255,0.2)',
                            fontWeight: 'bold',
                            opacity: selectedItems.size > 0 ? 1 : 0.5
                        }}
                    >
                        Mend Selected ({selectedItems.size})
                    </button>
                </div>
            )}

            {draggedItem && (
                <div 
                    ref={ghostRef}
                    className="drag-ghost"
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        transform: `translate3d(${draggedItem.x}px, ${draggedItem.y}px, 0) translate(-50%, -50%) scale(1.05)`,
                        pointerEvents: 'none'
                    }}
                >
                    <div className="ghost-content" dangerouslySetInnerHTML={{ __html: draggedItem.line.html }} />
                    {selectedItems.size > 1 && selectedItems.has(draggedItem.line.id) && (
                        <div className="ghost-badge" style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: 'var(--accent)',
                            color: '#000',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                        }}>
                            {selectedItems.size}
                        </div>
                    )}
                    {draggedItem.commandLabel && <div className="ghost-label">{draggedItem.commandLabel}</div>}
                </div>
            )}
        </div>
    );
};
