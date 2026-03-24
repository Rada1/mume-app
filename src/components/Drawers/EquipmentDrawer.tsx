/**
 * @file EquipmentDrawer.tsx
 * @description Renders the player's equipment list with interactive items.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';
import { useItemDrawerInteractions } from '../../hooks/useItemDrawerInteractions';
import { getEffectiveKeyword } from '../../utils/keywordUtils';

interface EquipmentDrawerProps {
    isOpen: boolean;
    isPeeking?: boolean;
    onClose: () => void;
    eqLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    triggerHaptic: (ms: number) => void;
    isLandscape?: boolean;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
    entities: Record<string, import('../../types').GameEntity>;
    keywordOverrides: Record<string, string>;
}

export const EquipmentDrawer: React.FC<EquipmentDrawerProps> = ({
    isOpen,
    isPeeking,
    onClose,
    eqLines,
    handleButtonClick,
    triggerHaptic,
    isLandscape,
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
        drawerType: 'equipment',
        lines: eqLines,
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

    const isLineVisible = (line: DrawerLine, allLines: DrawerLine[]): boolean => {
        if (!line.parentItemId) return true;
        const parent = allLines.find(l => l.id === line.parentItemId);
        if (!parent) return true;
        if (!expandedContainers.has(parent.id)) return false;
        return isLineVisible(parent, allLines);
    };

    const renderLine = (line: DrawerLine) => {
        const isBeingDragged = draggedItem?.line.id === line.id;
        const isSelected = selectedItems.has(line.id);
        const depth = line.depth || 0;
        const itemBrown = 'rgba(180, 100, 50, 0.9)';

        if (line.isItem) {
            const isPrimed = primedItemId === line.id;
            const conditionRegex = /\s?\((flawless|well-maintained|worn|scratched|damaged|beaten|battered|beaten and battered|shabby|sub-standard|poor|fragmented|broken|shattered)\)/gi;
            const cleanedText = line.text.replace(conditionRegex, '').trim();
            const displayName = cleanedText.includes(' (') ? cleanedText.split(' (')[0] : cleanedText;
            const extraInfo = cleanedText.includes(' (') ? cleanedText.split(' (')[1] : null;

            const entity = entities[line.entityId || ''];
            const itemNoun = getEffectiveKeyword(line.text, line.html, entity, keywordOverrides) || line.stableId;

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
                            className={`inline-btn auto-item ${isPrimed ? 'primed' : ''} ${line.isContainer ? 'is-container' : ''} ${isSelected ? 'selected-item' : ''}`}
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
                                            pendingDrawerContainerRef.current = { containerId: line.id, cmd: 'equipmentlist', afterId: line.id };
                                            executeCommand(`look in ${line.context || line.id}`, true, true);
                                        }
                                        return next;
                                    });
                                } else {
                                    handleButtonClick({
                                        id: 'drawer-item-' + line.id,
                                        label: itemNoun,
                                        command: 'inline-obj-worn',
                                        actionType: 'menu',
                                        setId: 'inline-obj-worn',
                                        entityId: line.entityId,
                                        isVisible: true,
                                        style: { backgroundColor: itemBrown }
                                    } as any, e as any, itemNoun, false, line.parentItemNoun);
                                }
                            }}
                            style={{
                                color: itemBrown,
                                opacity: isBeingDragged ? 0.3 : 1,
                                marginLeft: line.prefixHtml ? '0' : `${depth * 20}px`
                            }}
                        >
                            <div className="drawer-item-text-wrapper">
                                <span className="drawer-item-name">{displayName}</span>
                                {extraInfo && <span className="drawer-item-extra">({extraInfo}</span>}
                            </div>
                            {line.isContainer && (
                                <span className={`drawer-container-toggle ${expandedContainers.has(line.id) ? 'expanded' : ''}`}>▶</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key={line.id} className={`drawer-header-line depth-${depth}`} dangerouslySetInnerHTML={{ __html: line.html }} />
        );
    };

    return (
        <div 
            ref={drawerRef}
            className={`right-drawer log-card-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''} ${isLandscape ? 'landscape-mode' : ''}`}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                e.currentTarget.dataset.swipeX = e.clientX.toString();
                e.currentTarget.dataset.swipeY = e.clientY.toString();
                e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
                const sx = parseFloat(e.currentTarget.dataset.swipeX || "0");
                const sy = parseFloat(e.currentTarget.dataset.swipeY || "0");
                if (sx && sy) {
                    const deltaX = sx - e.clientX;
                    const deltaY = Math.abs(e.clientY - sy);
                    if (deltaX < -20 && Math.abs(deltaX) > deltaY) { 
                        triggerHaptic(40); 
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
            {isSelectMode && (
                <div className="select-mode-bar">
                    <span className="select-count">{selectedItems.size} selected</span>
                    <button className="select-action-btn" onClick={() => executeActionForSelected('drop')}>Drop</button>
                    <button className="select-action-btn" onClick={() => executeActionForSelected('remove')}>Remove</button>
                    <button className="select-action-btn select-cancel-btn" onClick={exitSelectMode}>✕ Cancel</button>
                </div>
            )}

            <div className="drawer-content" style={{ padding: '20px' }}>
                <div className="drawer-section" data-drawer-section="equipmentlist">
                    <div className="drawer-section-drop-zone" style={{ display: 'flex', alignItems: 'center' }}>
                        <span>⚔ Equipment</span>
                        <span className="drop-hint">drop here → wear</span>
                        <button 
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => { triggerHaptic(20); exitSelectMode(); onClose(); }} 
                            className="drawer-close-btn"
                        >✕</button>
                    </div>
                    {eqLines.filter(l => isLineVisible(l, eqLines)).map(line => renderLine(line))}
                    {eqLines.length === 0 && <div className="drawer-empty-state">No equipment worn</div>}
                </div>
            </div>

            {draggedItem && ReactDOM.createPortal(
                <div ref={ghostRef} className="drag-ghost" style={{ left: draggedItem.x, top: draggedItem.y, pointerEvents: 'none' }}>
                    {(() => {
                        const label = draggedItem.commandLabel ?? draggedItem.line.text;
                        const noun = draggedItem.itemNoun;
                        if (!noun) return <>{label}</>;
                        const idx = label.indexOf(noun);
                        if (idx === -1) return <>{label}</>;
                        return <>{label.slice(0, idx)}<span style={{ color: 'rgb(175,255,255)', fontWeight: 'bold' }}>{noun}</span>{label.slice(idx + noun.length)}</>;
                    })()}
                    {selectedItems.size > 1 && (
                        <div className="ghost-badge">{selectedItems.size}</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};
