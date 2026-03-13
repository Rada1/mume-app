import React, { useState, useRef, useEffect } from 'react';
import { DrawerLine } from '../../types';
import { extractNoun, isItemContainer, isFluidContainer } from '../../utils/gameUtils';
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
    pendingDrawerContainerRef
}) => {
    const [draggedItem, setDraggedItem] = useState<{ line: DrawerLine; source: 'inventory' | 'equipment'; x: number; y: number; commandLabel?: string } | null>(null);
    const [primedItemId, setPrimedItemId] = useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);
    const lastHoveredTargetRef = useRef<HTMLElement | null>(null);
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
    const [selectedMendItems, setSelectedMendItems] = useState<Set<string>>(new Set());

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
            const itemNoun = extractNoun(currentDragged.line.text);

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
                    commandLabel = `Give ${itemNoun} to ${ctx}`;
                }
            } else if (targetItem) {
                const targetCmd = targetItem.getAttribute('data-cmd');
                const targetContext = targetItem.getAttribute('data-context');
                const targetText = targetItem.innerText || '';
                const isTargetContainer = isItemContainer(targetText);
                const targetItemName = targetItem?.getAttribute('data-item-name') || targetContext || extractNoun(targetText);
                
                if (targetCmd === 'inline-water' && isFluidContainer(currentDragged.line.text)) {
                    setActiveDropTarget({ type: 'log', id: targetContext || 'water' });
                    commandLabel = `Fill ${itemNoun} from ${targetContext || 'water'}`;
                } else if (isTargetContainer && targetItemName !== (currentDragged?.line.context || currentDragged?.line.id)) {
                    setActiveDropTarget({ type: 'container', id: targetItemName! });
                    commandLabel = `Put ${itemNoun} in ${targetItemName}`;
                }
            } else if (inputArea) {
                setActiveDropTarget({ type: 'log', id: 'input' });
                commandLabel = `Paste ${itemNoun} in Command Bar`;
            } else if (mainLog && !target?.closest('.right-drawer')) {
                setActiveDropTarget({ type: 'log', id: 'ground' });
                commandLabel = `Drop ${itemNoun} on ground`;
            } else if (sectionTarget) {
                const section = sectionTarget.getAttribute('data-drawer-section');
                if (section && section !== currentDragged?.source) {
                    setActiveDropTarget({ type: 'section', id: section });
                    const action = (section === 'equipment' || section === 'equipmentlist') ? 'Wear' : 'Remove';
                    commandLabel = `${action} ${itemNoun}`;
                } else if (section && currentDragged?.line.parentItemNoun) {
                    setActiveDropTarget({ type: 'section', id: section });
                    commandLabel = `Get ${itemNoun} from ${currentDragged.line.parentItemNoun}`;
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
            const itemNoun = extractNoun(currentItem.text);

            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter');
            if (logRecipient) {
                const recipientName = logRecipient.getAttribute('data-context');
                if (recipientName) {
                    triggerHaptic(60);
                    if (currentSource === 'equipment') {
                        executeCommand(`remove ${itemNoun}`, false, false);
                        setTimeout(() => executeCommand(`give ${itemNoun} ${recipientName}`, false, false), 100);
                    } else if (currentItem.parentItemNoun) {
                        executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                        setTimeout(() => executeCommand(`give ${itemNoun} ${recipientName}`, false, false), 100);
                    } else {
                        executeCommand(`give ${itemNoun} ${recipientName}`, false, false);
                    }
                    cleanupDrag();
                    return;
                }
            }

            const targetBtn = target?.closest('.inline-btn.auto-item');
            const targetCmd = targetBtn?.getAttribute('data-cmd');
            const targetContext = targetBtn?.getAttribute('data-context');
            const targetText = (targetBtn as HTMLElement)?.innerText || '';
            const isTargetContainer = isItemContainer(targetText);
            const targetItemName = targetBtn?.getAttribute('data-item-name') || targetContext || extractNoun(targetText);

            if (targetCmd === 'inline-water' && isFluidContainer(currentItem.text)) {
                triggerHaptic(60);
                if (currentSource === 'equipment') {
                    executeCommand(`remove ${itemNoun}`, false, false);
                    setTimeout(() => executeCommand(`fill ${itemNoun} ${targetContext || 'water'}`, false, false), 100);
                } else if (currentItem.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                    setTimeout(() => executeCommand(`fill ${itemNoun} ${targetContext || 'water'}`, false, false), 100);
                } else {
                    executeCommand(`fill ${itemNoun} ${targetContext || 'water'}`, false, false);
                }
                cleanupDrag();
                return;
            }

            if (isTargetContainer && targetItemName !== (currentItem.context || currentItem.id)) {
                triggerHaptic(60);
                if (currentSource === 'equipment') {
                    executeCommand(`remove ${itemNoun}`, false, false);
                    setTimeout(() => executeCommand(`put ${itemNoun} ${targetItemName}`, false, false), 100);
                } else if (currentItem.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                    setTimeout(() => executeCommand(`put ${itemNoun} ${targetItemName}`, false, false), 100);
                } else {
                    executeCommand(`put ${itemNoun} ${targetItemName}`, false, false);
                }
                cleanupDrag();
                return;
            }

            const mainLog = target?.closest('.message-log-container');
            if (mainLog && !target?.closest('.right-drawer')) {
                triggerHaptic(60);
                if (currentSource === 'equipment') {
                    executeCommand(`remove ${itemNoun}`, false, false);
                    setTimeout(() => executeCommand(`drop ${itemNoun}`, false, false), 100);
                } else if (currentItem.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                    setTimeout(() => executeCommand(`drop ${itemNoun}`, false, false), 100);
                } else {
                    executeCommand(`drop ${itemNoun}`, false, false);
                }
                // Refresh lists
                setTimeout(() => {
                    executeCommand('inv', false, true, true, true);
                    executeCommand('eq', false, true, true, true);
                }, 400);
                cleanupDrag();
                return;
            }

            const sectionWrapper = target?.closest('[data-drawer-section]');
            const section = sectionWrapper?.getAttribute('data-drawer-section');
            if (section) {
                if (section !== currentSource) {
                    triggerHaptic(60);
                    if (currentItem.parentItemNoun) {
                        executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                        const cmd = (section === 'equipment' || section === 'equipmentlist') ? 'wear' : 'remove';
                        setTimeout(() => {
                            executeCommand(`${cmd} ${itemNoun}`, false, false);
                            setTimeout(() => {
                                executeCommand('inv', false, true, true, true);
                                executeCommand('eq', false, true, true, true);
                            }, 400);
                        }, 100);
                        setTimeout(() => executeCommand(`look in ${currentItem.parentItemNoun!}`, true, true), 500);
                    } else {
                        const cmd = (section === 'equipment' || section === 'equipmentlist') ? 'wear' : 'remove';
                        executeCommand(`${cmd} ${itemNoun}`, false, false);
                        setTimeout(() => {
                            executeCommand('inv', false, true, true, true);
                            executeCommand('eq', false, true, true, true);
                        }, 400);
                    }
                } else if (currentItem.id.includes('.')) {
                     triggerHaptic(60);
                     const parts = currentItem.id.split('.');
                     let handle = parts[0];
                     let container = parts[1];
                     if (!isNaN(parseInt(handle)) && parts.length >= 3) {
                         handle = `${parts[0]}.${parts[1]}`;
                         container = parts[2];
                     }
                     executeCommand(`get ${handle} ${container}`, false, false);
                }
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
            const newSelected = new Set(selectedMendItems);
            if (newSelected.has(line.id)) {
                newSelected.delete(line.id);
            } else {
                newSelected.add(line.id);
            }
            setSelectedMendItems(newSelected);
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
        const isSelected = selectedMendItems.has(line.id);
        const depth = line.depth || 0;

        if (line.isItem) {
            const isPrimed = primedItemId === line.id;
            return (
                <div key={line.id} style={{ display: 'flex', alignItems: 'center', marginLeft: `${depth * 20}px`, marginBottom: '4px' }}>
                    {isMendingMode && (
                        <div 
                            className={`mending-checkbox ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                                triggerHaptic(20);
                                const newSelected = new Set(selectedMendItems);
                                if (newSelected.has(line.id)) newSelected.delete(line.id);
                                else newSelected.add(line.id);
                                setSelectedMendItems(newSelected);
                            }}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: '2px solid var(--accent)',
                                marginRight: '10px',
                                backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                        >
                            {isSelected && <span style={{ color: '#000', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                    )}
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
                            if (isDraggingRef.current || isMendingMode) return;
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
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: line.isItem ? (isPrimed ? 'rgba(100, 255, 100, 0.15)' : (line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)')) : 'transparent',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.05)',
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
        <div ref={drawerRef} className={`right-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''} ${isLandscape ? 'landscape' : ''}`}>
            <div className="drawer-header">
                <div className="swipe-indicator" />
                <span className="drawer-title">Equipment & Items</span>
                <button className="close-btn" onClick={onClose}>✕</button>
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
                            setSelectedMendItems(new Set());
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
                        disabled={selectedMendItems.size === 0}
                        onClick={() => {
                            const items = Array.from(selectedMendItems).map(id => {
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
                            setSelectedMendItems(new Set());
                            onClose();
                        }}
                        style={{
                            flex: 2,
                            padding: '12px',
                            borderRadius: '8px',
                            background: selectedMendItems.size > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
                            border: 'none',
                            color: selectedMendItems.size > 0 ? '#000' : 'rgba(255,255,255,0.2)',
                            fontWeight: 'bold',
                            opacity: selectedMendItems.size > 0 ? 1 : 0.5
                        }}
                    >
                        Mend Selected ({selectedMendItems.size})
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
                    {draggedItem.commandLabel && <div className="ghost-label">{draggedItem.commandLabel}</div>}
                </div>
            )}
        </div>
    );
};
