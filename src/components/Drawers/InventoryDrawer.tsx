import React from 'react';
import ReactDOM from 'react-dom';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { extractNoun, isItemContainer, isFluidContainer, sanitizeGameTarget } from '../../utils/gameUtils';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';

interface InventoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    onClose,
    triggerHaptic,
    inventoryLines,
    handleButtonClick,
    executeCommand,
    pendingDrawerContainerRef,
    inlineCategories = []
}) => {
    const { lighting, applyOptimisticChange } = useGame() as any;
    const [draggedItem, setDraggedItem] = React.useState<{ line: DrawerLine; x: number; y: number; commandLabel?: string; itemNoun?: string } | null>(null);
    const [primedItemId, setPrimedItemId] = React.useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = React.useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);
    const [expandedContainers, setExpandedContainers] = React.useState<Set<string>>(new Set());

    const ghostRef = React.useRef<HTMLDivElement>(null);
    const drawerRef = React.useRef<HTMLDivElement>(null);
    const longPressTimerRef = React.useRef<any>(null);
    const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
    const pendingDragRef = React.useRef<DrawerLine | null>(null);
    const isDraggingRef = React.useRef(false);
    const pointerIdRef = React.useRef<number | null>(null);
    const pointerTargetRef = React.useRef<HTMLElement | null>(null);
    const touchMoveHandlerRef = React.useRef<((e: TouchEvent) => void) | null>(null);

    const cleanupDrag = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
        if (touchMoveHandlerRef.current) {
            window.removeEventListener('touchmove', touchMoveHandlerRef.current);
            touchMoveHandlerRef.current = null;
        }
        setDraggedItem(null);
        setPrimedItemId(null);
        setActiveDropTarget(null);
        startPosRef.current = null;
        pendingDragRef.current = null;
        isDraggingRef.current = false;
        pointerIdRef.current = null;
        pointerTargetRef.current = null;
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', cleanupDrag);
    };

    const moveCountRef = React.useRef(0);

    const handleGlobalPointerMove = (e: PointerEvent) => {
        if (startPosRef.current && !isDraggingRef.current) {
            const dist = Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2));
            const threshold = e.pointerType === 'mouse' ? 15 : 5;
            if (dist > threshold) {
                cleanupDrag();
                return;
            }
        }

        if (isDraggingRef.current) {
            if (ghostRef.current) {
                ghostRef.current.style.left = `${e.clientX}px`;
                ghostRef.current.style.top = `${e.clientY}px`;
            }

            // Edge Scroll detection
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

            const target = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

            const itemLine = pendingDragRef.current!;
            const itemNounForLabel = extractNoun(itemLine.text);
            let label = "";

            const logArea = target?.closest('.message-log-container');
            const targetItem = target?.closest('.inline-btn.auto-item') as HTMLElement | null;
            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter') as HTMLElement | null;

            if (logRecipient) {
                const ctx = logRecipient.getAttribute('data-context');
                if (ctx) {
                    logRecipient.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'log', id: ctx });
                    label = `Give ${itemNounForLabel} to ${ctx}`;
                }
            } else if (targetItem) {
                const targetCmd = targetItem.getAttribute('data-cmd');
                const targetContext = targetItem.getAttribute('data-context');
                const targetName = targetItem.getAttribute('data-item-name');
                const isTargetContainer = targetItem.classList.contains('is-container');

                if (targetCmd === 'inline-water' && isFluidContainer(itemLine.text)) {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'log', id: targetContext || 'water' });
                    label = `Fill ${itemNounForLabel} from ${targetContext || 'water'}`;
                } else if (isTargetContainer && targetName !== itemNounForLabel) {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'container', id: targetName || '' });
                    label = `Put ${itemNounForLabel} in ${targetName}`;
                } else {
                    label = `Dragging ${itemNounForLabel}`;
                }
            } else {
                // Default to ground drop if it hits log OR background
                setActiveDropTarget({ type: 'log', id: 'ground' });
                label = `Drop ${itemNounForLabel} on ground`;
            }

            setDraggedItem(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, commandLabel: label } : null);
        }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isDraggingRef.current && pendingDragRef.current) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const itemLine = pendingDragRef.current;
            const fullPath = itemLine.context || itemLine.id;
            const parentPath = itemLine.parentItemId;
            let itemStableId = fullPath;
            if (parentPath && fullPath.endsWith('.' + parentPath)) {
                itemStableId = fullPath.substring(0, fullPath.length - parentPath.length - 1);
            }

            const itemNoun = sanitizeGameTarget(itemStableId) || itemStableId;
            const parentNoun = itemLine.parentItemNoun;

            console.log(`[InventoryDrawer] Drop detected:`, {
                text: itemLine.text,
                noun: itemNoun,
                parentNoun,
                fullPath,
                parentPath,
                target: target?.className
            });

            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter');
            if (logRecipient) {
                 const recipientName = logRecipient.getAttribute('data-context');
                 if (recipientName) {
                     triggerHaptic(60);
                     applyOptimisticChange({ type: 'give', item: itemLine, from: 'inv' });
                     if (parentNoun) {
                         executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
                         setTimeout(() => executeCommand(`give ${itemNoun} ${recipientName}`), 120);
                     } else {
                         executeCommand(`give ${itemNoun} ${recipientName}`);
                     }
                     cleanupDrag();
                     return;
                 }
            }

            const targetItem = target?.closest('.inline-btn.auto-item');
            const targetCmd = targetItem?.getAttribute('data-cmd');
            const targetContext = targetItem?.getAttribute('data-context');
            const targetName = targetItem?.getAttribute('data-item-name');

            if (targetCmd === 'inline-water' && isFluidContainer(itemLine.text)) {
                triggerHaptic(60);
                if (parentNoun) {
                    executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
                    setTimeout(() => executeCommand(`fill ${itemNoun} ${targetContext || 'water'}`), 120);
                } else {
                    executeCommand(`fill ${itemNoun} ${targetContext || 'water'}`);
                }
                cleanupDrag();
                return;
            }

            if (targetItem?.classList.contains('is-container') && targetName && targetName !== itemNoun) {
                triggerHaptic(60);
                if (parentNoun) {
                    executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
                    setTimeout(() => executeCommand(`put ${itemNoun} ${targetName}`), 120);
                } else {
                    executeCommand(`put ${itemNoun} ${targetName}`);
                }
                cleanupDrag();
                return;
            }

            if (target?.closest('.message-log-container')) {
                triggerHaptic(60);
                applyOptimisticChange({ type: 'drop', item: itemLine, from: 'inv' });
                if (parentNoun) {
                    executeCommand(`get ${itemNoun} ${parentNoun}`, true, true);
                    setTimeout(() => executeCommand(`drop ${itemNoun}`), 120);
                } else {
                    executeCommand(`drop ${itemNoun}`);
                }
            }
        }
        setTimeout(() => cleanupDrag(), 0);
    };

    React.useEffect(() => {
        return () => cleanupDrag();
    }, []);

    const startActiveDrag = (x: number, y: number) => {
        if (pendingDragRef.current && !isDraggingRef.current) {
            triggerHaptic(40);
            isDraggingRef.current = true;
            const line = pendingDragRef.current;
            setDraggedItem({ line, x, y, itemNoun: extractNoun(line.text) });
            setPrimedItemId(null);

            // Capture pointer now that drag is active
            if (pointerTargetRef.current && pointerIdRef.current !== null) {
                try { pointerTargetRef.current.setPointerCapture(pointerIdRef.current); } catch (_) {}
            }

            // Now add drag tracking listeners (deferred from pointerDown to avoid blocking scroll)
            window.addEventListener('pointermove', handleGlobalPointerMove);
            window.addEventListener('pointerup', handleGlobalPointerUp);

            // Prevent browser scrolling while dragging
            const preventScroll = (e: TouchEvent) => { e.preventDefault(); };
            touchMoveHandlerRef.current = preventScroll;
            window.addEventListener('touchmove', preventScroll, { passive: false });
        }
    };

    const handlePointerDownItem = (e: React.PointerEvent, line: DrawerLine) => {
        if (!line.isItem) return;
        cleanupDrag();
        // Don't capture pointer yet — let browser handle scroll if user swipes
        pointerIdRef.current = e.pointerId;
        pointerTargetRef.current = e.currentTarget as HTMLElement;
        startPosRef.current = { x: e.clientX, y: e.clientY };
        pendingDragRef.current = line;
        setPrimedItemId(line.id);

        // Only listen for pointercancel during hold (fires if browser starts scrolling)
        window.addEventListener('pointercancel', cleanupDrag);

        longPressTimerRef.current = setTimeout(() => {
            if (startPosRef.current) {
                startActiveDrag(startPosRef.current.x, startPosRef.current.y);
            }
        }, 400);
    };

    const swipePos = React.useRef<{ x: number, y: number } | null>(null);

    return (
        <div 
            ref={drawerRef}
            className={`inventory-drawer lighting-state-${lighting} ${isOpen ? 'open' : ''}`} 
            style={{ pointerEvents: isOpen ? 'auto' : 'none', touchAction: 'pan-y' }}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                swipePos.current = { x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
                if (swipePos.current) {
                    const deltaY = e.clientY - swipePos.current.y;
                    const deltaX = Math.abs(e.clientX - swipePos.current.x);
                    // Swipe down to close (bottom drawer)
                    if (deltaY > 30 && deltaY > deltaX) {
                        onClose();
                    }
                }
                swipePos.current = null;
            }}
            onPointerCancel={() => {
                swipePos.current = null;
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                if (!dataStr) return;
                
                let data;
                try { data = JSON.parse(dataStr); } catch (err) { return; }
                
                if (data && data.type === 'inline-btn' && data.context) {
                    const target = document.elementFromPoint(e.clientX, e.clientY);
                    const targetBtn = target?.closest('.inline-btn.auto-item');
                    const isTargetContainer = targetBtn?.classList.contains('is-container');
                    const targetName = targetBtn?.getAttribute('data-item-name');

                    triggerHaptic(60);
                    if (isTargetContainer && targetName) {
                        executeCommand(`get ${data.context}`, true, true);
                        setTimeout(() => executeCommand(`put ${data.context} ${targetName}`), 125);
                    } else {
                        executeCommand(`get ${data.context}`);
                    }
                }
            }}
        >
            {draggedItem && ReactDOM.createPortal(
                <div
                    ref={ghostRef}
                    className="drag-ghost"
                    style={{
                        left: draggedItem.x,
                        top: draggedItem.y,
                        pointerEvents: 'none'
                    }}
                >
                    {(() => {
                        const label = draggedItem.commandLabel ?? draggedItem.line.text;
                        const noun = draggedItem.itemNoun;
                        if (!noun) return <>{label}</>;
                        const idx = label.indexOf(noun);
                        if (idx === -1) return <>{label}</>;
                        return <>
                            {label.slice(0, idx)}
                            <span style={{ color: 'rgb(175,255,255)', fontWeight: 'bold' }}>{noun}</span>
                            {label.slice(idx + noun.length)}
                        </>;
                    })()}
                </div>,
                document.body
            )}
            <div className="drawer-header" style={{ height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Inventory</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', fontSize: '1rem' }}>✕</button>
            </div>
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {inventoryLines.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <span>Inventory is currently empty</span>
                    </div>
                ) : (                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {(() => {
                            const visibleLines: DrawerLine[] = [];
                            const collapsedDepths: Set<number> = new Set();
                            for (const line of inventoryLines) {
                                const depth = line.depth || 0;
                                Array.from(collapsedDepths).forEach(d => { if (d >= depth) collapsedDepths.delete(d); });
                                if (collapsedDepths.size > 0) continue;
                                visibleLines.push(line);
                                if (line.isContainer && !expandedContainers.has(line.id)) collapsedDepths.add(depth);
                            }
                             return visibleLines.map(line => {
                                 const isPrimed = primedItemId === line.id;
                                 const isBeingDragged = draggedItem?.line.id === line.id;
                                 const depth = line.depth || 0;
                                 const isExpanded = expandedContainers.has(line.id);
                                 
                                 // Category-based colors
                                 const categories = (inlineCategories && inlineCategories.length > 0) ? inlineCategories : undefined;
                                 const category = getCategoryForName(line.text, categories) || 'inline-default';
                                 
                                 // Force all items in this drawer to be brown as requested by user
                                 const itemBrown = 'rgba(180, 100, 50, 0.9)';
                                 const glowColor = line.isItem ? itemBrown : getGlowColorForCategory(category, categories);
                                 const textColor = line.isItem ? itemBrown : (glowColor || itemBrown);
                                 const baseBackground = 'rgba(255, 255, 255, 0.03)';
                                 const primedBackground = 'rgba(255, 255, 255, 0.1)';
                                 const borderLeftStyle = '4px solid transparent';
                                 const glowEffect = 'none';
 
                                 if (!line.isItem && line.isHeader) {
                                     const category = getCategoryForName(line.text, categories) || 'inline-default';
                                  const glowColor = getGlowColorForCategory(category, categories);
                                  const textColor = glowColor || 'rgba(180, 100, 50, 0.9)';
                                  return (
                                         <div key={line.id} style={{ 
                                             marginLeft: `${depth * 20}px`, 
                                             padding: '12px 10px 4px', 
                                             fontSize: depth > 0 ? 'calc(var(--dynamic-log-size, 16px) * 0.85)' : 'var(--dynamic-log-size, 16px)', 
                                             opacity: 0.6, 
                                             fontWeight: '900',
                                             color: depth > 0 ? '#89b4fa' : 'var(--accent)',
                                             letterSpacing: '1.5px',
                                             textTransform: 'uppercase',
                                             marginTop: depth > 0 ? '4px' : '10px',
                                             borderBottom: depth === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                                         }} dangerouslySetInnerHTML={{ __html: line.html }} />
                                     );
                                 }

                                 return (
                                     <div key={line.id} style={{ display: 'flex', alignItems: 'center', marginLeft: `${depth * 20}px`, marginBottom: '4px', position: 'relative' }}>
                                         <div
                                             className={`auto-item ${line.isItem ? "inline-btn" : ""} ${isPrimed ? 'primed' : ''} ${line.isContainer ? 'is-container' : ''} ${isExpanded ? 'expanded' : ''}`}
                                             data-item-name={line.context || line.id}
                                             onPointerDown={(e) => handlePointerDownItem(e, line)}
                                             onPointerUp={(e) => {
                                                 if (isDraggingRef.current) return;
                                                 cleanupDrag();
                                                 if (!line.isItem) return;
                                                 triggerHaptic(20);
                                                 if (line.isContainer) {
                                                     const newExpanded = new Set(expandedContainers);
                                                     if (newExpanded.has(line.id)) {
                                                         newExpanded.delete(line.id);
                                                     } else {
                                                         newExpanded.add(line.id);
                                                         pendingDrawerContainerRef.current = { containerId: line.id, cmd: 'inventorylist', afterId: line.id };
                                                         executeCommand(`look in ${line.context || line.id}`, true, true);
                                                     }
                                                     setExpandedContainers(newExpanded);
                                                 } else {
                                                     const itemNoun = extractNoun(line.text);
                                                     // The following lines were moved up to the correct scope
                                                     // const category = getCategoryForName(line.text, categories) || 'inline-default';
                                                     // const glowColor = getGlowColorForCategory(category, categories);
                                                     // const textColor = glowColor || 'var(--text)';
                                                     
                                                     handleButtonClick({
                                                         id: 'drawer-item-' + line.id,
                                                         label: itemNoun,
                                                         command: 'inline-obj-char',
                                                         actionType: 'menu',
                                                         setId: 'inline-obj-char',
                                                         isVisible: true,
                                                         style: { backgroundColor: glowColor || 'var(--accent)' }
                                                     } as any, e as any, line.context || line.id, false, line.parentItemNoun);
                                                 }
                                             }}
                                             style={{
                                                 flex: 1, padding: '8px 12px', borderRadius: '4px', cursor: 'grab',
                                                 background: line.isItem ? (isPrimed ? primedBackground : baseBackground) : 'transparent',
                                                 borderLeft: line.isItem ? borderLeftStyle : 'none',
                                                 boxShadow: line.isItem ? glowEffect : 'none',
                                                 opacity: isBeingDragged ? 0.3 : 1, transition: 'all 0.2s ease', touchAction: 'pan-y', display: 'flex', alignItems: 'center'
                                             }}
                                         >
                                             <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap', overflow: 'hidden' }}>
                                                <span style={{ fontWeight: '900', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {line.text.includes(' (') ? line.text.split(' (')[0] : line.text}
                                                </span>
                                                {line.text.includes(' (') && (
                                                    <span style={{ 
                                                        fontWeight: 'normal', 
                                                        opacity: 0.5, 
                                                        marginLeft: '6px', 
                                                        fontSize: '0.9em', 
                                                        color: 'var(--text-dim, #aaa)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        ({line.text.split(' (')[1]}
                                                    </span>
                                                )}
                                             </div>
                                            {line.isContainer && (
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '8px', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                                            )}
                                        </div>
                                    </div>
                                 );
                             });
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};
