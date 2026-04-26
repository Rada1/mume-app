/**
 * @file InventoryView.tsx
 * @description Renders the player's inventory and equipment in a unified tabbed drawer.
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useGame, useUI } from '../../../context/GameContext';
import { useInventoryLines } from '../../../hooks/drawers/useInventoryLines';
import { LineItem } from '../LineItem';
import { DrawerLine, CustomButton } from '../../../types';

interface InventoryViewProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    eqLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
    isOpen,
    onClose,
    triggerHaptic,
    inventoryLines,
    eqLines,
    executeCommand,
}) => {
    const {
        selectedObjectIds,
        clearObjectSelection
    } = useGame();
    const { ui } = useUI();

    const [activeTab, setActiveTab] = useState<'inventory' | 'equipment'>('equipment');

    // Sync active tab with global UI state
    useEffect(() => {
        if (!isOpen) return;
        if (ui.drawer === 'inventory') setActiveTab('inventory');
        else if (ui.drawer === 'equipment') setActiveTab('equipment');
    }, [isOpen, ui.drawer]);

    const eqContainerRef = useRef<HTMLDivElement>(null);
    const [eqFontSize, setEqFontSize] = useState<string>('inherit');

    useLayoutEffect(() => {
        if (!eqContainerRef.current) return;
        const measure = () => {
            const width = eqContainerRef.current?.clientWidth;
            if (width) {
                // Cap font size at 24px and floor at 12px
                const size = Math.min(24, Math.max(12, (width - 24) / 48));
                setEqFontSize(`${size}px`);
            }
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(eqContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen]);

    const currentLines = useInventoryLines({
        inventoryLines,
        eqLines,
        activeTab
    });

    const onClickInternal = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.inline-btn') && !target.closest('.drawer-tab')) {
            if (selectedObjectIds.size > 0) clearObjectSelection();
        }
    };

    return (
        <div 
            className="inventory-view-content" 
            onClick={onClickInternal}
            style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
        >
            {/* Internal Tabs */}
            <div className="drawer-tabs-header" style={{
                display: 'flex',
                background: 'rgba(0,0,0,0.15)',
                padding: '2px',
                borderRadius: '8px',
                margin: '0 10px 8px 10px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <button 
                    className={`drawer-tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
                    onClick={() => { triggerHaptic(10); setActiveTab('equipment'); }}
                    style={{
                        flex: 1,
                        padding: '6px',
                        border: 'none',
                        borderRadius: '6px',
                        background: activeTab === 'equipment' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: activeTab === 'equipment' ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontSize: '0.75rem',
                        fontWeight: activeTab === 'equipment' ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Worn
                </button>
                <button 
                    className={`drawer-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => { triggerHaptic(10); setActiveTab('inventory'); }}
                    style={{
                        flex: 1,
                        padding: '6px',
                        border: 'none',
                        borderRadius: '6px',
                        background: activeTab === 'inventory' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: activeTab === 'inventory' ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontSize: '0.75rem',
                        fontWeight: activeTab === 'inventory' ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Inventory
                </button>
            </div>

            <div 
                ref={eqContainerRef}
                style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '0 12px 8px 12px',
                    fontFamily: 'var(--font-main, monospace)',
                    fontSize: eqFontSize
                }}
            >
                {currentLines.map(line => (
                    <LineItem 
                        key={line.id} 
                        line={line} 
                        fontSize="inherit"
                        location={activeTab === 'inventory' ? 'carried' : 'worn'}
                        category={activeTab === 'inventory' ? 'inline-obj-char' : 'inline-obj-worn'}
                    />
                ))}
                <div style={{ height: '60px' }} />
            </div>

            {/* Tab navigation handled by CSS/DrawerManager, but keeping local tab state for logic */}
        </div>
    );
};
