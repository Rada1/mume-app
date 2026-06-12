/**
 * @file ShaperAdjacentRoomTile.tsx
 * @description Ghost tile for rooms on adjacent Shaper Z layers.
 */

import type { CSSProperties } from 'react';
import { SHAPER_CELL, SHAPER_GUTTER, SHAPER_TILE } from '../hooks/useShaperCanvasView';
import type { ShaperRoomDraft } from '../model/shaperTypes';

interface ShaperAdjacentRoomTileProps {
    room: ShaperRoomDraft;
    viewZ: number;
    showExits: boolean;
}

// --- Component Section ---
export const ShaperAdjacentRoomTile: React.FC<ShaperAdjacentRoomTileProps> = ({ room, viewZ, showExits }) => {
    const isAbove = room.z > viewZ;
    const tileStyle: CSSProperties = {
        left: (showExits ? room.x * SHAPER_CELL + SHAPER_GUTTER : room.x * SHAPER_CELL) + (isAbove ? 14 : -14),
        top: (showExits ? room.y * SHAPER_CELL + SHAPER_GUTTER : room.y * SHAPER_CELL) + (isAbove ? -14 : 14),
        width: showExits ? SHAPER_TILE : SHAPER_CELL,
        height: showExits ? SHAPER_TILE : SHAPER_CELL,
        pointerEvents: 'none'
    };

    return (
        <div style={tileStyle} className={`shaper-room-tile-adjacent ${isAbove ? 'above' : 'below'}`}>
            <span className="shaper-room-number">{room.roomNumber}</span>
            <span className="shaper-room-name-adjacent">
                {room.name ? `[${room.name}]` : `[Room ${room.roomNumber}]`}
            </span>
        </div>
    );
};
