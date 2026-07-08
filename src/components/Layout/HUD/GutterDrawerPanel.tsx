/**
 * @file GutterDrawerPanel.tsx
 * @description Mobile portrait drawer panel content for the bottom gutter.
 */

import React from 'react';
import { useGame, useUI } from '../../../context/GameContext';
import { DrawerType } from '../../../context/GameContext/types';
import { UnifiedDrawerContent } from '../../Drawers/UnifiedDrawerContent';

interface GutterDrawerPanelProps {
    // When provided, render this drawer's content instead of ui.drawer. Lets the panel
    // keep showing the previous drawer while it slides out after ui.drawer becomes 'none'.
    displayDrawer?: DrawerType;
}

export const GutterDrawerPanel: React.FC<GutterDrawerPanelProps> = ({ displayDrawer }) => {
    const {
        triggerHaptic,
        executeCommand,
        handleLogClick,
        handleLogPointerDown,
        handleLogPointerUp,
        roomItems
    } = useGame();
    const {
        ui,
        displayInventoryLines,
        displayEqLines,
        infoLines,
        questLines,
        achievementLines,
        practiceLines,
        gearTab,
        setGearTab,
        charTab,
        setCharTab
    } = useUI();

    const effectiveDrawer = displayDrawer ?? ui.drawer;
    if (effectiveDrawer === 'none') return null;

    return (
        <div className="gutter-drawer-container gutter-panel-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
                className="gutter-drawer-content"
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                onClick={handleLogClick as any}
                onPointerDown={handleLogPointerDown}
                onPointerUp={handleLogPointerUp}
                onPointerCancel={handleLogPointerUp}
            >
                <UnifiedDrawerContent
                    drawer={effectiveDrawer}
                    gearTab={gearTab}
                    setGearTab={setGearTab}
                    charTab={charTab}
                    setCharTab={setCharTab}
                    displayInventoryLines={displayInventoryLines}
                    displayEqLines={displayEqLines}
                    roomItems={roomItems}
                    infoLines={infoLines}
                    questLines={questLines}
                    achievementLines={achievementLines}
                    practiceLines={practiceLines}
                    triggerHaptic={triggerHaptic}
                    executeCommand={executeCommand}
                />
            </div>
        </div>
    );
};
