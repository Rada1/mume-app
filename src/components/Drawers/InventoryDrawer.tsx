import React from 'react';
import { DrawerLine } from '../../types';
import { extractNoun, isItemContainer, isFluidContainer } from '../../utils/gameUtils';

interface InventoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    onClose,
    triggerHaptic,
    inventoryLines,
    handleButtonClick,
    executeCommand,
    pendingDrawerContainerRef
}) => {
    const [draggedItem, setDraggedItem] = React.useState<{ line: DrawerLine; x: number; y: number; commandLabel?: string } | null>(null);
    const [primedItemId, setPrimedItemId] = React.useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = React.useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);
    const [expandedContainers, setExpandedContainers] = React.useState<Set<string>>(new Set());

    const ghostRef = React.useRef<HTMLDivElement>(null);
    const longPressTimerRef = React.useRef<any>(null);
    const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
    const pendingDragRef = React.useRef<DrawerLine | null>(null);
    const isDraggingRef = React.useRef(false);

    const cleanupDrag = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
        setDraggedItem(null);
        setPrimedItemId(null);
        setActiveDropTarget(null);
        startPosRef.current = null;
        pendingDragRef.current = null;
        isDraggingRef.current = false;
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
                ghostRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(1.05)`;
            }

            moveCountRef.current++;
            if (moveCountRef.current % 2 !== 0) return;

            const target = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

            const itemNoun = pendingDragRef.current?.context || pendingDragRef.current?.id || '';
            let label = "";

            const logArea = target?.closest('.message-log-container');
            const targetItem = target?.closest('.inline-btn.auto-item') as HTMLElement | null;
            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter') as HTMLElement | null;

            if (logRecipient) {
                const ctx = logRecipient.getAttribute('data-context');
                if (ctx) {
                    logRecipient.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'log', id: ctx });
                    label = `Give ${itemNoun.split('.')[0]} to ${ctx}`;
                }
            } else if (targetItem) {
                const targetCmd = targetItem.getAttribute('data-cmd');
                const targetContext = targetItem.getAttribute('data-context');
                const targetName = targetItem.getAttribute('data-item-name');
                const isTargetContainer = targetItem.classList.contains('is-container');

                if (targetCmd === 'inline-water' && isFluidContainer(pendingDragRef.current!.text)) {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'log', id: targetContext || 'water' });
                    label = `Fill ${itemNoun.split('.')[0]} from ${targetContext || 'water'}`;
                } else if (isTargetContainer && targetName !== itemNoun) {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'container', id: targetName || '' });
                    label = `Put ${itemNoun.split('.')[0]} in ${targetName}`;
                }
            } else if (logArea) {
                logArea.classList.add('drop-hover-active');
                setActiveDropTarget({ type: 'log', id: 'ground' });
                label = `Drop ${itemNoun.split('.')[0]} on ground`;
            } else {
                setActiveDropTarget(null);
            }

            setDraggedItem(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, commandLabel: label } : null);
        }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isDraggingRef.current && pendingDragRef.current) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const fullItemNoun = pendingDragRef.current.context || pendingDragRef.current.id;
            const itemNoun = fullItemNoun.split('.')[0];

            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter');
            if (logRecipient) {
                 const recipientName = logRecipient.getAttribute('data-context');
                 if (recipientName) {
                     triggerHaptic(60);
                     if (pendingDragRef.current.parentItemNoun) {
                         executeCommand(`get ${itemNoun} ${pendingDragRef.current.parentItemNoun}`, true, true);
                     }
                     executeCommand(`give ${itemNoun} ${recipientName}`);
                     cleanupDrag();
                     return;
                 }
            }

            const targetItem = target?.closest('.inline-btn.auto-item');
            const targetCmd = targetItem?.getAttribute('data-cmd');
            const targetContext = targetItem?.getAttribute('data-context');
            const targetName = targetItem?.getAttribute('data-item-name');

            if (targetCmd === 'inline-water' && isFluidContainer(pendingDragRef.current.text)) {
                triggerHaptic(60);
                if (pendingDragRef.current.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${pendingDragRef.current.parentItemNoun}`, true, true);
                }
                executeCommand(`fill ${itemNoun} ${targetContext || 'water'}`);
                cleanupDrag();
                return;
            }

            if (targetItem?.classList.contains('is-container') && targetName && targetName !== itemNoun) {
                triggerHaptic(60);
                if (pendingDragRef.current.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${pendingDragRef.current.parentItemNoun}`, true, true);
                }
                executeCommand(`put ${itemNoun} ${targetName}`);
                cleanupDrag();
                return;
            }

            const logArea = target?.closest('.message-log-container');
            if (logArea) {
                triggerHaptic(60);
                if (pendingDragRef.current.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${pendingDragRef.current.parentItemNoun}`, true, true);
                }
                executeCommand(`drop ${itemNoun}`);
                setTimeout(() => {
                    executeCommand('inv', false, true, true, true);
                    executeCommand('eq', false, true, true, true);
                }, 400);
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
            setDraggedItem({ line, x, y });
            setPrimedItemId(null);
            window.addEventListener('pointercancel', cleanupDrag);
        }
    };

    const handlePointerDownItem = (e: React.PointerEvent, line: DrawerLine) => {
        if (!line.isItem) return;
        cleanupDrag();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        startPosRef.current = { x: e.clientX, y: e.clientY };
        pendingDragRef.current = line;
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

    return (
        <div className={`inventory-drawer ${isOpen ? 'open' : ''}`} style={{ pointerEvents: isOpen ? 'auto' : 'none', touchAction: 'none' }}>
            {draggedItem && (
                <div 
                    ref={ghostRef}
                    style={{
                        position: 'fixed',
                        left: 0, top: 0,
                        pointerEvents: 'none',
                        zIndex: 99999,
                        transform: `translate3d(${draggedItem.x}px, ${draggedItem.y}px, 0) translate(-50%, -50%) scale(1.05)`,
                        background: 'rgba(30, 40, 60, 0.7)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid var(--accent)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        opacity: 0.8,
                        whiteSpace: 'nowrap',
                        color: '#fff'
                    }}
                >
                    <div dangerouslySetInnerHTML={{ __html: draggedItem.line.html }} />
                    {draggedItem.commandLabel && (
                        <div style={{
                            marginTop: '4px',
                            fontSize: '0.7rem',
                            background: 'var(--accent)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>{draggedItem.commandLabel}</div>
                    )}
                </div>
            )}
            <div className="drawer-header" style={{ height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                <div className="swipe-indicator" style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px' }} />
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Inventory</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', fontSize: '1rem' }}>✕</button>
            </div>
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {inventoryLines.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <span>Inventory is currently empty</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                                                }
                                            }}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: '6px', cursor: 'grab',
                                                background: line.isItem ? (isPrimed ? 'rgba(100, 255, 100, 0.15)' : (line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)')) : 'transparent',
                                                opacity: isBeingDragged ? 0.3 : 1, transition: 'all 0.2s ease', touchAction: 'none', display: 'flex', alignItems: 'center'
                                            }}
                                        >
                                            <div dangerouslySetInnerHTML={{ __html: line.html }} style={{ flex: 1 }} />
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
