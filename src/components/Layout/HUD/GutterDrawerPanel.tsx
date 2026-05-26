/**
 * @file GutterDrawerPanel.tsx
 * @description Mobile portrait drawer panel content for the bottom gutter.
 */

import React from 'react';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
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
        whoLines,
        whereLines,
        infoLines,
        questLines,
        achievementLines,
        practiceLines,
        setWhoLines,
        setWhereLines,
        gearTab,
        setGearTab,
        playersTab,
        setPlayersTab,
        charTab,
        setCharTab
    } = useUI();
    const { groupMembers } = useVitals();

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
                    playersTab={playersTab}
                    setPlayersTab={setPlayersTab}
                    charTab={charTab}
                    setCharTab={setCharTab}
                    displayInventoryLines={displayInventoryLines}
                    displayEqLines={displayEqLines}
                    roomItems={roomItems}
                    whoLines={whoLines}
                    whereLines={whereLines}
                    infoLines={infoLines}
                    questLines={questLines}
                    achievementLines={achievementLines}
                    practiceLines={practiceLines}
                    groupMembers={groupMembers}
                    triggerHaptic={triggerHaptic}
                    executeCommand={executeCommand}
                    setWhoLines={setWhoLines}
                    setWhereLines={setWhereLines}
                />
            </div>
        </div>
    );
};
