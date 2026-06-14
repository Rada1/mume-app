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
    const baseSize = showExits ? SHAPER_TILE : SHAPER_CELL;
    const scale = isAbove ? 1.12 : 0.84;
    const size = baseSize * scale;
    const baseLeft = showExits ? room.x * SHAPER_CELL + SHAPER_GUTTER : room.x * SHAPER_CELL;
    const baseTop = showExits ? room.y * SHAPER_CELL + SHAPER_GUTTER : room.y * SHAPER_CELL;
    const centerOffset = (baseSize - size) / 2;
    const tileStyle: CSSProperties = {
        left: baseLeft + centerOffset + (isAbove ? 14 : -14),
        top: baseTop + centerOffset + (isAbove ? -14 : 14),
        width: size,
        height: size,
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
