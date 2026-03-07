import React, { useState, useRef, useEffect } from 'react';
import { DrawerLine } from '../../types';

interface EquipmentDrawerProps {
    isOpen: boolean;
    isPeeking?: boolean;
    onClose: () => void;
    eqLines: DrawerLine[];
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string) => void;
    triggerHaptic: (ms: number) => void;
    isLandscape?: boolean;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
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
    executeCommand
}) => {
    const [draggedItem, setDraggedItem] = useState<{ line: DrawerLine; source: 'inventory' | 'equipment'; x: number; y: number } | null>(null);
    const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
    const [primedItemId, setPrimedItemId] = useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);
    const [isNativeDragOver, setIsNativeDragOver] = useState(false);

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
        setDragPos(null);
        setPrimedItemId(null);
        setActiveDropTarget(null);
        startPosRef.current = null;
        pendingDragRef.current = null;
        draggedRef.current = null;
        isDraggingRef.current = false;
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
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
            setDragPos({ x, y });
            isDraggingRef.current = true;
            setPrimedItemId(null);
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        }
    };

    const handlePointerDown = (e: React.PointerEvent, line: DrawerLine, source: 'inventory' | 'equipment') => {
        if (!line.isItem) return;

        cleanupDrag();
        startPosRef.current = { x: e.clientX, y: e.clientY };
        pendingDragRef.current = { line, source };
        setPrimedItemId(line.id);

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);

        longPressTimerRef.current = setTimeout(() => {
            if (startPosRef.current) {
                startActiveDrag(startPosRef.current.x, startPosRef.current.y);
            }
        }, 350);
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
        if (startPosRef.current && !isDraggingRef.current) {
            const dx = Math.abs(e.clientX - startPosRef.current.x);
            const dy = Math.abs(e.clientY - startPosRef.current.y);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (e.pointerType === 'mouse' && dist > 5) {
                startActiveDrag(e.clientX, e.clientY);
            } else if (dist > 15) {
                cleanupDrag();
            }
        }

        if (isDraggingRef.current) {
            setDragPos({ x: e.clientX, y: e.clientY });

            // Auto-close drawer if dragging out of it
            if (isOpen && drawerRef.current) {
                const rect = drawerRef.current.getBoundingClientRect();
                // Close if pointer is to the left of the drawer, with a buffer for mobile
                // If the drawer is full-screen (rect.left < 50), we use a larger 80px gutter
                if (e.clientX < rect.left - 10 || (rect.left < 50 && e.clientX < 80)) {
                    onClose();
                }
            }

            // Detect drop target for highlighting
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const currentDragged = draggedRef.current;

            // Cleanup previous highlight
            document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));

            // 1. Log Target (Highlighters for giving)
            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter');
            if (logRecipient) {
                logRecipient.classList.add('drop-hover-active');
                const ctx = logRecipient.getAttribute('data-context');
                if (ctx) {
                    setActiveDropTarget({ type: 'log', id: ctx });
                    return;
                }
            }

            // 1.b. Main Log Target (Dropping item on ground)
            const mainLog = target?.closest('.message-log-container');
            if (mainLog && !target?.closest('.right-drawer')) {
                mainLog.classList.add('drop-hover-active');
                setActiveDropTarget({ type: 'log', id: 'ground' });
                return;
            }

            // 2. Container Target
            const targetItem = target?.closest('.inline-btn.auto-item');
            if (targetItem) {
                const targetItemName = targetItem?.getAttribute('data-item-name');
                const isTargetContainer = targetItemName && /sack|satchel|pouch|pack|quiver/i.test(targetItemName);
                if (isTargetContainer && targetItemName !== (currentDragged?.line.context || currentDragged?.line.id)) {
                    targetItem.classList.add('drop-hover-active');
                    setActiveDropTarget({ type: 'container', id: targetItemName! });
                    return;
                }
            }

            // 3. Section Target
            const sectionWrapper = target?.closest('[data-drawer-section]');
            const section = sectionWrapper?.getAttribute('data-drawer-section');
            if (section && section !== currentDragged?.source) {
                setActiveDropTarget({ type: 'section', id: section });
                return;
            } else if (section && currentDragged?.line.context?.includes('.')) {
                // Nested items can be dropped in their own section to get them
                setActiveDropTarget({ type: 'section', id: section });
                return;
            }

            setActiveDropTarget(null);
        }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isDraggingRef.current && draggedRef.current) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const currentItem = draggedRef.current.line;
            const currentSource = draggedRef.current.source;

            // 1. Log Target (Give)
            const logRecipient = target?.closest('.pc-highlighter, .npc-highlighter');
            if (logRecipient) {
                const recipientName = logRecipient.getAttribute('data-context');
                if (recipientName) {
                    triggerHaptic(60);
                    const itemNoun = currentItem.context || currentItem.id;
                    if (currentSource === 'equipment') {
                        executeCommand(`remove ${itemNoun}`, false, false);
                    }
                    executeCommand(`give ${itemNoun} ${recipientName}`, false, false);
                    cleanupDrag();
                    return;
                }
            }

            // 2. Container Target (Put)
            const targetBtn = target?.closest('.inline-btn.auto-item');
            const targetItemName = targetBtn?.getAttribute('data-item-name');
            const isTargetContainer = targetItemName && /sack|satchel|pouch|pack|quiver/i.test(targetItemName);

            // Ensure we aren't dropping onto ourselves
            if (isTargetContainer && targetItemName !== (currentItem.context || currentItem.id)) {
                triggerHaptic(60);
                const itemNoun = currentItem.context || currentItem.id;
                if (currentSource === 'equipment') {
                    executeCommand(`remove ${itemNoun}`, false, false);
                }
                executeCommand(`put ${itemNoun} ${targetItemName}`, false, false);
                cleanupDrag();
                return;
            }

            // 2.b. Main Log Target (Drop on ground)
            const mainLog = target?.closest('.message-log-container');
            if (mainLog && !target?.closest('.right-drawer')) {
                triggerHaptic(60);
                const itemNoun = currentItem.context || currentItem.id;
                if (currentSource === 'equipment') {
                    executeCommand(`remove ${itemNoun}`, false, false);
                }
                executeCommand(`drop ${itemNoun}`, false, false);
                cleanupDrag();
                return;
            }

            // 3. Section Target (Wear/Remove/Get)
            const sectionWrapper = target?.closest('[data-drawer-section]');
            const section = sectionWrapper?.getAttribute('data-drawer-section');
            if (section) {
                const itemNoun = currentItem.context || currentItem.id;

                // Nested Get handling (e.g., "item 1.sack")
                const isNested = itemNoun.includes('.');
                if (isNested && (section === 'inventory' || section === 'equipment')) {
                    triggerHaptic(60);
                    const [noun, container] = itemNoun.split('.');
                    executeCommand(`get ${noun} ${container}`, false, false);
                } else if (section !== currentSource) {
                    triggerHaptic(60);
                    const cmd = (section === 'equipment' || section === 'equipmentlist') ? 'wear' : 'remove';
                    executeCommand(`${cmd} ${itemNoun}`, false, false);
                }
            }
        }
        cleanupDrag();
    };

    const renderLine = (line: DrawerLine, listType: 'inventorylist' | 'equipmentlist') => {
        const source = listType === 'inventorylist' ? 'inventory' : 'equipment';
        const isBeingDragged = draggedItem?.line.id === line.id;
        const isTargeted = activeDropTarget?.type === 'container' && activeDropTarget.id === (line.context || line.id);
        const depth = line.depth || 0;

        if (line.isItem) {
            const isPrimed = primedItemId === line.id;
            return (
                <div
                    key={line.id}
                    className={`inline-btn auto-item ${isPrimed ? 'primed' : ''} ${isTargeted ? 'drop-target' : ''} ${line.isContainer ? 'is-container' : ''}`}
                    data-item-name={line.context || line.id}
                    onPointerDown={(e) => handlePointerDown(e, line, source)}
                    onClick={(e) => {
                        if (isDraggingRef.current) return;
                        triggerHaptic(20);
                        handleButtonClick({
                            id: `drawer-${line.id}`,
                            command: listType,
                            label: line.context || 'Item',
                            actionType: 'menu'
                        } as any, e, line.context);
                    }}
                    style={{
                        backgroundColor: isBeingDragged ? 'rgba(100, 255, 100, 0.02)' :
                            isTargeted ? 'rgba(255, 255, 100, 0.2)' :
                                isPrimed ? 'rgba(100, 255, 100, 0.04)' :
                                    line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        borderLeft: depth > 0 ? `${depth * 3}px solid #89b4fa` : 'none',
                        padding: '8px 12px',
                        marginLeft: `${depth * 20}px`,
                        borderRadius: depth > 0 ? '0 4px 4px 0' : '4px',
                        marginBottom: '4px',
                        cursor: 'grab',
                        opacity: isBeingDragged ? 0.3 : isPrimed ? 0.6 : 1,
                        transform: isTargeted ? 'scale(1.02)' : isPrimed ? 'scale(0.95)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                        boxShadow: isTargeted ? '0 0 10px rgba(137, 180, 250, 0.3)' : 'none',
                        touchAction: 'none',
                        fontWeight: line.isContainer ? 'bold' : 'normal',
                        color: line.isContainer ? '#89b4fa' : (depth > 0 ? 'rgba(255,255,255,0.8)' : 'inherit'),
                        fontSize: depth > 0 ? '0.8rem' : '0.85rem'
                    }}
                    dangerouslySetInnerHTML={{ __html: line.html }}
                />
            );
        }
        return (
            <div
                key={line.id}
                style={{
                    padding: '4px 0',
                    opacity: line.isHeader ? 0.7 : 1,
                    whiteSpace: 'pre-wrap',
                    marginLeft: `${depth * 20}px`,
                    fontSize: line.isHeader ? '0.75rem' : '0.85rem',
                    color: line.isHeader ? 'var(--accent)' : 'inherit',
                    letterSpacing: line.isHeader ? '1px' : 'normal'
                }}
                dangerouslySetInnerHTML={{ __html: line.html }}
            />
        );
    };

    return (
        <>
            {draggedItem && dragPos && (
                <div style={{
                    position: 'fixed',
                    left: dragPos.x,
                    top: dragPos.y,
                    pointerEvents: 'none',
                    zIndex: 99999,
                    transform: 'translate(-50%, -50%) scale(1.05)',
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
                    boxSizing: 'border-box'
                }} dangerouslySetInnerHTML={{ __html: draggedItem.line.html }} />
            )}
            <div
                ref={drawerRef}
                className={`right-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''} ${isNativeDragOver ? 'native-drag-over' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (!isNativeDragOver) setIsNativeDragOver(true);
                }}
                onDragLeave={() => setIsNativeDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsNativeDragOver(false);
                    try {
                        const dataStr = e.dataTransfer.getData('application/json');
                        if (!dataStr) return;
                        const data = JSON.parse(dataStr);
                        if (data.type === 'inline-btn' && (data.context || data.cmd === 'target')) {
                            triggerHaptic(40);
                            const noun = (data.cmd === 'target') ? 'target' : data.context;
                            executeCommand(`get ${noun}`);
                            // Flash the inventory section
                            const invSection = drawerRef.current?.querySelector('[data-drawer-section="inventory"]');
                            if (invSection) {
                                invSection.classList.add('drop-flash');
                                setTimeout(() => invSection.classList.remove('drop-flash'), 500);
                                }
                        }
                    } catch (err) {
                        console.error('Failed to parse drop data', err);
                    }
                }}
                onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    (e.currentTarget as any)._startX = e.clientX;
                    (e.currentTarget as any)._startY = e.clientY;
                }}
                onPointerUp={(e) => {
                    const startX = (e.currentTarget as any)._startX;
                    const startY = (e.currentTarget as any)._startY;
                    if (startX !== undefined && startX !== null && !isDraggingRef.current) {
                        const deltaX = e.clientX - startX;
                        const deltaY = Math.abs(e.clientY - (startY || 0));
                        if (deltaX > 20 && deltaX > deltaY) {
                            triggerHaptic(40);
                            onClose();
                        }
                    }
                    (e.currentTarget as any)._startX = null;
                    (e.currentTarget as any)._startY = null;
                }}
                onPointerCancel={(e) => {
                    (e.currentTarget as any)._startX = null;
                    (e.currentTarget as any)._startY = null;
                }}
                style={{ touchAction: isDraggingRef.current ? 'none' : 'pan-y' }}
            >
                {isPeeking && <div className="peek-indicator">DROP TO TARGET</div>}
                <div className="drawer-header">
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>ITEMS</span>
                    <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
                </div>

                <div className="drawer-content" style={{ display: 'flex', flexDirection: isLandscape ? 'row' : 'column', gap: isLandscape ? '15px' : '15px', flex: 1, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '10px', zIndex: 100 }}>
                        <div style={{ width: '6px', height: '80px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                    </div>

                    <div
                        data-drawer-section="equipment"
                        className={`drawer-section ${activeDropTarget?.type === 'section' && activeDropTarget.id === 'equipment' ? 'drop-target-active' : ''}`}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            transition: 'all 0.2s ease',
                            padding: '4px',
                            borderRadius: '16px',
                            background: activeDropTarget?.type === 'section' && activeDropTarget.id === 'equipment' ? 'rgba(255,255,100,0.05)' : 'transparent',
                            border: activeDropTarget?.type === 'section' && activeDropTarget.id === 'equipment' ? '2px dashed rgba(255,255,100,0.4)' : '2px solid transparent'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', color: activeDropTarget?.type === 'section' && activeDropTarget.id === 'equipment' ? '#ff0' : 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px', flexShrink: 0, paddingBottom: '6px', transition: 'color 0.2s' }}>EQUIPMENT</div>
                        <div className="drawer-section-content" data-drawer-section="equipment" style={{ flex: 1, overflow: 'auto', fontSize: '0.85rem', lineHeight: '1.5', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', WebkitOverflowScrolling: 'touch' }}>
                            {eqLines.map(line => renderLine(line, 'equipmentlist'))}
                        </div>
                    </div>
                    {isLandscape && <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '100%' }} />}
                    <div
                        data-drawer-section="inventory"
                        className={`drawer-section ${activeDropTarget?.type === 'section' && activeDropTarget.id === 'inventory' ? 'drop-target-active' : ''}`}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            transition: 'all 0.2s ease',
                            padding: '4px',
                            borderRadius: '16px',
                            background: activeDropTarget?.type === 'section' && activeDropTarget.id === 'inventory' ? 'rgba(255,255,100,0.05)' : 'transparent',
                            border: activeDropTarget?.type === 'section' && activeDropTarget.id === 'inventory' ? '2px dashed rgba(255,255,100,0.4)' : '2px solid transparent'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', color: activeDropTarget?.type === 'section' && activeDropTarget.id === 'inventory' ? '#ff0' : 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px', flexShrink: 0, paddingBottom: '6px', transition: 'color 0.2s' }}>INVENTORY</div>
                        <div className="drawer-section-content" data-drawer-section="inventory" style={{ flex: 1, overflow: 'auto', fontSize: '0.85rem', lineHeight: '1.5', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', WebkitOverflowScrolling: 'touch' }}>
                            {inventoryLines.map(line => renderLine(line, 'inventorylist'))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
