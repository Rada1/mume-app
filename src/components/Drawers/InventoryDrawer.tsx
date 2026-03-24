/**
 * @file InventoryDrawer.tsx
 * @description Renders the player's inventory list with interactive items.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';
import { useItemDrawerInteractions } from '../../hooks/useItemDrawerInteractions';

interface InventoryDrawerProps {
    isOpen: boolean;
    isPeeking?: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
    entities: Record<string, import('../../types').GameEntity>;
    keywordOverrides: Record<string, string>;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    isPeeking,
    onClose,
    triggerHaptic,
    inventoryLines,
    handleButtonClick,
    executeCommand,
    pendingDrawerContainerRef,
    inlineCategories = [],
    entities,
    keywordOverrides
}) => {
    const { applyOptimisticChange } = useGame() as any;
    const { setUI, ui, setPopoverState, popoverState } = useUI();
    const drawerRef = React.useRef<HTMLDivElement>(null);
    const [expandedContainers, setExpandedContainers] = React.useState<Set<string>>(new Set());

    // --- Consolidated Interaction Logic ---
    const {
        handlePointerDown,
        draggedItem,
        selectedItems,
        isSelectMode,
        primedItemId,
        exitSelectMode,
        ghostRef,
        executeActionForSelected,
        setSelectedItems
    } = useItemDrawerInteractions({
        drawerType: 'inventory',
        lines: inventoryLines,
        drawerRef,
        isOpen,
        onClose,
        setUI,
        ui,
        executeCommand,
        triggerHaptic,
        applyOptimisticChange,
        entities,
        popoverState,
        setPopoverState,
        keywordOverrides
    });

    // --- Local Handlers ---

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
            const targetName = targetBtn?.getAttribute('data-item-name');

            triggerHaptic(60);
            if (isTargetContainer && targetName) {
                executeCommand(`get ${data.context}`, true, true);
                setTimeout(() => executeCommand(`put ${data.context} ${targetName}`), 125);
            } else {
                executeCommand(`get ${data.context}`);
            }
        }
    };

    return (
        <div
            ref={drawerRef}
            className={`inventory-drawer log-card-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                // Base-layer swipes for closure
                e.currentTarget.dataset.swipeX = e.clientX.toString();
                e.currentTarget.dataset.swipeY = e.clientY.toString();
                e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
                const sx = parseFloat(e.currentTarget.dataset.swipeX || "0");
                const sy = parseFloat(e.currentTarget.dataset.swipeY || "0");
                if (sx && sy) {
                    const deltaY = e.clientY - sy;
                    const deltaX = Math.abs(e.clientX - sx);
                    if (deltaY > 50 && deltaY > deltaX) {
                        exitSelectMode();
                        onClose();
                    } else if (isSelectMode) {
                        const target = e.target as HTMLElement;
                        if (!target.closest('.auto-item') && !target.closest('.select-mode-bar')) exitSelectMode();
                    }
                }
                delete e.currentTarget.dataset.swipeX;
                delete e.currentTarget.dataset.swipeY;
            }}
        >
            {draggedItem && ReactDOM.createPortal(
                <div
                    ref={ghostRef}
                    className="drag-ghost"
                    style={{ left: draggedItem.x, top: draggedItem.y, pointerEvents: 'none' }}
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
            
            {isSelectMode && (
                <div className="select-mode-bar">
                    <span className="select-count">{selectedItems.size} selected</span>
                    <button className="select-action-btn" onClick={() => executeActionForSelected('drop')}>Drop</button>
                    <button className="select-action-btn" onClick={() => executeActionForSelected('wear')}>Equip</button>
                    <button className="select-action-btn" onClick={() => executeActionForSelected('get')}>Get</button>
                    <button className="select-action-btn select-cancel-btn" onClick={exitSelectMode}>✕ Cancel</button>
                </div>
            )}
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <div className="drawer-section" data-drawer-section="inventorylist">
                    <div className="drawer-section-drop-zone" style={{ display: 'flex', alignItems: 'center' }}>
                        <span>Inventory</span>
                        <span className="drop-hint">drop items here</span>
                        <button 
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => { triggerHaptic(20); exitSelectMode(); onClose(); }} 
                            className="drawer-close-btn"
                        >✕</button>
                    </div>
                    {inventoryLines.length === 0 ? (
                        <div className="drawer-empty-state">Inventory is currently empty</div>
                    ) : (                     
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
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
                                    const isSelected = selectedItems.has(line.id);
                                    const depth = line.depth || 0;
                                    const isExpanded = expandedContainers.has(line.id);
                                    const cat = getCategoryForName(line.text);
                                    const glowColor = getGlowColorForCategory(cat);

                                    return (
                                        <div key={line.id} style={{ display: 'flex', flexDirection: 'column', marginLeft: `${depth * 8}px`, marginBottom: '1px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', minHeight: '22px' }}>
                                                {line.prefixHtml && (
                                                    <span 
                                                        className="drawer-line-prefix"
                                                        dangerouslySetInnerHTML={{ __html: line.prefixHtml }}
                                                    />
                                                )}
                                                <div
                                                    className={`inline-btn auto-item ${isPrimed ? 'primed' : ''} ${isSelected ? 'selected-item' : ''} ${line.isContainer ? 'is-container' : ''}`}
                                                    data-item-name={line.context || line.id}
                                                    data-id={line.entityId || ''}
                                                    onPointerDown={(e) => handlePointerDown(e, line)}
                                                    onPointerUp={(e) => {
                                                        if (isSelectMode) {
                                                            const newSet = new Set(selectedItems);
                                                            if (newSet.has(line.id)) newSet.delete(line.id);
                                                            else newSet.add(line.id);
                                                            setSelectedItems(new Set(newSet));
                                                            triggerHaptic(20);
                                                            if (newSet.size === 0) exitSelectMode();
                                                            return;
                                                        }
                                                        if (line.isContainer) {
                                                            triggerHaptic(20);
                                                            setExpandedContainers(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(line.id)) next.delete(line.id);
                                                                else {
                                                                    next.add(line.id);
                                                                    if (pendingDrawerContainerRef) pendingDrawerContainerRef.current = { containerId: line.context || line.id, cmd: 'inventorylist', afterId: line.id };
                                                                    executeCommand(`look in ${line.context || line.id}`, true, true);
                                                                }
                                                                return next;
                                                            });
                                                        } else {
                                                             handleButtonClick({ setId: 'inline-obj-char', display: 'floating', entityId: line.entityId } as any, e as any, line.context || line.id, false, line.parentItemNoun);
                                                        }
                                                    }}
                                                    style={{ 
                                                        marginLeft: line.prefixHtml ? '0' : `${depth * 20}px`,
                                                        boxShadow: isSelected ? `inset 0 0 12px ${glowColor}44` : 'none',
                                                        borderColor: isSelected ? glowColor : 'transparent'
                                                    }}
                                                >
                                                    <span dangerouslySetInnerHTML={{ __html: line.html }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
