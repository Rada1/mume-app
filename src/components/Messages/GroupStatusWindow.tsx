/**
 * @file GroupStatusWindow.tsx
 * @description Docked terminal panel showing group members and live status values.
 */

// --- Logic Section ---
import React from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveCombat } from '../../stores/useActiveGameState';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { GroupTableView } from '../Drawers/GroupTableView';
import './GroupStatusWindow.css';

// --- UI Section ---
const GroupStatusWindow: React.FC<{ style?: React.CSSProperties; mapOverlay?: boolean }> = ({ style, mapOverlay = false }) => {
    const { viewport } = useGame();
    const { groupMembers } = useActiveCombat();
    const usePanelBlur = useSettingsStore(state => state.useTacticalPanelBlur);

    const setShowGroupPanel = useSettingsStore(state => state.setShowGroupPanel);
    const isPanelBlurred = Boolean(usePanelBlur);
    const members = groupMembers || [];

    return (
        <aside className={`docked-panel group-status-panel${mapOverlay ? ' group-status-panel--map-overlay' : ''}${viewport?.isMobile && !mapOverlay ? ' group-status-panel--mobile-inline' : ''}${isPanelBlurred ? ' group-status-panel--blurred' : ''}`} style={style} aria-label="Group status">
            {!viewport?.isMobile && !mapOverlay && <DrawerResizeHandle handleType="left" widthVar="--desktop-group-width" minWidth={20} maxWidth={60} />}
            <header className="group-status-header">
                <span><span aria-hidden="true">&gt; </span>group</span>
                <div className="group-status-header-actions">
                    <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                    <button type="button" onClick={() => setShowGroupPanel(false)} aria-label="Close group status"><X size={14} /></button>
                </div>
            </header>
            <GroupTableView members={members} compact={mapOverlay || Boolean(viewport?.isMobile)} />
        </aside>
    );
};

export default React.memo(GroupStatusWindow);
