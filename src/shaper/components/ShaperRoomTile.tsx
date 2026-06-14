/**
 * @file ShaperRoomTile.tsx
 * @description Renders one editable Shaper room tile with map-native terrain art.
 */

import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { SHAPER_CELL, SHAPER_GUTTER, SHAPER_TILE } from '../hooks/useShaperCanvasView';
import type { ShaperCommandNode, ShaperDirection, ShaperExitDraft, ShaperLibraryInstall, ShaperRoomDraft } from '../model/shaperTypes';
import type { ShaperConnectionDragState } from './ShaperCanvasGeometry';
import { ShaperRoomTileBadges } from './ShaperRoomTileBadges';
import { getShaperDoorTile, getShaperTerrainTile } from './shaperTerrainTile';
import { listShaperComRoomEntities } from '../model/shaperComCommands';
import { hasShaperExitClimb, hasShaperExitDoor, hasShaperExitFlag } from '../model/shaperExitFlags';
import { ROAD_COLOR_DARK, PATH_COLOR_DARK } from '../../components/Mapper/mapperUtils';
import type { ShaperHoverContent } from './ShaperHoverCard';

type PathDir = 'n' | 'e' | 's' | 'w';
type PathKind = 'road' | 'trail';

// Procedural road/trail path: mirrors the real map, which draws road segments
// from a room centre toward each connected road/trail neighbour (drawFeatures).
const DIR_DELTAS: Record<PathDir, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const DIR_OPPOSITE: Record<PathDir, PathDir> = { n: 's', e: 'w', s: 'n', w: 'e' };
// Edge midpoints inside the 0..100 tile viewBox the overlay renders into.
const DIR_EDGE: Record<PathDir, [number, number]> = { n: [50, 0], e: [100, 50], s: [50, 100], w: [0, 50] };
const pathCardinals: PathDir[] = ['n', 'e', 's', 'w'];

// Coordinate index is rebuilt only when the rooms object reference changes, so
// all tiles in a single render share one map instead of each scanning O(n).
let roadCoordCache: { rooms: unknown; map: Map<string, ShaperRoomDraft> } | null = null;
const getRoadCoordMap = (rooms: Record<string, ShaperRoomDraft>): Map<string, ShaperRoomDraft> => {
    if (roadCoordCache && roadCoordCache.rooms === rooms) return roadCoordCache.map;
    const map = new Map<string, ShaperRoomDraft>();
    for (const r of Object.values(rooms)) {
        if (r.kind === 'grid' && !r.inactive) map.set(`${r.x},${r.y},${r.z}`, r);
    }
    roadCoordCache = { rooms, map };
    return map;
};

const roomMatchesPathKind = (room: ShaperRoomDraft, kind: PathKind): boolean =>
    kind === 'road' ? room.sector === 'road' : (room.flags.includes('trail') || room.sector === 'road');

// Returns the cardinal directions in which this road/trail room is connected to
// a like neighbour, so the overlay can draw a segment toward each shared edge.
const getShaperRoadDirs = (
    room: ShaperRoomDraft,
    rooms: Record<string, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    kind: PathKind
): PathDir[] => {
    const coordMap = getRoadCoordMap(rooms);
    const dirs: PathDir[] = [];
    for (const d of pathCardinals) {
        const [dx, dy] = DIR_DELTAS[d];
        const neighbor = coordMap.get(`${room.x + dx},${room.y + dy},${room.z}`);
        if (!neighbor || !roomMatchesPathKind(neighbor, kind)) continue;
        const connected = exits[`${room.id}:${d}`]?.toRoomId === neighbor.id
            || exits[`${neighbor.id}:${DIR_OPPOSITE[d]}`]?.toRoomId === room.id;
        if (connected) dirs.push(d);
    }
    return dirs;
};

interface ShaperRoomTileProps {
    room: ShaperRoomDraft;
    rooms: Record<string, ShaperRoomDraft>;
    exits: Record<string, ShaperExitDraft>;
    commandNodes: Record<string, ShaperCommandNode>;
    libraries: Record<string, ShaperLibraryInstall>;
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
    onHover?: (content: ShaperHoverContent, event: ReactMouseEvent) => void;
    onHoverEnd?: () => void;
    onSelectEntity?: (roomId: string, entityId: string) => void;
    showComOverlay?: boolean;
}

