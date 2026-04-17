/**
 * @file EquipmentDrawer.tsx
 * @description Renders the player's equipment list with interactive items.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { getCategoryForName, getGlowColorForCategory, COLOR_OBJ } from '../../utils/categorizationUtils';
import { getEffectiveKeyword } from '../../utils/keywordUtils';
import { isObjectSelected } from '../../utils/selectionUtils';
import { sanitizeMumeHtml } from '../../utils/securityUtils';

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
    const infoContainerRef = React.useRef<HTMLDivElement>(null);
    const [infoFontSize, setInfoFontSize] = React.useState<string>('inherit');

    React.useEffect(() => {
        if (!infoContainerRef.current || !isOpen) return;
        const measure = () => {
            const width = infoContainerRef.current?.clientWidth;
            if (width) setInfoFontSize(`${width / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [isOpen]);

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
        
        const rowBg = 'rgba(180, 180, 180, 0.18)'; // More visible silver-gray
        const accentColor = 'rgba(180, 180, 180, 0.5)'; // Stronger silver accent

        const rowStyle: React.CSSProperties = {
            background: rowBg,
            borderRadius: '6px',
            borderLeft: `4px solid ${accentColor}`,
            margin: '3px 0',
            padding: '6px 10px',
            paddingLeft: `${depth * 8 + 10}px`,
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'baseline',
            minHeight: '28px'
        };

        if (line.isItem) {
            const conditionRegex = /\s?\(.*\)/gi;
            const cleanedText = line.text.replace(conditionRegex, '').trim();
            const displayName = cleanedText.includes(' (') ? cleanedText.split(' (')[0] : cleanedText;
            const extraInfo = cleanedText.includes(' (') ? cleanedText.split(' (')[1] : null;

            const itemColor = COLOR_OBJ;
            const cat = getCategoryForName(line.text);

            return (
                <div key={line.id} style={rowStyle}>
                    <div
                        className={`inline-btn auto-item ${isSelected ? 'selected-item' : ''} ${line.isContainer ? 'is-container' : ''}`}
                        data-id={fullId}
                        data-line-id={line.id}
                        data-context={line.context || line.id}
                        data-action="menu"
                        data-category={cat || undefined}
                        data-cmd="inline-obj-worn"
                        style={{
                            boxShadow: isSelected ? `inset 0 0 12px ${itemColor}44` : 'none',
                            borderColor: isSelected ? itemColor : 'transparent',
                            '--glow-color': itemColor,
                            color: itemColor,
                            cursor: 'default',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'baseline',
                            flexWrap: 'wrap',
                            gap: '6px',
                            width: 'fit-content',
                            padding: '0 6px',
                            justifyContent: 'flex-start',
                        } as React.CSSProperties}
                    >
                        {line.prefixHtml && (
                            <span
                                className="equipment-location-inline"
                                style={{ marginRight: '8px' }}
                                dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.prefixHtml) }}
                            />
                        )}
                        <span className="drawer-item-name" style={{ color: itemColor }}>{displayName}</span>
                        {extraInfo && <span className="drawer-item-extra" style={{ color: 'var(--text-primary)' }}>({extraInfo}</span>}
                    </div>
                </div>
            );
        }

        return (
            <div key={line.id} style={rowStyle} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
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
                        background: 'rgba(10, 13, 21, 0.45)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        margin: '0 0 15px 0',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '900', fontSize: 'calc(var(--dynamic-log-size, 16px) * 0.75)', letterSpacing: '1.5px', color: '#ffffff', textTransform: 'uppercase' }}>Equipment</span>
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
                                fontSize: 'var(--dynamic-log-size, 16px)', 
                                cursor: 'pointer'
                            }}
                        >✕</button>

                    </div>
                    <div ref={infoContainerRef} style={{
                        fontFamily: 'var(--font-main, monospace)',
                        fontSize: infoFontSize,
                        lineHeight: '1.5',
                    }}>
                        {eqLines.map(line => renderLine(line))}
                        {eqLines.length === 0 && <div className="drawer-empty-state" style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>No equipment worn</div>}
                        
                        {/* Empty spacing at the bottom for better scroll visibility */}
                        <div style={{ height: '100px', width: '100%' }} aria-hidden="true" />
                    </div>
                </div>
            </div>
        </div>
    );
};
