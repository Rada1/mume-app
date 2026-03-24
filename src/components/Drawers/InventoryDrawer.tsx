/**
 * @file InventoryDrawer.tsx
 * @description Renders the player's inventory list with interactive items.
 */

import React from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName } from '../../utils/categorizationUtils';

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
    executeCommand,
    entities,
    keywordOverrides
}) => {
    const { 
        handleLogPointerDown, 
        handleLogPointerUp, 
        handleLogClick, 
        selectedObjectIds,
        clearObjectSelection 
    } = useGame();
    const drawerRef = React.useRef<HTMLDivElement>(null);

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
        if (target.closest('.inline-btn')) {
            handleLogPointerDown(e);
            return;
        }
        container.dataset.swipeX = e.clientX.toString();
        container.dataset.swipeY = e.clientY.toString();
        container.setPointerCapture(e.pointerId);
    };

    const onPointerUpInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('.inline-btn')) {
            handleLogPointerUp(e);
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
        } else {
            if (selectedObjectIds.size > 0) clearObjectSelection();
        }
    };

    const renderLine = (line: DrawerLine) => {
        const depth = line.depth || 0;
        const fullId = `inventorylist:${line.entityId || line.id}:${line.context || line.id}`;
        const isSelected = selectedObjectIds.has(fullId);
        const itemBrown = 'rgba(180, 100, 50, 0.9)';

        if (line.isItem) {
            const conditionRegex = /\s?\((flawless|well-maintained|worn|scratched|damaged|beaten|battered|beaten and battered|shabby|sub-standard|poor|fragmented|broken|shattered)\)/gi;
            const cleanedText = line.text.replace(conditionRegex, '').trim();
            const displayName = cleanedText.includes(' (') ? cleanedText.split(' (')[0] : cleanedText;
            const extraInfo = cleanedText.includes(' (') ? cleanedText.split(' (')[1] : null;

            const cat = getCategoryForName(line.text);
            const isActuallyContainer = line.isContainer || cat === 'inline-containers';

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
                            className={`inline-btn auto-item ${isSelected ? 'selected-item' : ''} ${isActuallyContainer ? 'is-container' : ''}`}
                            data-id={fullId}
                            data-line-id={line.id}
                            data-context={line.context || line.id}
                            data-action="menu"
                            data-category={cat || undefined}
                            data-cmd="inline-obj-char"
                            style={{ 
                                marginLeft: line.prefixHtml ? '0' : `${depth * 20}px`,
                                boxShadow: isSelected ? `inset 0 0 12px ${itemBrown}44` : 'none',
                                borderColor: isSelected ? itemBrown : 'transparent',
                                '--glow-color': itemBrown,
                                color: itemBrown,
                                cursor: 'default'
                            } as React.CSSProperties}
                        >
                            <div className="drawer-item-text-wrapper">
                                <span className="drawer-item-name" style={{ color: itemBrown }}>{displayName}</span>
                                {extraInfo && <span className="drawer-item-extra">({extraInfo}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key={line.id} className={`drawer-header-line depth-${depth}`} style={{ paddingLeft: `${depth * 8}px` }} dangerouslySetInnerHTML={{ __html: line.html }} />
        );
    };

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
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '12px 15px' }}>
                <div className="drawer-section" data-drawer-section="inventorylist">
                    <div className="drawer-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        background: 'rgba(10, 13, 21, 0.65)',
                        backdropFilter: 'blur(25px)',
                        WebkitBackdropFilter: 'blur(25px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        margin: '0 0 15px 0',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '900', fontSize: '0.75rem', letterSpacing: '1.5px', color: '#ffffff', textTransform: 'uppercase' }}>Inventory</span>
                        </div>
                        <button 
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => { triggerHaptic(20); onClose(); }} 
                            style={{ 
                                background: 'rgba(255,255,255,0.08)', 
                                border: 'none', 
                                color: '#fff', 
                                width: '30px', 
                                height: '30px', 
                                borderRadius: '15px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '1rem', 
                                cursor: 'pointer'
                            }}
                        >✕</button>
                    </div>
                    {inventoryLines.length === 0 ? (
                        <div className="drawer-empty-state">Inventory is currently empty</div>
                    ) : (                     
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {inventoryLines.map(line => renderLine(line))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
