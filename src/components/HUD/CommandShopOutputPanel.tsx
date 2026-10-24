/** @file CommandShopOutputPanel.tsx — Captured shop replies in the shared Details panel position. */
import React from 'react';
import type { CommandShopProps } from '../../types';
import { CapturedDetailsSidePanel } from '../Popovers/StandardMenu/CapturedDetailsSidePanel';

// --- Render Section ---
export const CommandShopOutputPanel: React.FC<CommandShopProps> = ({ shop }) => {
    if (!shop.outputVisible) return null;
    return (
        <CapturedDetailsSidePanel
            shopLines={shop.outputLines}
            shopTitle={shop.outputTitle}
            isShopPending={Boolean(shop.pendingCommand)}
            onClose={() => shop.setOutputOpen(false)}
        />
    );
};
