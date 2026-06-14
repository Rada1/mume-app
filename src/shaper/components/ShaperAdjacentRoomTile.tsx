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
    linkedToActiveLayer: boolean;
}

// --- Component Section ---
export const ShaperAdjacentRoomTile: React.FC<ShaperAdjacentRoomTileProps> = ({ room, viewZ, showExits, linkedToActiveLayer }) => {
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
            {!showExits && linkedToActiveLayer && (
                <svg className="shaper-vert-link" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1={18} y1={18} x2={82} y2={82} stroke="rgba(148, 163, 184, 0.8)" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                </svg>
            )}
            <span className="shaper-room-number">{room.roomNumber}</span>
            <span className="shaper-room-name-adjacent">
                {room.name ? `[${room.name}]` : `[Room ${room.roomNumber}]`}
            </span>
        </div>
    );
};
