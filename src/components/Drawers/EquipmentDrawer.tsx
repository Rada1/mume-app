import React, { useState, useRef, useEffect } from 'react';
import { DrawerLine } from '../../types';
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
    const { activeDragData } = useGame();
    const [draggedItem, setDraggedItem] = useState<{ line: DrawerLine; source: 'inventory' | 'equipment'; x: number; y: number } | null>(null);
    const [primedItemId, setPrimedItemId] = useState<string | null>(null);
    const [activeDropTarget, setActiveDropTarget] = useState<{ type: 'section' | 'container' | 'log'; id: string } | null>(null);
    const [isNativeDragOver, setIsNativeDragOver] = useState(false);
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());

    const ghostRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<any>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const pendingDragRef = useRef<{ line: DrawerLine; source: 'inventory' | 'equipment' } | null>(null);
    const draggedRef = useRef<{ line: DrawerLine; source: 'inventory' | 'equipment' } | null>(null);
    const isDraggingRef = useRef(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    const handleSectionScroll = () => {
        if (!isDraggingRef.current && (longPressTimerRef.current || pendingDragRef.current || primedItemId)) {
            cleanupDrag();
        }
    };

    const cleanupDrag = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
        setDraggedItem(null);
        setPrimedItemId(null);
        setActiveDropTarget(null);
        startPosRef.current = null;
        pendingDragRef.current = null;
        draggedRef.current = null;
        isDraggingRef.current = false;
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', cleanupDrag);
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

        cleanupDrag();
        // Capture the pointer to ensure move events are received even if the finger moves fast
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
        }, 350); // Increased to 350ms for better intentionality
    };

    const moveCountRef = useRef(0);
    const handleGlobalPointerMove = (e: PointerEvent) => {
        if (startPosRef.current && !isDraggingRef.current) {
            const dx = Math.abs(e.clientX - startPosRef.current.x);
            const dy = Math.abs(e.clientY - startPosRef.current.y);
            const dist = Math.sqrt(dx * dx + dy * dy);

            // If we are in the "priming" phase (waiting for long press)
            // Any significant movement should cancel the drag so the user can scroll
            const threshold = e.pointerType === 'mouse' ? 15 : 5;
            if (dist > threshold) {
                cleanupDrag();
                return;
            }
        }

        if (isDraggingRef.current) {
            // High-performance direct DOM update for the "ghost" item
            if (ghostRef.current) {
                ghostRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(1.05)`;
            }

            // Auto-close drawer if dragging out of it
            if (isOpen && drawerRef.current) {
                const rect = drawerRef.current.getBoundingClientRect();
                // Close if pointer is to the left of the drawer, with a larger 40px gutter for fast movement
                if (e.clientX < rect.left - 50 || (rect.left < 50 && e.clientX < 80)) {
                    onClose();
                }
            }

            // Performance: only check drop target every other move event
            moveCountRef.current++;
            if (moveCountRef.current % 2 !== 0) return;

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
                const fullItemNoun = currentItem.context || currentItem.id;
                const itemNoun = fullItemNoun.split('.')[0];
                if (currentSource === 'equipment') {
                    executeCommand(`remove ${itemNoun}`, false, false);
                }
                if (currentItem.parentItemNoun) {
                    executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                    setTimeout(() => executeCommand(`look in ${currentItem.parentItemNoun}`, true, true), 1000);
                }
                executeCommand(`drop ${itemNoun}`, false, false);
                // Refresh lists
                setTimeout(() => {
                    executeCommand('inv', false, true, true, true);
                    executeCommand('eq', false, true, true, true);
                }, 1000);
                cleanupDrag();
                return;
            }

            // 3. Section Target (Wear/Remove/Get)
            const sectionWrapper = target?.closest('[data-drawer-section]');
            const section = sectionWrapper?.getAttribute('data-drawer-section');
            if (section) {
                const fullItemNoun = currentItem.context || currentItem.id;
                const itemNoun = fullItemNoun.split('.')[0];

                if (section !== currentSource) {
                    triggerHaptic(60);
                    if (currentItem.parentItemNoun) {
                        executeCommand(`get ${itemNoun} ${currentItem.parentItemNoun}`, true, true);
                        setTimeout(() => executeCommand(`look in ${currentItem.parentItemNoun!}`, true, true), 1000);
                    }
                    const cmd = (section === 'equipment' || section === 'equipmentlist') ? 'wear' : 'remove';
                    executeCommand(`${cmd} ${itemNoun}`, false, false);
                    // Refresh lists
                    setTimeout(() => {
                        executeCommand('inv', false, true, true, true);
                        executeCommand('eq', false, true, true, true);
                    }, 1000);
                } else {
                    // Same-section move might be an explicit get [noun] [container] from a nested item
                    const dotIndex = fullItemNoun.indexOf('.');
                    if (dotIndex !== -1) {
                         triggerHaptic(60);
                         const noun = fullItemNoun.substring(0, dotIndex);
                         const container = fullItemNoun.substring(dotIndex + 1);
                         executeCommand(`get ${noun} ${container}`, false, false);
                    }
                }
            }
        }
        setTimeout(() => cleanupDrag(), 0);
    };

    const renderLine = (line: DrawerLine, listType: 'inventorylist' | 'equipmentlist') => {
        const source = listType === 'inventorylist' ? 'inventory' : 'equipment';
        const isBeingDragged = draggedItem?.line.id === line.id;
        const isTargeted = activeDropTarget?.type === 'container' && activeDropTarget.id === (line.context || line.id);
        const depth = line.depth || 0;

        if (line.isItem) {
            const isPrimed = primedItemId === line.id;
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
                        className={`inline-btn auto-item ${isPrimed ? 'primed' : ''} ${isTargeted ? 'drop-target' : ''} ${line.isContainer ? 'is-container' : ''}`}
                        data-item-name={line.context || line.id}
                        onPointerDown={(e) => handlePointerDown(e, line, source)}
                        onPointerUp={(e) => {
                            if (isDraggingRef.current) {
                                return;
                            }
                            cleanupDrag();
                            if (!line.id) {
                                console.log('[Drawer] Tap on line with no ID:', line);
                                return;
                            }
                            if (!line.isItem) return;

                            console.log('[Drawer] Tap on item:', {
                                id: line.id,
                                context: line.context,
                                isContainer: line.isContainer,
                                depth: line.depth
                            });
                            triggerHaptic(20);

                            if (line.isContainer) {
                                const newExpanded = new Set(expandedContainers);
                                if (newExpanded.has(line.id)) {
                                    console.log('[Drawer] Collapsing container:', line.id);
                                    newExpanded.delete(line.id);
                                } else {
                                    console.log('[Drawer] Expanding container:', line.id);
                                    newExpanded.add(line.id);
                                    const drawerCmd = source === 'equipment' ? 'equipmentlist' : 'inventorylist';
                                    pendingDrawerContainerRef.current = {
                                        containerId: line.id,
                                        cmd: drawerCmd,
                                        afterId: line.id
                                    };
                                    const cmd = `look in ${line.context || line.id}`;
                                    console.log('[Drawer] Sending command:', cmd);
                                    executeCommand(cmd, true, true);
                                    
                                    const thisId = line.id;
                                    setTimeout(() => { 
                                        if (pendingDrawerContainerRef.current?.containerId === thisId) {
                                            console.log('[Drawer] Clearing stale pending ref for:', thisId);
                                            pendingDrawerContainerRef.current = null; 
                                        }
                                    }, 5000);
                                }
                                setExpandedContainers(newExpanded);
                                return;
                            }

                            console.log('[Drawer] Item is NOT a container, opening menu.');
                            (handleButtonClick as any)({
                                id: `drawer-${line.id}`,
                                command: listType,
                                label: line.context || 'Item',
                                actionType: 'menu'
                            }, e as any, line.context, line.isContainer, line.parentItemNoun);
                        }}
                        style={{
                            flex: 1,
                            backgroundColor: isBeingDragged ? 'rgba(100, 255, 100, 0.02)' :
                                isTargeted ? 'rgba(255, 255, 100, 0.2)' :
                                    isPrimed ? 'rgba(100, 255, 100, 0.04)' :
                                        line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            borderLeft: depth > 0 && !line.prefixHtml ? `${depth * 3}px solid #89b4fa` : 'none',
                            padding: '8px 12px',
                            borderRadius: depth > 0 ? '0 4px 4px 0' : '4px',
                            cursor: 'grab',
                            opacity: isBeingDragged ? 0.3 : isPrimed ? 0.6 : 1,
                            transform: isTargeted ? 'scale(1.02)' : isPrimed ? 'scale(0.95)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            boxShadow: isTargeted ? '0 0 10px rgba(137, 180, 250, 0.3)' : 'none',
                            touchAction: draggedItem ? 'none' : 'pan-y',
                            fontWeight: line.isContainer ? 'bold' : 'normal',
                            color: line.isContainer ? '#89b4fa' : (depth > 0 ? 'rgba(255,255,255,0.8)' : 'inherit'),
                            fontSize: depth > 0 ? '0.8rem' : '0.85rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                        dangerouslySetInnerHTML={{ __html: line.html }}
                    />
                </div>
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
                        boxSizing: 'border-box',
                        transition: 'none',
                        willChange: 'transform'
                    }} dangerouslySetInnerHTML={{ __html: draggedItem.line.html }} />
            )}
            <div
                ref={drawerRef}
                className={`right-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''} ${isNativeDragOver ? 'native-drag-over' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (!isNativeDragOver) setIsNativeDragOver(true);
                }}
                onDragLeave={() => setIsNativeDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[DEBUG] Drop Event on Drawer');
                    setIsNativeDragOver(false);
                    try {
                        const jsonData = e.dataTransfer.getData('application/json');
                        const textData = e.dataTransfer.getData('text/plain');
                        console.log('[DEBUG] Drop Data (native):', { jsonData, textData });
                        console.log('[DEBUG] Drop Data (global):', activeDragData);

                        const dataStr = jsonData || textData;
                        let data = activeDragData;

                        if (!data && dataStr) {
                            try {
                                data = JSON.parse(dataStr);
                            } catch (pErr) {
                                console.error('[DEBUG] Failed to parse native data string');
                            }
                        }

                        if (!data) {
                            console.warn('[DEBUG] No data retrieved in drop');
                            return;
                        }

                        console.log('[DEBUG] Final Data for Processing:', data);

                        if (data && data.type === 'inline-btn' && (data.context || data.cmd === 'target')) {
                            triggerHaptic(40);
                            const noun = (data.cmd === 'target') ? '<target>' : data.context;
                            console.log('[DEBUG] Executing Command:', `get ${noun}`);
                            executeCommand(`get ${noun}`);

                            // Flash the inventory section
                            const invSection = drawerRef.current?.querySelector('[data-drawer-section="inventory"]');
                            if (invSection) {
                                invSection.classList.add('drop-flash');
                                setTimeout(() => invSection.classList.remove('drop-flash'), 500);
                            }
                        }
                    } catch (err) {
                        console.error('[DEBUG] Drop Error:', err);
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
                style={{ touchAction: draggedItem ? 'none' : 'pan-y' }}
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
                        <div className="drawer-section-content" data-drawer-section="equipment" onScroll={handleSectionScroll} style={{ flex: 1, overflow: draggedItem ? 'hidden' : 'auto', fontSize: '0.85rem', lineHeight: '1.5', background: 'transparent', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', WebkitOverflowScrolling: 'touch', touchAction: draggedItem ? 'none' : 'pan-y' }}>
                            {(() => {
                                const visibleLines: DrawerLine[] = [];
                                const collapsedDepths: Set<number> = new Set();
                                for (const line of eqLines) {
                                    const depth = line.depth || 0;
                                    Array.from(collapsedDepths).forEach(d => { if (d >= depth) collapsedDepths.delete(d); });
                                    if (collapsedDepths.size > 0) continue;
                                    visibleLines.push(line);
                                    if (line.isContainer && !expandedContainers.has(line.id)) collapsedDepths.add(depth);
                                }
                                return visibleLines.map(line => renderLine(line, 'equipmentlist'));
                            })()}
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
                        <div className="drawer-section-content" data-drawer-section="inventory" onScroll={handleSectionScroll} style={{ flex: 1, overflow: draggedItem ? 'hidden' : 'auto', fontSize: '0.85rem', lineHeight: '1.5', background: 'transparent', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', WebkitOverflowScrolling: 'touch', touchAction: draggedItem ? 'none' : 'pan-y' }}>
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
                                return visibleLines.map(line => renderLine(line, 'inventorylist'));
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
