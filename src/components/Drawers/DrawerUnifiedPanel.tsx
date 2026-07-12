/**
 * @file DrawerUnifiedPanel.tsx
 * @description Thin wrapper for repeated unified utility drawer content.
 */

import React, { ComponentProps } from 'react';
import type { DrawerType } from '../../context/GameContext/types';
import { UnifiedDrawerContent } from './UnifiedDrawerContent';

type DrawerData = Omit<ComponentProps<typeof UnifiedDrawerContent>, 'drawer'>;

interface DrawerUnifiedPanelProps {
    drawer: DrawerType;
    drawerData: DrawerData;
}

// --- Logic Section ---

export const DrawerUnifiedPanel: React.FC<DrawerUnifiedPanelProps> = ({ drawer, drawerData }) => (
    <UnifiedDrawerContent
        drawer={drawer}
        gearTab={drawerData.gearTab}
        setGearTab={drawerData.setGearTab}
        displayInventoryLines={drawerData.displayInventoryLines}
        displayEqLines={drawerData.displayEqLines}
        roomItems={drawerData.roomItems}
        triggerHaptic={drawerData.triggerHaptic}
        executeCommand={drawerData.executeCommand}
    />
);
