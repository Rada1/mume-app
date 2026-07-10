/**
 * @file ShaperConnectionLayer.tsx
 * @description SVG rendering for Shaper room connections, labels, and active drags.
 */

import React, { useMemo } from 'react';
import type { ShaperDirection, ShaperExitDraft, ShaperRoomDraft, ShaperRoomId, ShaperConnectionSelection } from '../model/shaperTypes';
import {
    getNodePosition,
    getOffsetPoints,
    type ShaperConnectionDragState,
    type ShaperPoint
} from './ShaperCanvasGeometry';
import { hasShaperExitClimb, hasShaperExitDoor } from '../model/shaperExitFlags';
import { ArrowLine, ConnectionLabel } from './ShaperConnectionPrimitives';
import { buildRenderedBarriers, buildRenderedConnectionHints, buildRenderedExits } from './ShaperConnectionRenderModel';

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

    const rendered = useMemo(() => buildRenderedExits(rooms, exits, viewZ, showExits), [exits, rooms, viewZ, showExits]);
    const hints = useMemo(() => buildRenderedConnectionHints(rooms, exits, viewZ, showExits), [exits, rooms, viewZ, showExits]);
    const barriers = useMemo(() => buildRenderedBarriers(rooms, exits, viewZ, showExits), [rooms, exits, viewZ, showExits]);

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


            {hints.map(hint => (
                <line
                    key={hint.key}
                    x1={hint.posA.x}
                    y1={hint.posA.y}
                    x2={hint.posB.x}
                    y2={hint.posB.y}
                    className="shaper-connection-hint"
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
                            isDotted={conn.isDotted}
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
