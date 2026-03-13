import React from 'react';

import { DrawerLine } from '../../types';

interface InventoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    onClose,
    triggerHaptic,
    inventoryLines,
    handleButtonClick,
    executeCommand
}) => {
    const [draggedItem, setDraggedItem] = React.useState<{ line: DrawerLine; x: number; y: number } | null>(null);
    const [primedItemId, setPrimedItemId] = React.useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = React.useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);

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
        // Capture the pointer to ensure move events are received even if the finger moves fast
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

    const moveCountRef = React.useRef(0);
    const handleGlobalPointerMove = (e: PointerEvent) => {
        if (startPosRef.current && !isDraggingRef.current) {
            const dist = Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2));
            
            // If we are in the "priming" phase (waiting for long press)
            // Any significant movement should cancel the drag so the user can scroll
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

            // Performance: only check drop target every other move event
            moveCountRef.current++;
            if (moveCountRef.current % 2 !== 0) return;

            const target = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

            // Target Highlighting
            const logArea = target?.closest('.message-log-container');
            if (logArea) {
                logArea.classList.add('drop-hover-active');
                setActiveDropTarget({ type: 'log', id: 'ground' });
                return;
            }

            const container = target?.closest('.inline-btn.is-container');
            if (container) {
                container.classList.add('drop-hover-active');
                setActiveDropTarget({ type: 'container', id: container.getAttribute('data-item-name') || '' });
                return;
            }
            setActiveDropTarget(null);
        }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isDraggingRef.current && pendingDragRef.current) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const itemNoun = pendingDragRef.current.context || pendingDragRef.current.id;

            const logArea = target?.closest('.message-log-container');
            if (logArea) {
                triggerHaptic(60);
                executeCommand(`drop ${itemNoun}`);
            } else {
                const container = target?.closest('.inline-btn.is-container');
                const targetName = container?.getAttribute('data-item-name');
                if (targetName && targetName !== itemNoun) {
                    triggerHaptic(60);
                    executeCommand(`put ${itemNoun} ${targetName}`);
                }
            }
        }
        setTimeout(() => cleanupDrag(), 0);
    };

    return (
        <div className={`inventory-drawer ${isOpen ? 'open' : ''}`} style={{ pointerEvents: isOpen ? 'auto' : 'none', touchAction: 'none' }}>
            {draggedItem && (
                <div 
                    ref={ghostRef}
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: 0,
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
                        fontSize: '0.85rem',
                        color: '#fff',
                        visibility: 'visible',
                        transition: 'none',
                        willChange: 'transform'
                    }} dangerouslySetInnerHTML={{ __html: draggedItem.line.html }} />
            )}
            <div className="drawer-header"
                onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    (e.currentTarget as any)._startY = e.clientY;
                }}
                onPointerUp={(e) => {
                    const startY = (e.currentTarget as any)._startY;
                    if (startY !== undefined && startY !== null) {
                        if (e.clientY - startY > 50) {
                            triggerHaptic(40);
                            onClose();
                        }
                    }
                }}
                style={{ height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}
            >
                <div className="swipe-indicator" style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px' }} />
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Inventory</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {inventoryLines.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <span>Inventory is currently empty</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {inventoryLines.map(line => {
                            const isPrimed = primedItemId === line.id;
                            const isBeingDragged = draggedItem?.line.id === line.id;
                            const depth = line.depth || 0;
                            
                            return (
                                <div key={line.id} style={{ display: 'flex', alignItems: 'center', marginLeft: `${depth * 20}px`, marginBottom: '4px' }}>
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
                                        className={`auto-item ${line.isItem ? "inline-btn" : ""} ${isPrimed ? 'primed' : ''} ${line.isContainer ? 'is-container' : ''}`}
                                        data-item-name={line.context || line.id}
                                        onPointerDown={(e) => handlePointerDownItem(e, line)}
                                        onPointerUp={(e) => {
                                            if (isDraggingRef.current) {
                                                return;
                                            }
                                            cleanupDrag();
                                            if (!line.isItem) return;
                                            triggerHaptic(20);
                                            handleButtonClick({
                                                id: `inv-${line.id}`,
                                                command: 'inventorylist',
                                                label: line.context || 'Item',
                                                actionType: 'menu'
                                            } as any, e as any, line.context, line.isContainer);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: line.isItem ?
                                                (isPrimed ? 'rgba(100, 255, 100, 0.15)' : (line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)'))
                                                : 'transparent',
                                            borderRadius: depth > 0 ? '0 6px 6px 0' : '6px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderLeft: depth > 0 && !line.prefixHtml ? `${depth * 3}px solid #89b4fa` : '1px solid rgba(255,255,255,0.05)',
                                            fontSize: depth > 0 ? '0.8rem' : '0.85rem',
                                            cursor: line.isItem ? 'grab' : 'default',
                                            fontWeight: line.isContainer ? 'bold' : 'normal',
                                            opacity: isBeingDragged ? 0.3 : 1,
                                            color: line.isContainer ? '#89b4fa' : (depth > 0 ? 'rgba(255,255,255,0.8)' : 'inherit'),
                                            transition: 'all 0.2s ease',
                                            touchAction: 'none',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: line.html }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
