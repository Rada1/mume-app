/**
 * @file ShaperConnectionLayer.tsx
 * @description SVG rendering for Shaper room connections, labels, and active drags.
 */

import React, { useMemo } from 'react';
import type { ShaperDirection, ShaperExitDraft, ShaperRoomDraft, ShaperRoomId, ShaperConnectionSelection } from '../model/shaperTypes';
import {
    getNodePosition,
    getOffsetPoints,
    getOppositeDirection,
    type ShaperConnectionDragState,
    type ShaperPoint
} from './ShaperCanvasGeometry';
import { SHAPER_CELL } from '../hooks/useShaperCanvasView';
import { hasShaperExitClimb, hasShaperExitDoor } from '../model/shaperExitFlags';

interface ShaperConnectionLayerProps {
    rooms: Record<ShaperRoomId, ShaperRoomDraft>;
    exits: Record<string, ShaperExitDraft>;
    viewZ: number;
    drag: ShaperConnectionDragState | null;
    selectedConnection: ShaperConnectionSelection | null;
    selectedConnectionIds: Set<string>;
    onSelectConnection: (conn: ShaperConnectionSelection | null) => void;
    onToggleSelectConnection: (conn: ShaperConnectionSelection) => void;
    showExits: boolean;
}

interface RenderedExit {
    key: string;
    aId: ShaperRoomId;
    bId: ShaperRoomId;
    dirAB: ShaperDirection;
    dirBA: ShaperDirection;
    posA: ShaperPoint;
    posB: ShaperPoint;
    hasReverse: boolean;
    offset: number;
}

const directions: ShaperDirection[] = ['n', 'e', 's', 'w', 'u', 'd'];

// --- Render Helpers Section ---
const ClimbMark: React.FC<{ a: ShaperPoint; b: ShaperPoint }> = ({ a, b }) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const ux = dx / len;
    const uy = dy / len;

    const p0x = mx - px * 12;
    const p0y = my - py * 12;
    const p1x = mx - px * 6 + ux * 4;
    const p1y = my - py * 6 + uy * 4;
    const p2x = mx - ux * 4;
    const p2y = my - uy * 4;
    const p3x = mx + px * 6 + ux * 4;
    const p3y = my + py * 6 + uy * 4;
    const p4x = mx + px * 12;
    const p4y = my + py * 12;

    return (
        <path
            d={`M ${p0x},${p0y} L ${p1x},${p1y} L ${p2x},${p2y} L ${p3x},${p3y} L ${p4x},${p4y}`}
            stroke="#ef4444"
            strokeWidth={4.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    );
};

