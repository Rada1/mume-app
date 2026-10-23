/** @file Compact room and exit flag editor below the attribute summary. */
import React from 'react';
import { X } from 'lucide-react';
import type { useRoomInfoCard } from '../../hooks/useRoomInfoCard';
import './RoomMapFlagsEditor.css';

// --- Flag Editing View ---
export const RoomMapFlagsEditor = ({ editor }: { editor: ReturnType<typeof useRoomInfoCard> }) => {
    if (!editor.flagsEditing) return null;
    const flags = editor.flagEditor;
    return <section id="room-info-flag-editor" className="room-map-flags">
        <label>Room flags<select aria-label="Add room flag" value="" onChange={event => flags.changeRoomFlag(event.target.value)}>
            <option value="" disabled>Add flag…</option>
            {[...new Set(flags.roomOptions.map(option => option.group))].map(group => <optgroup key={group} label={group}>
                {flags.roomOptions.filter(option => option.group === group).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </optgroup>)}
        </select></label>
        <div className="room-map-flag-chips">
            {flags.selectedRoom.map(option => <button type="button" key={option.id} aria-label={`Remove ${option.label}`}
                onClick={() => flags.changeRoomFlag(option.id, true)}>{option.label}<X size={10} /></button>)}
        </div>
        {!!flags.directions.length && <>
            <div className="room-map-exit-controls"><label>Exit<select aria-label="Exit direction" value={flags.direction} onChange={event => flags.setDirection(event.target.value)}>
                {flags.directions.map(direction => <option key={direction} value={direction}>{direction.toUpperCase()}</option>)}
            </select></label>
            <label>Exit flags<select aria-label="Add exit flag" value="" onChange={event => flags.changeExitFlag(event.target.value)}>
                <option value="" disabled>Add flag…</option>
                {['Exit flags', 'Door flags'].map(group => <optgroup key={group} label={group}>
                    {flags.exitOptions.filter(option => option.group === group).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </optgroup>)}
            </select></label></div>
            <div className="room-map-flag-chips">
                {flags.selectedExit.map(option => <button type="button" key={option.id} aria-label={`Remove ${option.label} from ${flags.direction}`}
                    onClick={() => flags.changeExitFlag(option.id, true)}>{option.label}<X size={10} /></button>)}
            </div>
        </>}
    </section>;
};
