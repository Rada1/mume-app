/**
 * @file ShaperConnectionPrimitives.tsx
 * @description Small SVG primitives for Shaper connection rendering.
 */

import React from 'react';
import type { ShaperPoint } from './ShaperCanvasGeometry';

// --- Climb Marker Section ---
export const ClimbMark: React.FC<{ a: ShaperPoint; b: ShaperPoint }> = ({ a, b }) => {
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

// --- Line Section ---
export const ArrowLine: React.FC<{
    a: ShaperPoint;
    b: ShaperPoint;
    isClimb: boolean;
    isSelected: boolean;
    isDotted: boolean;
}> = ({ a, b, isClimb, isSelected, isDotted }) => (
    <>
        <line
            className={`shaper-connection-line${isDotted ? ' dotted' : ''}`}
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

// --- Label Section ---
export const ConnectionLabel: React.FC<{
    x: number;
    y: number;
    exitType?: string;
    doorName?: string;
    hasDoor?: boolean;
}> = ({ x, y, exitType, doorName, hasDoor }) => {
    const labelParts: string[] = [];
    if (exitType) labelParts.push(exitType);
    if (hasDoor) labelParts.push(doorName ? `[${doorName}]` : '[door]');
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
