/**
 * @file PlayersPanel.tsx
 * @description Floating panel (docked left of the chat window) showing Online/Nearby/Group
 * player rosters — pulled out of the tabbed Status/Char/Gear drawer so it can be viewed
 * alongside the map and chat without switching tabs.
 */

import React from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { DrawerTabBar } from '../Drawers/DrawerTabBar';
import { DrawerHoldCommandButton } from '../Drawers/DrawerHoldCommandButton';
import { UnifiedView } from '../Drawers/Views/UnifiedView';
import { NearbyWhereView } from '../Drawers/NearbyWhereView';
import { GroupTableView } from '../Drawers/GroupTableView';

import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';

type PlayersTab = 'online' | 'nearby' | 'group';

// --- Component Section ---

const PlayersPanel: React.FC = () => {
    const { triggerHaptic, executeCommand, viewport } = useGame() as any;
    const { playersTab, setPlayersTab, whoLines, whereLines, setWhoLines, setWhereLines } = useUI();
    const { groupMembers } = useVitals();
    const showChatWindow = useSettingsStore(s => s.showChatWindow);
    const lastNearbyRefreshRef = React.useRef(0);

    const refreshNearby = () => {
        const now = Date.now();
        if (now - lastNearbyRefreshRef.current < 1000) return;
        lastNearbyRefreshRef.current = now;
        setWhereLines?.([]);
        executeCommand('where', true, true, false, true);
    };

    const selectTab = (tab: PlayersTab) => {
        triggerHaptic(10);
        if (tab === 'online') {
            setWhoLines?.([]);
            executeCommand('who', true, true, false, true);
        } else if (tab === 'nearby') {
            refreshNearby();
        }
        setPlayersTab(tab);
    };

    const tabs = ['online', 'nearby', 'group'] as PlayersTab[];
    const activeIndex = tabs.indexOf(playersTab);

    return (
        <aside className={`players-panel${showChatWindow ? ' with-chat' : ''}`} aria-label="Players panel">
            {!viewport?.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-players-width" minWidth={15} maxWidth={60} />}
            <div className="players-panel-header">
                <span>Players</span>
            </div>
            <DrawerTabBar
                tabs={[{ id: 'online', label: 'Online' }, { id: 'nearby', label: 'Nearby' }, { id: 'group', label: 'Group' }]}
                active={playersTab}
                onChange={(id) => selectTab(id as PlayersTab)}
            />
            <div className="players-panel-viewport">
                <div
                    className="players-panel-track"
                    style={{ transform: `translateX(-${activeIndex * (100 / 3)}%)` }}
                >
                    <div className="players-panel-slide">
                        <UnifiedView
                            lines={whoLines}
                            category="inline-player"
                            emptyMessage="No player data. Tap refresh to update."
                            onRefresh={() => { triggerHaptic(15); setWhoLines?.([]); executeCommand('who', true, true, false, true); }}
                        />
                    </div>
                    <div className="players-panel-slide">
                        <NearbyWhereView
                            lines={whereLines}
                            onRefresh={() => { triggerHaptic(15); refreshNearby(); }}
                        />
                    </div>
                    <div className="players-panel-slide">
                        <GroupTableView members={groupMembers} />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default React.memo(PlayersPanel);
