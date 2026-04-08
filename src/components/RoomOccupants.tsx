/**
 * @file RoomOccupants.tsx
 * @description Displays real-time lists of players, NPCs, and items currently in the room.
 */

import React, { useMemo } from 'react';
import { useGame, useUI } from '../context/GameContext';
import { Users, Ghost, Package } from 'lucide-react';
import './RoomOccupants.css';

const OccupantTag = ({ 
    name, 
    type, 
    id, 
    onAction 
}: { 
    name: string; 
    type: 'player' | 'npc' | 'item'; 
    id?: string | number;
    onAction: (e: React.MouseEvent) => void;
}) => {
    const colorClass = `occupant-tag-${type}`;
    const Icon = type === 'player' ? Users : (type === 'npc' ? Ghost : Package);

    return (
        <div 
            className={`occupant-tag inline-btn ${colorClass}`}
            onClick={onAction}
            title={`${type}: ${name}`}
        >
            <Icon size={12} className="occupant-icon" />
            <span className="occupant-name">{name}</span>
        </div>
    );
};

export const RoomOccupants: React.FC = () => {
    const { 
        roomPlayers, 
        roomNpcs, 
        roomItems, 
        handleButtonClick,
        entities 
    } = useGame();

    const { setPopoverState } = useUI();

    const handleTagClick = (e: React.MouseEvent, id: string | number, name: string, type: string) => {
        e.stopPropagation();
        
        // Find entity in registry if it exists
        const entityId = String(id).includes(':') ? String(id) : `${type === 'player' ? 'roomplayers' : (type === 'npc' ? 'roomnpcs' : 'roomitems')}:${name}`;
        const entity = entities[entityId];

        // Trigger interaction menu/popover by simulating a button click for this entity
        if (handleButtonClick) {
            handleButtonClick(
                { id: entityId, label: name, command: name, display: 'inline' } as any, 
                e, 
                undefined, 
                type === 'item', 
                undefined
            );
        }
    };

    if (roomPlayers.length === 0 && roomNpcs.length === 0 && roomItems.length === 0) {
        return null;
    }

    return (
        <div className="room-occupants-container">
            {roomPlayers.length > 0 && (
                <div className="occupants-group">
                    {roomPlayers.map((p, idx) => (
                        <OccupantTag 
                            key={`p-${p.id || p.name}-${idx}`} 
                            name={p.name || p.short || ''} 
                            type="player" 
                            id={p.id}
                            onAction={(e) => handleTagClick(e, p.id || p.name || '', p.name || p.short || '', 'player')}
                        />
                    ))}
                </div>
            )}
            
            {roomNpcs.length > 0 && (
                <div className="occupants-group">
                    {roomNpcs.map((n, idx) => (
                        <OccupantTag 
                            key={`n-${n.id || n.name}-${idx}`} 
                            name={n.name || n.short || ''} 
                            type="npc" 
                            id={n.id}
                            onAction={(e) => handleTagClick(e, n.id || n.name || '', n.name || n.short || '', 'npc')}
                        />
                    ))}
                </div>
            )}

            {roomItems.length > 0 && (
                <div className="occupants-group">
                    {roomItems.map((i, idx) => (
                        <OccupantTag 
                            key={`i-${i.id || i.name}-${idx}`} 
                            name={i.name || i.short || ''} 
                            type="item" 
                            id={i.id}
                            onAction={(e) => handleTagClick(e, i.id || i.name || '', i.name || i.short || '', 'item')}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(RoomOccupants);
