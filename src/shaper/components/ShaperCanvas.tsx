/**
 * @file ShaperCanvas.tsx
 * @description Pan/zoom concept canvas for Shaper room placement and exits.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties, DragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { SHAPER_CELL, SHAPER_GUTTER, SHAPER_TILE, useShaperCanvasView } from '../hooks/useShaperCanvasView';
import type { ShaperCommandNode, ShaperDirection, ShaperExitDraft, ShaperLibraryInstall, ShaperRoomDraft, ShaperRoomId, ShaperConnectionSelection } from '../model/shaperTypes';
import { ShaperHoverCard, type ShaperHoverContent } from './ShaperHoverCard';
import { formatLayer, getNodePosition, type ShaperConnectionDragState, type ShaperRoomMenuState } from './ShaperCanvasGeometry';
import { ShaperAdjacentRoomTile } from './ShaperAdjacentRoomTile';
import { ShaperRoomContextMenu } from './ShaperCanvasMenus';
import { ShaperCanvasToolbar } from './ShaperCanvasToolbar';
import { ShaperConnectionLayer } from './ShaperConnectionLayer';
import { ShaperExtraRooms } from './ShaperExtraRooms';
import { ShaperRoomTile } from './ShaperRoomTile';
import { useShaperTerrainAssets } from './shaperTerrainTile';
import './ShaperCanvas.css';
import './ShaperCanvasConnections.css';
import './ShaperTerrain.css';

interface ShaperCanvasProps {
    rooms: Record<ShaperRoomId, ShaperRoomDraft>;
    exits: Record<string, ShaperExitDraft>;
    commandNodes: Record<string, ShaperCommandNode>;
    libraries: Record<string, ShaperLibraryInstall>;
    selectedRoomId: ShaperRoomId;
    selectedRoomIds: Set<ShaperRoomId>;
    selectedConnection: ShaperConnectionSelection | null;
    selectedConnectionIds: Set<string>;
    onSelectConnection: (conn: ShaperConnectionSelection | null) => void;
    onToggleSelectConnection: (conn: ShaperConnectionSelection) => void;
    layers: number[];
    viewZ: number;
    onAddExtraRoom: () => void;
    onConnectDirectedExit: (fromRoomId: ShaperRoomId, toRoomId: ShaperRoomId, direction: ShaperDirection) => void;
    onToggleExitDoor: (fromRoomId: ShaperRoomId, direction: ShaperDirection) => void;
    onSelectRoom: (roomId: ShaperRoomId) => void;
    onToggleSelect: (roomId: ShaperRoomId) => void;
    onSelectEntity?: (roomId: ShaperRoomId, entityId: string) => void;
    onSetViewZ: (z: number) => void;
    onAddRoomAt: (x: number, y: number, z: number) => void;
    onMoveRoom: (roomId: ShaperRoomId, x: number, y: number, z: number) => void;
    onMoveRooms: (roomIds: ShaperRoomId[], dx: number, dy: number, z: number) => void;
    onRemoveRoom: (roomId: ShaperRoomId) => void;
    onRemoveRooms: (roomIds: ShaperRoomId[]) => void;
    showComOverlay?: boolean;
    onToggleComOverlay?: () => void;
}

interface DragState {
    roomId: ShaperRoomId;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    moved: boolean;
}
const DRAG_THRESHOLD = 5;
const EXTRA_ROOM_MIME = 'application/x-shaper-room';

// --- Component Section ---
export const ShaperCanvas: React.FC<ShaperCanvasProps> = ({
    rooms,
    exits,
    commandNodes,
    libraries,
    selectedRoomId,
    selectedRoomIds,
    selectedConnection,
    selectedConnectionIds,
    onSelectConnection,
    onToggleSelectConnection,
    layers,
    viewZ,
    onAddExtraRoom,
    onConnectDirectedExit,
    onToggleExitDoor,
    onSelectRoom,
    onToggleSelect,
    onSelectEntity,
    onSetViewZ,
    onAddRoomAt,
    onMoveRoom,
    onMoveRooms,
    onRemoveRoom,
    onRemoveRooms,
    showComOverlay = false,
    onToggleComOverlay
}) => {
    const view = useShaperCanvasView();
    // Re-render tiles when the terrain image assets finish loading.
    useShaperTerrainAssets();
    const [showExits, setShowExits] = useState(true);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [roomMenu, setRoomMenu] = useState<ShaperRoomMenuState | null>(null);
    const [connectionDrag, setConnectionDrag] = useState<ShaperConnectionDragState | null>(null);
    const [hoverCard, setHoverCard] = useState<{ content: ShaperHoverContent; x: number; y: number; flipX: boolean; flipY: boolean } | null>(null);

    const handleHover = useCallback((content: ShaperHoverContent, event: ReactMouseEvent) => {
        const rect = view.viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // Flip toward the cursor near the right/bottom edge so the card isn't clipped.
        setHoverCard({ content, x, y, flipX: x > rect.width - 300, flipY: y > rect.height - 160 });
    }, [view.viewportRef]);
    const handleHoverEnd = useCallback(() => setHoverCard(null), []);

    const gridRooms = useMemo(() => Object.values(rooms).filter(room =>
        room.z === viewZ && room.kind === 'grid' && !room.inactive), [rooms, viewZ]);
    const adjacentRooms = useMemo(() => {
        return Object.values(rooms).filter(room => 
            (room.z === viewZ - 1 || room.z === viewZ + 1) && room.kind === 'grid' && !room.inactive
        );
    }, [rooms, viewZ]);
    const activeLayerVerticalTargets = useMemo(() => new Set(Object.values(exits)
        .filter(exit => (exit.direction === 'u' || exit.direction === 'd') && rooms[exit.fromRoomId]?.z === viewZ && exit.toRoomId)
        .map(exit => exit.toRoomId as string)), [exits, rooms, viewZ]);
    const extraRooms = useMemo(() => Object.values(rooms).filter(room => room.kind === 'extra' && !room.inactive), [rooms]);
    const roomByCell = useMemo(() => {
        const map = new Map<string, ShaperRoomDraft>();
        for (const room of gridRooms) map.set(`${room.x},${room.y}`, room);
        return map;
    }, [gridRooms]);

    const groupDragIds = drag && selectedRoomIds.has(drag.roomId) && selectedRoomIds.size > 1
        ? selectedRoomIds
        : null;
    const screenToWorld = useCallback((clientX: number, clientY: number) => {
        const rect = view.viewportRef.current?.getBoundingClientRect();
        return {
            x: (clientX - (rect?.left ?? 0) - view.camera.x) / view.camera.zoom,
            y: (clientY - (rect?.top ?? 0) - view.camera.y) / view.camera.zoom
        };
    }, [view.camera, view.viewportRef]);
    // --- Connection Node Section ---
    const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, roomId: ShaperRoomId, dir: ShaperDirection) => {
        event.stopPropagation();
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* best effort */ }
        setConnectionDrag({ sourceRoomId: roomId, sourceDir: dir, currentPos: screenToWorld(event.clientX, event.clientY), hoveredTarget: null });
    };
    const readTargetNode = (clientX: number, clientY: number) => {
        const targetNode = document.elementFromPoint(clientX, clientY)?.closest('[data-shaper-node]');
        if (!targetNode) return null;
        return {
            roomId: targetNode.getAttribute('data-room-id') ?? '',
            dir: targetNode.getAttribute('data-dir') as ShaperDirection
        };
    };
    const handleNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!connectionDrag) return;
        let worldPos = screenToWorld(event.clientX, event.clientY);
        let hoveredTarget: ShaperConnectionDragState['hoveredTarget'] = null;
        const target = readTargetNode(event.clientX, event.clientY);
        if (target && target.roomId !== connectionDrag.sourceRoomId) {
            hoveredTarget = target;
            const targetRoom = rooms[target.roomId];
            if (targetRoom) worldPos = getNodePosition(targetRoom.x, targetRoom.y, target.dir);
        }
        setConnectionDrag(current => current ? { ...current, currentPos: worldPos, hoveredTarget } : null);
    };
    const handleNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!connectionDrag) return;
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* best effort */ }
        const target = connectionDrag.hoveredTarget ?? readTargetNode(event.clientX, event.clientY);
        if (target && target.roomId !== connectionDrag.sourceRoomId) {
            onConnectDirectedExit(connectionDrag.sourceRoomId, target.roomId, connectionDrag.sourceDir);
        }
        setConnectionDrag(null);
    };
    // --- Room Drag Section ---
    const handleTilePointerDown = (event: ReactPointerEvent<HTMLDivElement>, room: ShaperRoomDraft) => {
        event.stopPropagation();
        if (event.button !== 0) return;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* best effort */ }
        setDrag({ roomId: room.id, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false });
    };
    const handleTilePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        setDrag(current => {
            if (!current) return current;
            const dx = event.clientX - current.startX;
            const dy = event.clientY - current.startY;
            return { ...current, dx, dy, moved: current.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD };
        });
    };
    const handleTilePointerUp = (event: ReactPointerEvent<HTMLDivElement>, room: ShaperRoomDraft) => {
        event.stopPropagation();
        if (event.button !== 0) return;
        if (drag?.roomId === room.id && drag.moved) {
            const cell = view.screenToCell(event.clientX, event.clientY);
            if (groupDragIds) onMoveRooms([...groupDragIds], cell.x - room.x, cell.y - room.y, viewZ);
            else onMoveRoom(room.id, cell.x, cell.y, viewZ);
        } else if (event.shiftKey) {
            onToggleSelect(room.id);
        } else {
            onSelectRoom(room.id);
        }
        setDrag(null);
    };
    // --- Viewport Section ---
    const openContextMenu = (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const cell = view.screenToCell(event.clientX, event.clientY);
        const room = roomByCell.get(`${cell.x},${cell.y}`);
        if (room && !selectedRoomIds.has(room.id)) onSelectRoom(room.id);
        setRoomMenu({ screenX: event.clientX, screenY: event.clientY, cellX: cell.x, cellY: cell.y, roomId: room?.id ?? null });
    };
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const roomId = event.dataTransfer.getData(EXTRA_ROOM_MIME);
        if (!roomId) return;
        const cell = view.screenToCell(event.clientX, event.clientY);
        onMoveRoom(roomId, cell.x, cell.y, viewZ);
    };
    const worldStyle: CSSProperties = {
        transform: `translate(${view.camera.x}px, ${view.camera.y}px) scale(${view.camera.zoom})`
    };
    const gridStyle: CSSProperties = {
        backgroundSize: `${SHAPER_CELL * view.camera.zoom}px ${SHAPER_CELL * view.camera.zoom}px`,
        backgroundPosition: `${view.camera.x}px ${view.camera.y}px`
    };

    return (
        <div className="shaper-canvas-shell">
            <ShaperCanvasToolbar
                layers={layers}
                viewZ={viewZ}
                showExits={showExits}
                onAddExtraRoom={onAddExtraRoom}
                onSetViewZ={onSetViewZ}
                onSetShowExits={setShowExits}
                onResetCamera={view.resetCamera}
                showComOverlay={showComOverlay}
                onToggleComOverlay={onToggleComOverlay}
            />

            <div
                ref={view.viewportRef}
                className={`shaper-canvas-viewport ${view.isPanning ? 'panning' : ''}`}
                aria-label={`${formatLayer(viewZ)} concept zone grid`}
                onWheel={view.handleWheel}
                onPointerDown={event => { setRoomMenu(null); view.handlePanStart(event); }}
                onPointerMove={view.handlePanMove}
                onPointerUp={view.handlePanEnd}
                onContextMenu={openContextMenu}
                onDragOver={event => event.preventDefault()}
                onDrop={handleDrop}
            >
                <div className="shaper-grid-lines" style={gridStyle} />
                <div className="shaper-world" style={worldStyle}>
                    <ShaperConnectionLayer
                        rooms={rooms}
                        exits={exits}
                        viewZ={viewZ}
                        drag={connectionDrag}
                        selectedConnection={selectedConnection}
                        selectedConnectionIds={selectedConnectionIds}
                        onSelectConnection={onSelectConnection}
                        onToggleSelectConnection={onToggleSelectConnection}
                        showExits={showExits}
                    />
                    {adjacentRooms.map(room => (
                        <ShaperAdjacentRoomTile
                            key={room.id}
                            room={room}
                            viewZ={viewZ}
                            showExits={showExits}
                            linkedToActiveLayer={activeLayerVerticalTargets.has(room.id)}
                        />
                    ))}
                    {gridRooms.map(room => {
                        const dragging = !!drag && drag.moved && (drag.roomId === room.id || (!!groupDragIds && groupDragIds.has(room.id)));
                        const selected = room.id === selectedRoomId || selectedRoomIds.has(room.id);
                        return (
                            <ShaperRoomTile
                                key={room.id}
                                room={room}
                                rooms={rooms}
                                exits={exits}
                                commandNodes={commandNodes}
                                libraries={libraries}
                                selected={selected}
                                dragging={dragging}
                                dragOffset={dragging ? drag : null}
                                zoom={view.camera.zoom}
                                showExits={showExits}
                                connectionDrag={connectionDrag}
                                onTilePointerDown={handleTilePointerDown}
                                onTilePointerMove={handleTilePointerMove}
                                onTilePointerUp={handleTilePointerUp}
                                onNodePointerDown={handleNodePointerDown}
                                onNodePointerMove={handleNodePointerMove}
                                onNodePointerUp={handleNodePointerUp}
                                onHover={handleHover}
                                onHoverEnd={handleHoverEnd}
                                onSelectEntity={onSelectEntity}
                                showComOverlay={showComOverlay}
                            />
                        );
                    })}
                </div>

                {hoverCard && !drag && !view.isPanning && (
                    <div
                        className="shaper-hovercard"
                        style={{
                            left: hoverCard.x + (hoverCard.flipX ? -16 : 16),
                            top: hoverCard.y + (hoverCard.flipY ? -16 : 16),
                            transform: `translate(${hoverCard.flipX ? '-100%' : '0'}, ${hoverCard.flipY ? '-100%' : '0'})`
                        }}
                    >
                        <ShaperHoverCard content={hoverCard.content} libraries={libraries} />
                    </div>
                )}

                {roomMenu && (
                    <ShaperRoomContextMenu
                        menu={roomMenu}
                        viewport={view.viewportRef.current}
                        selectedRoomIds={selectedRoomIds}
                        viewZ={viewZ}
                        onAddRoomAt={onAddRoomAt}
                        onRemoveRoom={onRemoveRoom}
                        onRemoveRooms={onRemoveRooms}
                        onClose={() => setRoomMenu(null)}
                    />
                )}
            </div>

            <ShaperExtraRooms rooms={extraRooms} selectedRoomId={selectedRoomId} mimeType={EXTRA_ROOM_MIME} onSelectRoom={onSelectRoom} />
        </div>
    );
};
