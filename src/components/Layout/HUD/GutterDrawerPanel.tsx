/**
 * @file GutterDrawerPanel.tsx
 * @description Mobile portrait drawer panel content for the bottom gutter.
 */

import React from 'react';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { UnifiedDrawerContent } from '../../Drawers/UnifiedDrawerContent';

export const GutterDrawerPanel: React.FC = () => {
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

    if (ui.drawer === 'none') return null;

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
                    drawer={ui.drawer}
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
