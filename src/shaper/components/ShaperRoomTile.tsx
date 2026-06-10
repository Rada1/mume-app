/**
 * @file ShaperRoomTile.tsx
 * @description Renders one editable Shaper room tile with map-native terrain art.
 */

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { SHAPER_CELL, SHAPER_GUTTER, SHAPER_TILE } from '../hooks/useShaperCanvasView';
import type { ShaperCommandNode, ShaperDirection, ShaperRoomDraft } from '../model/shaperTypes';
import type { ShaperConnectionDragState } from './ShaperCanvasGeometry';
import { ShaperRoomTileBadges } from './ShaperRoomTileBadges';
import { getShaperTerrainColor, getShaperTerrainTile, shaperTileVariant } from './shaperTerrainTile';

interface ShaperRoomTileProps {
    room: ShaperRoomDraft;
    commandNodes: Record<string, ShaperCommandNode>;
    selected: boolean;
    dragging: boolean;
    dragOffset: { dx: number; dy: number } | null;
    zoom: number;
    showExits: boolean;
    showNodes: boolean;
    connectionDrag: ShaperConnectionDragState | null;
    onTilePointerDown: (event: ReactPointerEvent<HTMLDivElement>, room: ShaperRoomDraft) => void;
    onTilePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onTilePointerUp: (event: ReactPointerEvent<HTMLDivElement>, room: ShaperRoomDraft) => void;
    onNodePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, roomId: string, dir: ShaperDirection) => void;
    onNodePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onNodePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

const directions: ShaperDirection[] = ['n', 'e', 's', 'w', 'u', 'd'];

// --- Component Section ---
export const ShaperRoomTile: React.FC<ShaperRoomTileProps> = ({
    room,
    commandNodes,
    selected,
    dragging,
    dragOffset,
    zoom,
    showExits,
    showNodes,
    connectionDrag,
    onTilePointerDown,
    onTilePointerMove,
    onTilePointerUp,
    onNodePointerDown,
    onNodePointerMove,
    onNodePointerUp
}) => {
    const terrainBg = room.inactive ? null : getShaperTerrainTile(room.sector, shaperTileVariant(room.x, room.y));
    const terrainColor = room.inactive ? undefined : getShaperTerrainColor(room.sector);
    const tileStyle: CSSProperties = {
        left: showExits ? room.x * SHAPER_CELL + SHAPER_GUTTER : room.x * SHAPER_CELL,
        top: showExits ? room.y * SHAPER_CELL + SHAPER_GUTTER : room.y * SHAPER_CELL,
        width: showExits ? SHAPER_TILE : SHAPER_CELL,
        height: showExits ? SHAPER_TILE : SHAPER_CELL,
        transform: dragging && dragOffset ? `translate(${dragOffset.dx / zoom}px, ${dragOffset.dy / zoom}px)` : undefined,
        zIndex: dragging ? 5 : undefined,
        backgroundColor: terrainColor,
        backgroundImage: terrainBg ? `url(${terrainBg})` : undefined,
        backgroundSize: terrainBg ? 'cover' : undefined,
        backgroundPosition: terrainBg ? 'center' : undefined
    };

    return (
        <div
            style={tileStyle}
            className={`shaper-room-tile sector-${room.sector || 'unset'} ${terrainBg ? 'has-terrain' : ''} ${selected ? 'selected' : ''} ${room.name ? 'named' : ''} ${dragging ? 'dragging' : ''} ${room.inactive ? 'inactive' : ''} ${!showExits ? 'expanded' : ''}`}
            onPointerDown={event => onTilePointerDown(event, room)}
            onPointerMove={onTilePointerMove}
            onPointerUp={event => onTilePointerUp(event, room)}
        >
            <span className="shaper-room-number">{room.roomNumber}</span>
            <span className="shaper-room-name">{room.inactive ? '(inactive)' : (room.name || 'Draft room')}</span>
            {!room.inactive && <span className="shaper-room-sector">{room.sector || 'unset'}</span>}
            {!room.inactive && <ShaperRoomTileBadges room={room} commandNodes={commandNodes} />}
            {showNodes && showExits && !room.inactive && directions.map(dir => (
                <button
                    key={dir}
                    type="button"
                    className={`shaper-node node-${dir} ${connectionDrag?.hoveredTarget?.roomId === room.id && connectionDrag.hoveredTarget.dir === dir ? 'hovered-target' : ''}`}
                    data-shaper-node
                    data-room-id={room.id}
                    data-dir={dir}
                    onPointerDown={event => onNodePointerDown(event, room.id, dir)}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                    title={`Connection node: ${dir.toUpperCase()}`}
                >
                    {dir.toUpperCase()}
                </button>
            ))}
        </div>
    );
};
