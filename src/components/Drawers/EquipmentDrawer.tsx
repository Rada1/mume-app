/**
 * @file EquipmentDrawer.tsx
 * @description Renders the player's equipment list with interactive items.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';
import { getEffectiveKeyword } from '../../utils/keywordUtils';
import { isObjectSelected } from '../../utils/selectionUtils';

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
    const { 
        handleLogPointerDown, 
        handleLogPointerUp, 
        handleLogClick, 
        selectedObjectIds,
        toggleObjectSelection,
        clearObjectSelection 
    } = useGame();
    const { setUI, ui } = useUI();
    const drawerRef = React.useRef<HTMLDivElement>(null);

    const onPointerDownInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('.inline-btn')) {
            handleLogPointerDown(e);
            return;
        }
        // Base-layer swipes for closure
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
        const fullId = `equipmentlist:${line.entityId || line.id}:${line.context || line.id}`;
        const isSelected = isObjectSelected(selectedObjectIds, fullId, 'inline-obj-worn');
        
        if (line.isItem) {
            const conditionRegex = /\s?\((flawless|well-maintained|worn|scratched|damaged|beaten|battered|beaten and battered|shabby|sub-standard|poor|fragmented|broken|shattered)\)/gi;
            const cleanedText = line.text.replace(conditionRegex, '').trim();
            const displayName = cleanedText.includes(' (') ? cleanedText.split(' (')[0] : cleanedText;
            const extraInfo = cleanedText.includes(' (') ? cleanedText.split(' (')[1] : null;

            const itemBrown = 'rgba(180, 100, 50, 0.9)';
            const cat = getCategoryForName(line.text);

            return (
                <div key={line.id} className="equipment-item-row" style={{ marginLeft: `${depth * 8}px`, marginBottom: '6px' }}>
                    <div className="equipment-item-content">
                        <div
                            className={`inline-btn auto-item ${isSelected ? 'selected-item' : ''} ${line.isContainer ? 'is-container' : ''}`}
                            data-id={fullId}
                            data-line-id={line.id}
                            data-context={line.context || line.id}
                            data-action="menu"
                            data-category={cat || undefined}
                            data-cmd="inline-obj-worn"
                            style={{
                                marginLeft: '0',
                                boxShadow: isSelected ? `inset 0 0 12px ${itemBrown}44` : 'none',
                                borderColor: isSelected ? itemBrown : 'transparent',
                                '--glow-color': itemBrown,
                                color: itemBrown,
                                cursor: 'default'
                            } as React.CSSProperties}
                        >
                            <div className="drawer-item-text-wrapper">
                                <span className="drawer-item-name" style={{ color: itemBrown }}>{displayName}</span>
                                {extraInfo && <span className="drawer-item-extra" style={{ color: itemBrown }}>({extraInfo}</span>}
                            </div>
                        </div>
                        {line.prefixHtml && (
                            <span 
                                className="drawer-line-prefix equipment-location"
                                dangerouslySetInnerHTML={{ __html: line.prefixHtml }}
                            />
                        )}
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
            className={`right-drawer log-card-drawer equipment-drawer ${isOpen ? 'open' : ''} ${isPeeking ? 'peeking' : ''} ${isLandscape ? 'landscape-mode' : ''}`}
            onPointerDown={onPointerDownInternal}
            onPointerUp={onPointerUpInternal}
            onPointerCancel={onPointerUpInternal}
            onClick={onClickInternal}
        >
            <div className="drawer-content" style={{ padding: '12px 15px' }}>
                <div className="drawer-section" data-drawer-section="equipmentlist">
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
                            <span style={{ fontWeight: '900', fontSize: '0.75rem', letterSpacing: '1.5px', color: '#ffffff', textTransform: 'uppercase' }}>Equipment</span>
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
                    {eqLines.map(line => renderLine(line))}
                    {eqLines.length === 0 && <div className="drawer-empty-state">No equipment worn</div>}
                </div>
            </div>
        </div>
    );
};