const directions: ShaperDirection[] = ['n', 'e', 's', 'w', 'u', 'd'];

// --- Component Section ---
export const ShaperRoomTile: React.FC<ShaperRoomTileProps> = ({
    room,
    rooms,
    exits,
    commandNodes,
    libraries,
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
    onNodePointerUp,
    onHover,
    onHoverEnd,
    onSelectEntity,
    showComOverlay = false
}) => {
    const roomExits = Object.values(exits).filter(exit => exit.fromRoomId === room.id);
    const pathKind: PathKind | null = room.inactive
        ? null
        : (room.sector === 'road' ? 'road' : (room.flags.includes('trail') ? 'trail' : null));
    const roadDirs = pathKind ? getShaperRoadDirs(room, rooms, exits, pathKind) : [];
    const terrainBg = room.inactive ? null : getShaperTerrainTile(room.sector);
    const backgroundImages = [terrainBg].filter(Boolean).map(url => `url(${url})`);
    const tileStyle: CSSProperties = {
        left: showExits ? room.x * SHAPER_CELL + SHAPER_GUTTER : room.x * SHAPER_CELL,
        top: showExits ? room.y * SHAPER_CELL + SHAPER_GUTTER : room.y * SHAPER_CELL,
        width: showExits ? SHAPER_TILE : SHAPER_CELL,
        height: showExits ? SHAPER_TILE : SHAPER_CELL,
        transform: dragging && dragOffset ? `translate(${dragOffset.dx / zoom}px, ${dragOffset.dy / zoom}px)` : undefined,
        zIndex: dragging ? 5 : undefined,
        backgroundImage: backgroundImages.length > 0 ? backgroundImages.join(', ') : undefined,
        backgroundSize: backgroundImages.length > 0 ? backgroundImages.map(() => 'cover').join(', ') : undefined,
        backgroundPosition: backgroundImages.length > 0 ? backgroundImages.map(() => 'center').join(', ') : undefined
    };

    const entities = listShaperComRoomEntities(commandNodes, room.id);
    const hasResets = entities.mobs.length > 0 || entities.objects.length > 0;
    const isVerticalExit = (exit: ShaperExitDraft) => exit.direction === 'u' || exit.direction === 'd';
    // Cardinal doors/climbs keep the edge frame; up/down render as ▲/▼ markers like the live map.
    const doorExits = roomExits.filter(exit => !isVerticalExit(exit) && (hasShaperExitDoor(exit) || hasShaperExitClimb(exit)));
    const verticalExits = roomExits.filter(exit =>
        isVerticalExit(exit) && (exit.toRoomId || hasShaperExitDoor(exit) || hasShaperExitClimb(exit)));

    return (
        <div
            style={tileStyle}
            className={`shaper-room-tile sector-${room.sector || 'unset'} ${terrainBg ? 'has-terrain' : ''} ${selected ? 'selected' : ''} ${room.name ? 'named' : ''} ${dragging ? 'dragging' : ''} ${room.inactive ? 'inactive' : ''} ${!showExits ? 'expanded' : ''} ${showComOverlay && hasResets ? 'has-resets-overlay' : ''}`}
            onPointerDown={event => onTilePointerDown(event, room)}
            onPointerMove={onTilePointerMove}
            onPointerUp={event => onTilePointerUp(event, room)}
            onMouseEnter={event => onHover?.({ kind: 'room', room }, event)}
            onMouseMove={event => onHover?.({ kind: 'room', room }, event)}
            onMouseLeave={() => onHoverEnd?.()}
        >
            {pathKind && (
                <svg className="shaper-road-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <g stroke="#000000" strokeWidth={pathKind === 'road' ? 27 : 17} strokeLinecap="round" fill="none">
                        {roadDirs.map(d => (
                            <line key={`b-${d}`} x1={50} y1={50} x2={DIR_EDGE[d][0]} y2={DIR_EDGE[d][1]} />
                        ))}
                    </g>
                    <circle cx={50} cy={50} r={(pathKind === 'road' ? 27 : 17) / 2} fill="#000000" />
                    <g stroke={pathKind === 'road' ? ROAD_COLOR_DARK : PATH_COLOR_DARK} strokeWidth={pathKind === 'road' ? 22 : 12} strokeLinecap="round" fill="none">
                        {roadDirs.map(d => (
                            <line key={`f-${d}`} x1={50} y1={50} x2={DIR_EDGE[d][0]} y2={DIR_EDGE[d][1]} />
                        ))}
                    </g>
                    <circle cx={50} cy={50} r={(pathKind === 'road' ? 22 : 12) / 2} fill={pathKind === 'road' ? ROAD_COLOR_DARK : PATH_COLOR_DARK} />
                </svg>
            )}
            <span className="shaper-room-number">{room.roomNumber}</span>
            {room.inactive && <span className="shaper-room-name">(inactive)</span>}
            {!room.inactive && <span className="shaper-room-sector">{room.sector || 'unset'}</span>}
            {!room.inactive && doorExits.map(exit => {
                const isClimb = hasShaperExitClimb(exit);
                const hasDoor = hasShaperExitDoor(exit);
                if (isClimb && !hasDoor) {
                    return (
                        <span
                            key={`${exit.id}:climb`}
                            className={`shaper-mmapper-door door-${exit.direction}`}
                            style={{ backgroundImage: `url(${getShaperDoorTile(exit.direction, true)})` }}
                            title={`Climb ${exit.direction.toUpperCase()}`}
                        />
                    );
                }
                return (
                    <span
                        key={`${exit.id}:door`}
                        className={`shaper-door-frame door-${exit.direction}`}
                        title={`Door ${exit.direction.toUpperCase()}`}
                        onMouseMove={event => { event.stopPropagation(); onHover?.({ kind: 'door', exit }, event); }}
                    >
                        <span className="shaper-door-post post-a" />
                        <span className="shaper-door-bar" />
                        <span className="shaper-door-post post-b" />
                    </span>
                );
            })}
            {!room.inactive && !showExits && verticalExits.some(e => e.direction === 'u') && verticalExits.some(e => e.direction === 'd') && (
                <svg className="shaper-vert-link" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1={18} y1={18} x2={82} y2={82} stroke="rgba(148, 163, 184, 0.8)" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                </svg>
            )}
            {!room.inactive && verticalExits.map(exit => {
                const isClimb = hasShaperExitClimb(exit);
                const hasDoor = hasShaperExitDoor(exit);
                // Pure climb (no door) keeps its dedicated climb pixmap.
                if (isClimb && !hasDoor) {
                    return (
                        <span
                            key={`${exit.id}:climb`}
                            className={`shaper-mmapper-door door-${exit.direction}`}
                            style={{ backgroundImage: `url(${getShaperDoorTile(exit.direction, true)})` }}
                            title={`Climb ${exit.direction.toUpperCase()}`}
                        />
                    );
                }
                const isUp = exit.direction === 'u';
                const isClosed = hasShaperExitFlag(exit, 'closed');
                // Door: yellow (filled when closed, outline when open). Plain exit: solid grey.
                const fill = hasDoor ? (isClosed ? '#ffcc00' : 'none') : 'rgba(148, 163, 184, 0.95)';
                const stroke = hasDoor && !isClosed ? '#ffcc00' : 'none';
                return (
                    <span
                        key={`${exit.id}:vert`}
                        className={`shaper-vert-exit dir-${exit.direction}`}
                        title={`${hasDoor ? 'Door' : 'Exit'} ${isUp ? 'Up' : 'Down'}`}
                        onMouseMove={hasDoor ? (event => { event.stopPropagation(); onHover?.({ kind: 'door', exit }, event); }) : undefined}
                    >
                        <svg viewBox="0 0 10 10" aria-hidden="true">
                            <polygon
                                points={isUp ? '5,1 9,9 1,9' : '1,1 9,1 5,9'}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={1.8}
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                );
            })}
            {!room.inactive && (
                <ShaperRoomTileBadges
                    room={room}
                    commandNodes={commandNodes}
                    libraries={libraries}
                    showComOverlay={showComOverlay}
                    onHover={onHover}
                    onSelectEntity={onSelectEntity}
                />
            )}
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
