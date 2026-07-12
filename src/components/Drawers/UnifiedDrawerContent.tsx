/**
 * @file UnifiedDrawerContent.tsx
 * @description Shared content renderer for desktop drawers and the mobile gutter drawer.
 */

import React from 'react';
import { DrawerLine, GmcpOccupant } from '../../types';
import { DrawerType } from '../../context/GameContext/types';
import { StatusDrawer } from './StatusDrawer';
import { AccountDrawer } from './AccountDrawer';
import { DrawerHoldCommandButton } from './DrawerHoldCommandButton';
import { GearView } from './Views/GearView';

type GearTab = 'worn' | 'inv' | 'vicinity';

interface UnifiedDrawerContentProps {
    drawer: DrawerType;
    gearTab: GearTab;
    setGearTab: (tab: GearTab) => void;
    displayInventoryLines: DrawerLine[];
    displayEqLines: DrawerLine[];
    roomItems: GmcpOccupant[];
    triggerHaptic: (ms: number) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const UnifiedDrawerContent: React.FC<UnifiedDrawerContentProps> = ({
    drawer,
    gearTab,
    setGearTab,
    displayInventoryLines,
    displayEqLines,
    roomItems,
    triggerHaptic,
    executeCommand
}) => {
    const selectGearTab = (tab: GearTab) => {
        triggerHaptic(10);
        if (tab === 'worn') executeCommand('eq', true, true, false, true);
        else if (tab === 'inv') executeCommand('inv', true, true, false, true);
        else executeCommand('look', true, true, false, true);
        setGearTab(tab);
    };

    const renderHoldActions = (actions: { id: string; label: string; command: string }[]) => (
        <div style={{ display: 'flex', gap: '8px', padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(13,16,23,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            {actions.map(action => (
                <DrawerHoldCommandButton
                    key={action.id}
                    label={action.label}
                    command={action.command}
                />
            ))}
        </div>
    );

    if (drawer === 'account') {
        return <AccountDrawer />;
    }

    const categories = ['status', 'equipment'] as DrawerType[];
    const activeCategoryIndex = categories.indexOf(drawer);

    if (activeCategoryIndex === -1) {
        return null;
    }

    return (
        <div className="drawer-category-viewport" style={{ overflow: 'hidden', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
                className="drawer-category-track"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '200%',
                    height: '100%',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: `translateX(-${activeCategoryIndex * 50}%)`
                }}
            >
                {/* 1. Status View */}
                <div className="drawer-category-slide" style={{ width: '50%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <StatusDrawer />
                </div>

                {/* 2. Gear View */}
                <div className="drawer-category-slide" style={{ width: '50%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <GearView
                        gearTab={gearTab}
                        selectGearTab={selectGearTab}
                        displayEqLines={displayEqLines}
                        displayInventoryLines={displayInventoryLines}
                        roomItems={roomItems}
                        triggerHaptic={triggerHaptic}
                        executeCommand={executeCommand}
                        renderHoldActions={renderHoldActions}
                    />
                </div>
            </div>
        </div>
    );
};