const ArrowLine: React.FC<{ a: ShaperPoint; b: ShaperPoint; isClimb: boolean; isSelected: boolean }> = ({ a, b, isClimb, isSelected }) => (
    <>
        <line
            className="shaper-connection-line"
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={isSelected ? '#38bdf8' : '#ffffff'}
            strokeWidth={isSelected ? 13 : 8}
            markerEnd={isSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
        />
        {isClimb && <ClimbMark a={a} b={b} />}
    </>
);

const ConnectionLabel: React.FC<{
    x: number;
    y: number;
    exitType?: string;
    doorName?: string;
    hasDoor?: boolean;
}> = ({ x, y, exitType, doorName, hasDoor }) => {
    const labelParts: string[] = [];
    if (exitType) {
        labelParts.push(exitType);
    }
    if (hasDoor) {
        labelParts.push(doorName ? `[${doorName}]` : '[door]');
    }
    if (labelParts.length === 0) return null;
    const text = labelParts.join(' ');

    const charWidth = 6.5;
    const padX = 8;
    const rectWidth = text.length * charWidth + padX * 2;
    const rectHeight = 18;

    return (
        <g className="shaper-connection-label active" transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
            <rect
                x={-rectWidth / 2}
                y={-rectHeight / 2}
                width={rectWidth}
                height={rectHeight}
                rx={4}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth={1}
            />
            <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#f8fafc"
                fontSize={10}
                fontWeight="bold"
                style={{ userSelect: 'none' }}
            >
                {text}
            </text>
        </g>
    );
};

// --- Component Section ---
export const ShaperConnectionLayer: React.FC<ShaperConnectionLayerProps> = ({
    rooms,
    exits,
    viewZ,
    drag,
    selectedConnection,
    selectedConnectionIds,
    onSelectConnection,
    onToggleSelectConnection,
    showExits
}) => {
    const [hoveredLabel, setHoveredLabel] = React.useState<{
        x: number;
        y: number;
        exitType?: string;
        doorName?: string;
        hasDoor?: boolean;
    } | null>(null);

    const rendered = useMemo<RenderedExit[]>(() => {
        if (!showExits) return [];
        const list: RenderedExit[] = [];

        for (const exit of Object.values(exits)) {
            if (!exit.toRoomId) continue;
            const roomA = rooms[exit.fromRoomId];
            const roomB = rooms[exit.toRoomId];
            if (!roomA || !roomB) continue;
            if (roomA.z !== viewZ || roomB.z !== viewZ || roomA.kind !== 'grid' || roomB.kind !== 'grid') continue;

            let dirBA = getOppositeDirection(exit.direction);
            let hasReverse = false;
            for (const dir of directions) {
                const reverse = exits[`${exit.toRoomId}:${dir}`];
                if (reverse?.toRoomId === exit.fromRoomId) {
                    dirBA = dir;
                    hasReverse = true;
                    break;
                }
            }

            list.push({
                key: exit.id,
                aId: exit.fromRoomId,
                bId: exit.toRoomId,
                dirAB: exit.direction,
                dirBA,
                posA: getNodePosition(roomA.x, roomA.y, exit.direction),
                posB: getNodePosition(roomB.x, roomB.y, dirBA),
                hasReverse,
                offset: hasReverse ? 14 : 0
            });
        }
        return list;
    }, [exits, rooms, viewZ, showExits]);

    const barriers = useMemo(() => {
        if (showExits) return [];
        const list: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
        const roomByCoords = new Map<string, ShaperRoomDraft>();
        for (const room of Object.values(rooms)) {
            if (room.z === viewZ && room.kind === 'grid' && !room.inactive) {
                roomByCoords.set(`${room.x},${room.y}`, room);
            }
        }

        for (const room of roomByCoords.values()) {
            const eastNeighbor = roomByCoords.get(`${room.x + 1},${room.y}`);
            if (eastNeighbor) {
                const keyAB = `${room.id}:e`;
                const keyBA = `${eastNeighbor.id}:w`;
                const hasConnection = (exits[keyAB]?.toRoomId === eastNeighbor.id) || 
                                      (exits[keyBA]?.toRoomId === room.id);
                if (!hasConnection) {
                    const midX = (room.x + 1) * SHAPER_CELL;
                    const ry = room.y * SHAPER_CELL;
                    list.push({
                        key: `barrier-h-${room.id}-${eastNeighbor.id}`,
                        x1: midX,
                        y1: ry,
                        x2: midX,
                        y2: ry + SHAPER_CELL
                    });
                }
            }

            const southNeighbor = roomByCoords.get(`${room.x},${room.y + 1}`);
            if (southNeighbor) {
                const keyAB = `${room.id}:s`;
                const keyBA = `${southNeighbor.id}:n`;
                const hasConnection = (exits[keyAB]?.toRoomId === southNeighbor.id) || 
                                      (exits[keyBA]?.toRoomId === room.id);
                if (!hasConnection) {
                    const rx = room.x * SHAPER_CELL;
                    const midY = (room.y + 1) * SHAPER_CELL;
                    list.push({
                        key: `barrier-v-${room.id}-${southNeighbor.id}`,
                        x1: rx,
                        y1: midY,
                        x2: rx + SHAPER_CELL,
                        y2: midY
                    });
                }
            }
        }
        return list;
    }, [rooms, exits, viewZ, showExits]);



    const handlePointerMove = (event: React.PointerEvent<SVGGElement>, exitType?: string, doorName?: string, hasDoor?: boolean) => {
        const svg = event.currentTarget.ownerSVGElement;
        if (!svg) return;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const localPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        setHoveredLabel({
            x: localPt.x + 15,
            y: localPt.y - 15,
            exitType,
            doorName,
            hasDoor
        });
    };

    const handlePointerOut = () => {
        setHoveredLabel(null);
    };

    return (
        <svg className="shaper-connection-svg">
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="2.2" markerHeight="2.2" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 5 L 0 10 z" fill="#ffffff" />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <marker id="arrow-drag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.2" markerHeight="2.2" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 5 L 0 10 z" fill="#e2e8f0" />
                </marker>
            </defs>

            {barriers.map(b => (
                <line
                    key={b.key}
                    x1={b.x1}
                    y1={b.y1}
                    x2={b.x2}
                    y2={b.y2}
                    className="shaper-void-barrier"
                />
            ))}



            {rendered.map(conn => {
                const exitAB = exits[`${conn.aId}:${conn.dirAB}`];
                if (!exitAB) return null;
                const exitId = `${conn.aId}:${conn.dirAB}`;
                const isSelected = selectedConnectionIds.has(exitId);

                const selectThisConnection = (event: React.MouseEvent<SVGGElement> | React.PointerEvent<SVGGElement>) => {
                    event.stopPropagation();
                    const selection = {
                        aId: conn.aId,
                        bId: conn.bId,
                        dirAB: conn.dirAB,
                        dirBA: conn.dirBA
                    };
                    if (event.shiftKey) {
                        onToggleSelectConnection(selection);
                    } else {
                        onSelectConnection(selection);
                    }
                };

                const line = getOffsetPoints(conn.posA, conn.posB, conn.offset);
                const from = { x: line.x1, y: line.y1 };
                const to = { x: line.x2, y: line.y2 };

                const hasDoor = hasShaperExitDoor(exitAB);
                const hasClimb = hasShaperExitClimb(exitAB);

                return (
                    <g
                        key={conn.key}
                        className={`shaper-connection-group ${isSelected ? 'selected' : ''}`}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={selectThisConnection}
                        onPointerMove={event => handlePointerMove(event, exitAB.exitType, exitAB.doorName, hasDoor)}
                        onPointerOut={handlePointerOut}
                    >
                        <title>Click to select this one-way exit</title>
                        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth={conn.hasReverse ? 20 : 24} />
                        <ArrowLine
                            a={from}
                            b={to}
                            isClimb={hasClimb}
                            isSelected={isSelected}
                        />
                    </g>
                );
            })}

            {drag?.currentPos && rooms[drag.sourceRoomId] && (
                <line
                    x1={getNodePosition(rooms[drag.sourceRoomId].x, rooms[drag.sourceRoomId].y, drag.sourceDir).x}
                    y1={getNodePosition(rooms[drag.sourceRoomId].x, rooms[drag.sourceRoomId].y, drag.sourceDir).y}
                    x2={drag.currentPos.x}
                    y2={drag.currentPos.y}
                    stroke="#e2e8f0"
                    strokeWidth={4}
                    strokeDasharray="4 4"
                    markerEnd="url(#arrow-drag)"
                />
            )}

            {hoveredLabel && (
                <ConnectionLabel
                    x={hoveredLabel.x}
                    y={hoveredLabel.y}
                    exitType={hoveredLabel.exitType}
                    doorName={hoveredLabel.doorName}
                    hasDoor={hoveredLabel.hasDoor}
                />
            )}
        </svg>
    );
};
