/**
 * @file ShaperRoomTile.tsx
 * @description Renders one editable Shaper room tile with map-native terrain art.
 */

import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { SHAPER_CELL, SHAPER_GUTTER, SHAPER_TILE } from '../hooks/useShaperCanvasView';
import type { ShaperCommandNode, ShaperConnectionSelection, ShaperDirection, ShaperExitDraft, ShaperLibraryInstall, ShaperRoomDraft } from '../model/shaperTypes';
import type { ShaperConnectionDragState } from './ShaperCanvasGeometry';
import { ShaperRoomTileBadges } from './ShaperRoomTileBadges';
import { getShaperDoorTile, getShaperTerrainTile } from './shaperTerrainTile';
import { listShaperComRoomEntities } from '../model/shaperComCommands';
import { hasShaperExitClimb, hasShaperExitDoor, hasShaperExitFlag } from '../model/shaperExitFlags';
import { ROAD_COLOR_DARK, PATH_COLOR_DARK } from '../../components/Mapper/mapperUtils';
import type { ShaperHoverContent } from './ShaperHoverCard';
import './ShaperExitSelection.css';
type PathDir = 'n' | 'e' | 's' | 'w';
type PathKind = 'road' | 'trail';
const DIR_DELTAS: Record<PathDir, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const DIR_OPPOSITE: Record<ShaperDirection, ShaperDirection> = { n: 's', e: 'w', s: 'n', w: 'e', u: 'd', d: 'u' };
const DIR_EDGE: Record<PathDir, [number, number]> = { n: [50, 0], e: [100, 50], s: [50, 100], w: [0, 50] };
const pathCardinals: PathDir[] = ['n', 'e', 's', 'w'];
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
    selectedConnectionIds?: Set<string>;
    onSelectConnection?: (conn: ShaperConnectionSelection | null) => void;
    showComOverlay?: boolean;
    playerRoomNum?: number | string | null;
    playerMapId?: number | string | null;
}
const directions: ShaperDirection[] = ['n', 'e', 's', 'w', 'u', 'd'];
const buildExitConnectionSelection = (
    exit: ShaperExitDraft,
    exits: Record<string, ShaperExitDraft>
): ShaperConnectionSelection | null => {
    if (!exit.toRoomId) return null;
    let dirBA = DIR_OPPOSITE[exit.direction];
    for (const dir of directions) {
        if (exits[`${exit.toRoomId}:${dir}`]?.toRoomId === exit.fromRoomId) {
            dirBA = dir;
            break;
        }
    }
    return { aId: exit.fromRoomId, bId: exit.toRoomId, dirAB: exit.direction, dirBA };
};
const selectExitConnection = (
    event: ReactPointerEvent<HTMLElement>,
    exit: ShaperExitDraft,
    exits: Record<string, ShaperExitDraft>,
    onSelectConnection?: (conn: ShaperConnectionSelection | null) => void
) => {
    if (!onSelectConnection) return;
    const selection = buildExitConnectionSelection(exit, exits);
    if (!selection) return;
    event.stopPropagation();
    onSelectConnection(selection);
};
const stopExitPointer = (event: ReactPointerEvent<HTMLElement>) => event.stopPropagation();
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
    selectedConnectionIds,
    onSelectConnection,
    showComOverlay = false,
    playerRoomNum,
    playerMapId
}) => {
    const roomExits = Object.values(exits).filter(exit => exit.fromRoomId === room.id);
    const isPlayerHere = !!(
        (room.mapId && playerMapId && String(room.mapId) === String(playerMapId)) ||
        (!room.mapId && room.roomNumber && String(playerRoomNum) === room.roomNumber)
    );
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
        zIndex: dragging ? 15 : (isPlayerHere ? 13 : (selected ? 11 : undefined)),
        backgroundImage: backgroundImages.length > 0 ? backgroundImages.join(', ') : undefined,
        backgroundSize: backgroundImages.length > 0 ? backgroundImages.map(() => 'cover').join(', ') : undefined,
        backgroundPosition: backgroundImages.length > 0 ? backgroundImages.map(() => 'center').join(', ') : undefined
    };

    const entities = listShaperComRoomEntities(commandNodes, room.id);
    const hasResets = entities.mobs.length > 0 || entities.objects.length > 0;
    const isVerticalExit = (exit: ShaperExitDraft) => exit.direction === 'u' || exit.direction === 'd';
    // Cardinal doors/climbs keep the edge frame; up/down render as ▲/▼ markers like the live map.
    const doorExits = roomExits.filter(exit => !isVerticalExit(exit) && (hasShaperExitDoor(exit) || hasShaperExitClimb(exit)));
    const verticalExits = roomExits.filter(exit => isVerticalExit(exit) && (exit.toRoomId || hasShaperExitDoor(exit) || hasShaperExitClimb(exit)));
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
            {isPlayerHere && (
                <div className="shaper-player-presence" title="You are here">
                    {['tl', 'tr', 'bl', 'br'].map(corner => <div key={corner} className={`shaper-player-presence-corner ${corner}`} />)}
                </div>
            )}
            {room.inactive && <span className="shaper-room-name">(inactive)</span>}
            {!room.inactive && <span className="shaper-room-sector">{room.sector || 'unset'}</span>}
            {!room.inactive && doorExits.map(exit => {
                const isClimb = hasShaperExitClimb(exit);
                const hasDoor = hasShaperExitDoor(exit);
                if (isClimb && !hasDoor) {
                    return (
                        <span
                            key={`${exit.id}:climb`}
                            className={`shaper-mmapper-door door-${exit.direction}${selectedConnectionIds?.has(exit.id) ? ' selected' : ''}`}
                            style={{ backgroundImage: `url(${getShaperDoorTile(exit.direction, true)})` }}
                            title={`Climb ${exit.direction.toUpperCase()}`}
                            onPointerDown={event => selectExitConnection(event, exit, exits, onSelectConnection)}
                            onPointerUp={stopExitPointer}
                        />
                    );
                }
                const isDoorSelected = !!selectedConnectionIds?.has(exit.id);
                return (
                    <span
                        key={`${exit.id}:door`}
                        className={`shaper-door-frame door-${exit.direction}${isDoorSelected ? ' selected' : ''}`}
                        title={`Door ${exit.direction.toUpperCase()}`}
                        onMouseMove={event => { event.stopPropagation(); onHover?.({ kind: 'door', exit }, event); }}
                        onPointerDown={event => selectExitConnection(event, exit, exits, onSelectConnection)}
                        onPointerUp={stopExitPointer}
                    >
                        <span className="shaper-door-post post-a" />
                        <span className="shaper-door-bar" />
                        <span className="shaper-door-post post-b" />
                    </span>
                );
            })}
            {!room.inactive && verticalExits.map(exit => {
                const isClimb = hasShaperExitClimb(exit);
                const hasDoor = hasShaperExitDoor(exit);
                if (isClimb && !hasDoor) {
                    return (
                        <span
                            key={`${exit.id}:climb`}
                            className={`shaper-mmapper-door door-${exit.direction}${selectedConnectionIds?.has(exit.id) ? ' selected' : ''}`}
                            style={{ backgroundImage: `url(${getShaperDoorTile(exit.direction, true)})` }}
                            title={`Climb ${exit.direction.toUpperCase()}`}
                            onPointerDown={event => selectExitConnection(event, exit, exits, onSelectConnection)}
                            onPointerUp={stopExitPointer}
                        />
                    );
                }
                const isUp = exit.direction === 'u';
                const isClosed = hasShaperExitFlag(exit, 'closed');
                const fill = hasDoor ? (isClosed ? '#ffcc00' : 'none') : 'rgba(148, 163, 184, 0.95)';
                const stroke = hasDoor && !isClosed ? '#ffcc00' : 'none';
                const isSelected = !!selectedConnectionIds?.has(exit.id);
                return (
                    <span
                        key={`${exit.id}:vert`}
                        className={`shaper-vert-exit dir-${exit.direction}${isSelected ? ' selected' : ''}`}
                        title={`${hasDoor ? 'Door' : 'Exit'} ${isUp ? 'Up' : 'Down'}`}
                        onMouseMove={hasDoor ? (event => { event.stopPropagation(); onHover?.({ kind: 'door', exit }, event); }) : undefined}
                        onPointerDown={event => selectExitConnection(event, exit, exits, onSelectConnection)}
                        onPointerUp={stopExitPointer}
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
            {showExits && !room.inactive && directions.map(dir => (
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
