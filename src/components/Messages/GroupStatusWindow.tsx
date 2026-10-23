/**
 * @file GroupStatusWindow.tsx
 * @description Docked terminal panel showing group members and live status values.
 */

// --- Logic Section ---
import React from 'react';
import { Crosshair, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useRoomEntitiesPanel } from '../../hooks/useRoomEntitiesPanel';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { GroupTableView } from '../Drawers/GroupTableView';
import './GroupStatusWindow.css';

// --- UI Section ---
const GroupStatusWindow: React.FC<{ style?: React.CSSProperties; mapOverlay?: boolean; stacked?: boolean }> = ({ style, mapOverlay = false, stacked = false }) => {
    const { viewport } = useGame();
    const entities = useRoomEntitiesPanel();

    const setShowGroupPanel = useSettingsStore(state => state.setShowGroupPanel);
    const { members } = entities;

    return (
        <aside className={`docked-panel group-status-panel${stacked ? ' client-panel-stack-item' : mapOverlay ? ' group-status-panel--map-overlay' : ' group-status-panel--client-corner'}`} style={style} aria-label="Room entities and group">
            <header className="group-status-header popover-inspection-panel-heading">
                <span className="client-panel-heading-label">ENTITIES</span>
                <div className="group-status-header-actions">
                    <span>{entities.entries.length} in room</span>
                    <button type="button" onClick={() => setShowGroupPanel(false)} aria-label="Close entities panel"><X size={14} /></button>
                </div>
            </header>
            <div className="room-entities-panel-content">
                <section aria-label="Group members">
                    <h3 className="room-entities-section-heading">Group members</h3>
                    {members.length ? <GroupTableView members={members} compact={mapOverlay || Boolean(viewport?.isMobile)} onSelectMember={entities.selectMember} />
                        : <p className="room-entities-empty">No group members.</p>}
                </section>
                <section aria-label="Room players and NPCs">
                    <h3 className="room-entities-section-heading">Room players and NPCs</h3>
                    {entities.otherEntities.map(entry => <button type="button" key={entry.id} className={`room-entity-target${entities.isTargeted(entry) ? ' is-targeted' : ''}`}
                        aria-pressed={entities.isSelected(entry)} onClick={() => entities.select(entry)} title={entry.label}>
                        <span style={{ color: entities.colorFor(entry.category) }}>{entry.label}</span>
                        {entities.isTargeted(entry) ? <span className="room-entity-target-indicator"><Crosshair size={14} aria-hidden="true" /><small>Target</small></span>
                            : entities.isSelected(entry) && <small>Selected</small>}
                    </button>)}
                    {!entities.otherEntities.length && <p className="room-entities-empty">No other players or NPCs in the room.</p>}
                </section>
            </div>
        </aside>
    );
};

export default React.memo(GroupStatusWindow);
