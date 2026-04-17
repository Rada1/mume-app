/**
 * @file InventoryDrawer.tsx
 * @description Renders the player's inventory and equipment in a unified tabbed drawer.
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName, COLOR_OBJ } from '../../utils/categorizationUtils';

import { isObjectSelected } from '../../utils/selectionUtils';
import { sanitizeMumeHtml } from '../../utils/securityUtils';

interface InventoryDrawerProps {
    isOpen: boolean;
    isPeeking?: boolean;
    initialTab?: 'inventory' | 'equipment';
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    eqLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef: React.RefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
    entities?: Record<string, import('../../types').GameEntity>;
    keywordOverrides?: Record<string, string>;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    isPeeking,
    initialTab = 'equipment',
    onClose,
    triggerHaptic,
    inventoryLines,
    eqLines,
    executeCommand,
}) => {
    const { 
        handleLogPointerDown, 
        handleLogPointerUp, 
        handleLogClick, 
        selectedObjectIds,
        clearObjectSelection 
    } = useGame();
    const { ui } = useUI();
    
    const [activeTab, setActiveTab] = useState<'inventory' | 'equipment'>(initialTab);

    // Sync active tab with global UI state when it changes
    useEffect(() => {
        if (!isOpen) return;
        if (ui.drawer === 'inventory') setActiveTab('inventory');
        else if (ui.drawer === 'equipment') setActiveTab('equipment');
    }, [isOpen, ui.drawer]);
    const drawerRef = React.useRef<HTMLDivElement>(null);
    const eqContainerRef = useRef<HTMLDivElement>(null);
    const [eqFontSize, setEqFontSize] = useState<string>('inherit');

    // Silent refresh on open: old lines stay visible until new capture swaps in
    useEffect(() => {
        if (!isOpen) return;
        executeCommand('inv', true, true, true, true);
        const t = setTimeout(() => executeCommand('eq', true, true, true, true), 100);
        return () => clearTimeout(t);
    }, [isOpen, executeCommand]);

    useLayoutEffect(() => {
        if (!eqContainerRef.current) return;
        const measure = () => {
            const width = eqContainerRef.current?.clientWidth;
            if (width) setEqFontSize(`${(width - 16) / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(eqContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (!dataStr) return;

        let data;
        try { data = JSON.parse(dataStr); } catch (err) { return; }

        if (data && data.type === 'inline-btn' && data.context) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const targetBtn = target?.closest('.inline-btn.auto-item');
            const isTargetContainer = targetBtn?.classList.contains('is-container');
            const targetName = targetBtn?.getAttribute('data-context');

            triggerHaptic(60);
            if (isTargetContainer && targetName) {
                executeCommand(`get ${data.context}`, true, true);
                setTimeout(() => executeCommand(`put ${data.context} ${targetName}`), 125);
            } else {
                executeCommand(`get ${data.context}`);
            }
        }
    };

    const onPointerDownInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('.inline-btn') || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerDown(e);
            return;
        }
        container.dataset.swipeX = e.clientX.toString();
        container.dataset.swipeY = e.clientY.toString();
        container.setPointerCapture(e.pointerId);
    };

    const onPointerUpInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('.inline-btn') || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerUp(e);
            return;
        }
        const sx = parseFloat(container.dataset.swipeX || "0");
        const sy = parseFloat(container.dataset.swipeY || "0");
        if (sx && sy) {
            const deltaX = e.clientX - sx;
            const deltaY = e.clientY - sy;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            if ((deltaY > 50 && absY > absX) || (deltaX > 50 && absX > absY)) {
                if (drawerRef.current && window.innerWidth > 1024) onClose();
            }
        }
        delete container.dataset.swipeX;
        delete container.dataset.swipeY;
    };

    const onClickInternal = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.inline-btn') as HTMLElement;
        if (btn) {
            handleLogClick(e);
        } else if (!target.closest('.drawer-tab')) {
            if (selectedObjectIds.size > 0) clearObjectSelection();
        }
    };

    const DrawerLineItem = React.memo(({ 
        line, 
        mode, 
        selectedObjectIds, 
        eqFontSize 
    }: { 
        line: DrawerLine, 
        mode: 'inventory' | 'equipment', 
        selectedObjectIds: Set<string>,
        eqFontSize: string
    }) => {
        const depth = line.depth || 0;
        const prefixId = mode === 'inventory' ? 'inventorylist' : 'equipmentlist';
        const cmdId = mode === 'inventory' ? 'inline-obj-char' : 'inline-obj-worn';
        const fullId = `${prefixId}:${line.entityId || line.id}:${line.context || line.id}`;
        const isSelected = isObjectSelected(selectedObjectIds, fullId, cmdId);

        const rowBg = line.isHeader ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.6)'; // Solid dark cutout look
        const accentColor = 'rgba(180, 180, 180, 0.7)'; // Brighter silver accent

        const rowStyle: React.CSSProperties = {
            background: rowBg,
            borderRadius: '4px',
            margin: '0.5px 0',
            padding: '1px 10px',
            paddingLeft: `${depth * 8 + 10}px`,
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            minHeight: '16px',
            lineHeight: '1.5',
            color: line.isHeader ? '#ffffff' : 'inherit'
        };

        if (mode === 'equipment') {
            const cat = getCategoryForName(line.text);
            const isActuallyContainer = line.isContainer || cat === 'inline-containers';
            const dim = 'var(--text-primary)';
            const brown = COLOR_OBJ;


            if (line.isItem) {
                const itemText = line.text;
                const articleMatch = itemText.match(/^(a |an |the |some )/i);
                const article = articleMatch ? articleMatch[1] : '';
                const afterArticle = itemText.slice(article.length);
                const condMatch = afterArticle.match(/\s+(\(.*\))$/i);
                const condition = condMatch ? condMatch[1] : '';
                const itemName = condMatch ? afterArticle.slice(0, afterArticle.length - condMatch[0].length) : afterArticle;

                return (
                    <div style={rowStyle}>
                        <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit', margin: '0', padding: '0', fontSize: eqFontSize }}>
                            {line.prefix && <span style={{ color: dim }}>{line.prefix}</span>}
                            <span style={{ color: dim }}>{article}</span>
                            <span
                                className={`inline-btn auto-item ${isSelected ? 'selected-item' : ''} ${isActuallyContainer ? 'is-container' : ''}`}
                                data-id={fullId}
                                data-line-id={line.id}
                                data-context={line.context || line.id}
                                data-action="menu"
                                data-category={cat || undefined}
                                data-cmd={cmdId}
                                style={{
                                    display: 'inline',
                                    lineHeight: 'inherit',
                                    padding: '0 4px',
                                    margin: '0',
                                    background: isSelected ? `rgba(180,100,50,0.15)` : 'transparent',
                                    border: 'none',
                                    borderRadius: '0',
                                    boxShadow: 'none',
                                    cursor: 'default',
                                    color: brown,
                                    whiteSpace: 'pre',
                                }}
                            >{itemName}</span>
                            {condition && <span style={{ color: dim }}> {condition}</span>}
                        </div>
                    </div>
                );
            }
            // Render non-item lines (like headers or empty slots) with the same row highlight
            return (
                <div style={rowStyle}>
                    <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit', padding: '0', color: '#ffffff', fontSize: eqFontSize }}>
                        {line.prefix && <span style={{ color: dim }}>{line.prefix}</span>}
                        {line.text === 'nothing' && <span style={{ color: 'transparent' }}>a </span>}
                        <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || '') }} />
                    </div>
                </div>
            );
        }

        const cat = getCategoryForName(line.text);
        const isActuallyContainer = line.isContainer || cat === 'inline-containers';
        const brown = 'rgba(180, 100, 50, 0.9)';
        const dim = 'var(--text-primary)';
        if (line.isItem) {
            const articleMatch = line.text.match(/^(a |an |the |some )/i);
            const article = articleMatch ? articleMatch[1] : '';
            const afterArticle = line.text.slice(article.length);
            const condMatch = afterArticle.match(/\s+(\(.*\))$/i);
            const condition = condMatch ? condMatch[1] : '';
            const itemName = condMatch ? afterArticle.slice(0, afterArticle.length - condMatch[0].length) : afterArticle;

            return (
                <div style={rowStyle}>
                    <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit', margin: '0', padding: '0', fontSize: eqFontSize }}>
                        <span style={{ color: dim }}>{article}</span>
                        <span
                            className={`inline-btn auto-item ${isSelected ? 'selected-item' : ''} ${isActuallyContainer ? 'is-container' : ''}`}
                            data-id={fullId}
                            data-line-id={line.id}
                            data-context={line.context || line.id}
                            data-action="menu"
                            data-category={cat || undefined}
                            data-cmd={cmdId}
                            style={{
                                display: 'inline',
                                lineHeight: 'inherit',
                                padding: '0 4px',
                                margin: '0',
                                background: isSelected ? `rgba(180,100,50,0.15)` : 'transparent',
                                border: 'none',
                                borderRadius: '0',
                                boxShadow: 'none',
                                cursor: 'default',
                                color: brown,
                                whiteSpace: 'pre',
                            }}
                        >{itemName}</span>
                        {condition && <span style={{ color: dim }}> {condition}</span>}
                    </div>
                </div>
            );
        }

        return (
            <div style={rowStyle}>
                <div style={{ paddingLeft: `${depth * 8}px`, lineHeight: 'inherit', whiteSpace: 'pre-wrap', fontSize: eqFontSize }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
            </div>
        );
    });

    const EQ_SLOTS = [
        '<wielded>',
        '<worn as shield>',
        '<worn on head>',
        '<worn on body>',
        '<worn about body>',
        '<worn on arms>',
        '<worn on hands>',
        '<worn on legs>',
        '<worn on feet>',
        '<worn around neck>',
        '<worn on wrist>',
        '<worn on wrist>',
        '<worn on finger>',
        '<worn on finger>',
        '<worn on back>',
        '<worn across back>',
        '<worn as belt>',
        '<worn on belt>',
        '<worn on belt>',
        '<worn on belt>',
        '<worn on belt>',
        '<worn on belt>'
    ];

    const currentLines = useMemo(() => {
        if (activeTab === 'inventory') {
            const lines: DrawerLine[] = [];
            inventoryLines.forEach((line, idx) => {
                const isCarryingHeader = line.text.toLowerCase().includes('you are carrying');
                lines.push({ ...line, isHeader: isCarryingHeader });
                if (isCarryingHeader) {
                    lines.push({
                        id: `inv-sep-${idx}`,
                        text: '-------',
                        html: '-------',
                        isHeader: true,
                        isItem: false,
                        depth: 0,
                        cmd: 'inventorylist'
                    } as DrawerLine);
                }
            });
            return lines;
        }

        const remainingEq = [...(eqLines || [])];
        
        // Extract headers (like "You are using:")
        const headers = remainingEq.filter(l => l.isHeader);
        const nonHeaderLines = remainingEq.filter(l => !l.isHeader);

        const mappedSlots = EQ_SLOTS.map((slot, idx) => {
            const slotName = slot.replace(/[<>]/g, '').toLowerCase().trim();
            const matchIdx = nonHeaderLines.findIndex(l => {
                const lp = (l.prefix || '').toLowerCase();
                const cleanLp = lp.replace(/[<>]/g, '').trim();
                return cleanLp === slotName;
            });

            if (matchIdx !== -1) {
                return nonHeaderLines.splice(matchIdx, 1)[0];
            }

            return {
                id: `empty-${slot}-${idx}`,
                prefix: slot.padEnd(20, ' '),
                text: 'nothing',
                html: 'nothing',
                isItem: false,
                isHeader: false,
                isContainer: false,
                depth: 0,
                cmd: 'equipmentlist'
            } as DrawerLine;
        });

        // Add separator after "You are using:" headers
        const headerWithSeparator = headers.flatMap((h, idx) => [
            h,
            {
                id: `eq-sep-${idx}`,
                text: '-------',
                html: '-------',
                isHeader: true,
                depth: 0,
                cmd: 'equipmentlist'
            } as DrawerLine
        ]);

        return [...headerWithSeparator, ...mappedSlots];
    }, [activeTab, inventoryLines, eqLines]);

    return (
        <div
            ref={drawerRef}
            className={`inventory-drawer log-card-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPointerDown={onPointerDownInternal}
            onPointerUp={onPointerUpInternal}
            onPointerCancel={onPointerUpInternal}
            onClick={onClickInternal}
        >
            <div className="drawer-body" style={{ flex: 1, overflowY: 'auto', padding: 0, position: 'relative' }}>
                <div className="drawer-section" style={{ marginRight: '0' }} data-drawer-section={activeTab === 'inventory' ? "inventorylist" : "equipmentlist"}>
                    <div className="drawer-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        padding: '6px 10px',
                        background: 'transparent',
                        marginBottom: '4px',
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        {window.innerWidth > 1024 && (
                            <button 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => { triggerHaptic(20); onClose(); }} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.08)', 
                                    border: 'none', 
                                    color: '#fff', 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '14px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '14px', 
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >✕</button>
                        )}
                    </div>

                    {currentLines?.length === 0 ? (
                        <div className="drawer-empty-state" style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0', fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>
                            {activeTab === 'inventory' ? 'Inventory is currently empty' : 'No equipment worn'}
                        </div>
                    ) : activeTab === 'equipment' ? (
                        /* Equipment: raw log-style text, font sized so 80 chars fits the drawer */
                        <div ref={eqContainerRef} style={{
                            fontFamily: 'var(--font-main, monospace)',
                            fontSize: eqFontSize,
                            visibility: eqFontSize === 'inherit' ? 'hidden' : 'visible',
                            lineHeight: '1.5',
                            whiteSpace: 'pre',
                            overflowX: 'hidden',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0',
                            padding: '0 8px',
                            boxShadow: 'none',
                            margin: '0'
                        }}>
                            {currentLines?.map(line => (
                                <DrawerLineItem 
                                    key={line.id} 
                                    line={line} 
                                    mode={activeTab} 
                                    selectedObjectIds={selectedObjectIds} 
                                    eqFontSize={eqFontSize} 
                                />
                            ))}
                            {/* Empty spacing at the bottom for better scroll visibility */}
                            <div style={{ height: '50px', width: '100%' }} aria-hidden="true" />
                        </div>
                    ) : (
                        <div ref={eqContainerRef} style={{
                            fontFamily: 'var(--font-main, monospace)',
                            fontSize: eqFontSize,
                            visibility: eqFontSize === 'inherit' ? 'hidden' : 'visible',
                            lineHeight: '1.5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0',
                            padding: '0 8px',
                            boxShadow: 'none',
                            margin: '0'
                        }}>
                            {currentLines?.map(line => (
                                <DrawerLineItem 
                                    key={line.id} 
                                    line={line} 
                                    mode={activeTab} 
                                    selectedObjectIds={selectedObjectIds} 
                                    eqFontSize={eqFontSize} 
                                />
                            ))}
                            {/* Empty spacing at the bottom for better scroll visibility */}
                            <div style={{ height: '50px', width: '100%' }} aria-hidden="true" />
                        </div>
                    )}
                </div>
            </div>

            {/* Individual Floating Frosted Tabs */}
            <div className="utility-nav-tabs" style={{
                position: 'absolute',
                bottom: '12px',
                left: '0',
                right: '0',
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
                zIndex: 100,
                pointerEvents: 'none',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: '0 10px'
            }}>
                <div 
                    className={`drawer-tab ${activeTab === 'equipment' ? 'active' : ''}`}
                    onClick={() => { triggerHaptic(15); setActiveTab('equipment'); }}
                    style={{
                        padding: '6px 14px',
                        minWidth: '50px',
                        height: '24px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: activeTab === 'equipment' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                        backdropFilter: activeTab === 'equipment' ? 'none' : 'blur(10px) saturate(160%)',
                        WebkitBackdropFilter: activeTab === 'equipment' ? 'none' : 'blur(10px) saturate(160%)',
                        color: activeTab === 'equipment' ? '#000' : 'rgba(255,255,255,0.4)',
                        border: activeTab === 'equipment' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: activeTab === 'equipment' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                        fontSize: '9px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                    }}
                >
                    Worn
                </div>
                <div 
                    className={`drawer-tab ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => { triggerHaptic(15); setActiveTab('inventory'); }}
                    style={{
                        padding: '6px 14px',
                        minWidth: '65px',
                        height: '24px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: activeTab === 'inventory' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                        backdropFilter: activeTab === 'inventory' ? 'none' : 'blur(10px) saturate(160%)',
                        WebkitBackdropFilter: activeTab === 'inventory' ? 'none' : 'blur(10px) saturate(160%)',
                        color: activeTab === 'inventory' ? '#000' : 'rgba(255,255,255,0.4)',
                        border: activeTab === 'inventory' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: activeTab === 'inventory' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                        fontSize: '9px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                    }}
                >
                    Inventory
                </div>
            </div>
        </div>
    );
};
