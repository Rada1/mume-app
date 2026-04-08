/**
 * @file InventoryDrawer.tsx
 * @description Renders the player's inventory and equipment in a unified tabbed drawer.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName } from '../../utils/categorizationUtils';
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
    
    const [activeTab, setActiveTab] = useState<'inventory' | 'equipment'>(initialTab);
    const drawerRef = React.useRef<HTMLDivElement>(null);
    const eqContainerRef = useRef<HTMLDivElement>(null);
    const [eqFontSize, setEqFontSize] = useState<string>('inherit');

    useEffect(() => {
        if (!eqContainerRef.current) return;
        const measure = () => {
            const width = eqContainerRef.current?.clientWidth;
            // Space Mono char width ≈ 0.601 × font-size, so to fit 80 chars: size = width / (80 × 0.601)
            if (width) setEqFontSize(`${width / 48}px`);
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
                onClose();
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

        if (mode === 'equipment') {
            const cat = getCategoryForName(line.text);
            const isActuallyContainer = line.isContainer || cat === 'inline-containers';
            const dim = 'rgba(255,255,255,0.4)';
            const brown = 'rgba(180, 100, 50, 0.9)';

            if (line.isItem) {
                const itemText = line.text;
                const articleMatch = itemText.match(/^(a |an |the |some )/i);
                const article = articleMatch ? articleMatch[1] : '';
                const afterArticle = itemText.slice(article.length);
                const condMatch = afterArticle.match(/\s+(\((flawless|well-maintained|worn|scratched|damaged|beaten|battered|beaten and battered|shabby|sub-standard|poor|fragmented|broken|shattered)\))$/i);
                const condition = condMatch ? condMatch[1] : '';
                const itemName = condMatch ? afterArticle.slice(0, afterArticle.length - condMatch[0].length) : afterArticle;

                return (
                    <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: '1.2', margin: '0', padding: '0', fontSize: eqFontSize }}>
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
                                lineHeight: '1.2',
                                padding: '0',
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
                );
            }
            // Fix: Render prefix even for empty slots (non-item lines)
            return (
                <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: '1.2', padding: '0', color: 'rgba(255,255,255,0.6)', fontSize: eqFontSize }}>
                    {line.prefix && <span style={{ color: dim }}>{line.prefix}</span>}
                    <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || '') }} />
                </div>
            );
        }

        const cat = getCategoryForName(line.text);
        const isActuallyContainer = line.isContainer || cat === 'inline-containers';
        const brown = 'rgba(180, 100, 50, 0.9)';
        const dim = 'rgba(255,255,255,0.4)';
        if (line.isItem) {
            const articleMatch = line.text.match(/^(a |an |the |some )/i);
            const article = articleMatch ? articleMatch[1] : '';
            const afterArticle = line.text.slice(article.length);
            const condMatch = afterArticle.match(/\s+(\((flawless|well-maintained|worn|scratched|damaged|beaten|battered|beaten and battered|shabby|sub-standard|poor|fragmented|broken|shattered)\))$/i);
            const condition = condMatch ? condMatch[1] : '';
            const itemName = condMatch ? afterArticle.slice(0, afterArticle.length - condMatch[0].length) : afterArticle;

            return (
                <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: '1.2', margin: '0', padding: '0', paddingLeft: `${depth * 8}px` }}>
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
                            lineHeight: '1.2',
                            padding: '0',
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
            );
        }

        return (
            <div style={{ paddingLeft: `${depth * 8}px`, lineHeight: '1.2', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
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
        if (activeTab === 'inventory') return inventoryLines;

        const remainingEq = [...(eqLines || [])];
        return EQ_SLOTS.map((slot, idx) => {
            const slotName = slot.replace(/[<>]/g, '').toLowerCase().trim();
            const matchIdx = remainingEq.findIndex(l => {
                const lp = (l.prefix || '').toLowerCase();
                const cleanLp = lp.replace(/[<>]/g, '').trim();
                // Match exactly or ensure it's not a partial "theft" (e.g. "back" vs "across back")
                return cleanLp === slotName;
            });

            if (matchIdx !== -1) {
                return remainingEq.splice(matchIdx, 1)[0];
            }

            return {
                id: `empty-${slot}-${idx}`,
                prefix: `${slot}  `,
                text: '',
                html: '',
                isItem: false,
                isHeader: false,
                isContainer: false,
                depth: 0,
                cmd: 'equipmentlist'
            } as DrawerLine;
        });
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
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', padding: activeTab === 'equipment' ? '12px 8px' : '12px 15px' }}>
                <div className="drawer-section" data-drawer-section={activeTab === 'inventory' ? "inventorylist" : "equipmentlist"}>
                    <div className="drawer-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px 6px 10px',
                        background: 'rgba(10, 13, 21, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        margin: '0 0 15px 0',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10,
                        gap: '8px'
                    }}>
                        <div className="drawer-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '4px', flex: 1 }}>
                            <div 
                                className={`drawer-tab ${activeTab === 'equipment' ? 'active' : ''}`}
                                onClick={() => { triggerHaptic(15); setActiveTab('equipment'); }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: 'calc(var(--dynamic-log-size, 16px) * 0.7)',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    cursor: 'pointer',
                                    background: activeTab === 'equipment' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === 'equipment' ? '#000' : 'rgba(255,255,255,0.5)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Worn Items
                            </div>
                            <div 
                                className={`drawer-tab ${activeTab === 'inventory' ? 'active' : ''}`}
                                onClick={() => { triggerHaptic(15); setActiveTab('inventory'); }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: 'calc(var(--dynamic-log-size, 16px) * 0.7)',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    cursor: 'pointer',
                                    background: activeTab === 'inventory' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === 'inventory' ? '#000' : 'rgba(255,255,255,0.5)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Inventory Items
                            </div>
                        </div>
                        
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
                            lineHeight: '1.2',
                            whiteSpace: 'pre',
                            overflowX: 'hidden',
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
                        </div>
                    ) : (
                        <div ref={eqContainerRef} style={{
                            fontFamily: 'var(--font-main, monospace)',
                            fontSize: eqFontSize,
                            lineHeight: '1.2',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
