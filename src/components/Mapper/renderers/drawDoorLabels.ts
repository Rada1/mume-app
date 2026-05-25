/**
 * @file drawDoorLabels.ts
 * @description Renders Arda map door names beside named hidden door exits.
 */

import { DIRS, GRID_SIZE, getExitTargetId } from '../mapperUtils';
import { RenderContext } from './rendererUtils';

type DoorExit = {
    target?: string;
    gmcpDestId?: number;
    id?: string | number;
    to?: string | number;
    to_vnum?: string | number;
    doorName?: string;
};

const CARDINAL_DIRS = ['n', 's', 'e', 'w', 'u', 'd'] as const;

const getDoorName = (exit: unknown): string => {
    if (!exit || typeof exit !== 'object') return '';
    const value = (exit as DoorExit).doorName;
    return typeof value === 'string' ? value.trim() : '';
};

const makeDoorLabel = (name: string, oppositeName: string): string => {
    if (!oppositeName || oppositeName.toLowerCase() === name.toLowerCase()) return name;
    return `${name}/${oppositeName}`;
};

const getLabelPoint = (
    x: number,
    y: number,
    z: number,
    dir: string,
    target: string,
    preloaded: RenderContext['preloaded']
) => {
    const centerX = x * GRID_SIZE + GRID_SIZE / 2;
    const centerY = y * GRID_SIZE + GRID_SIZE / 2;
    const targetRoom = preloaded[target];

    if (targetRoom && Math.abs((targetRoom[2] || 0) - z) < 1.5) {
        const tx = targetRoom[0] * GRID_SIZE + GRID_SIZE / 2;
        const ty = targetRoom[1] * GRID_SIZE + GRID_SIZE / 2;
        if (Math.abs(tx - centerX) <= GRID_SIZE * 1.5 && Math.abs(ty - centerY) <= GRID_SIZE * 1.5) {
            return { x: (centerX + tx) / 2, y: (centerY + ty) / 2 };
        }
    }

    const vec = DIRS[dir] || { dx: 0, dy: 0 };
    if (dir === 'u') return { x: centerX - GRID_SIZE * 0.24, y: centerY - GRID_SIZE * 0.24 };
    if (dir === 'd') return { x: centerX + GRID_SIZE * 0.24, y: centerY + GRID_SIZE * 0.24 };
    return {
        x: centerX + (vec.dx || 0) * GRID_SIZE * 0.48,
        y: centerY + (vec.dy || 0) * GRID_SIZE * 0.48
    };
};

const drawLabelBubble = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    invZoom: number
) => {
    const fontSize = 11 * invZoom;
    const padX = 4 * invZoom;
    const padY = 2 * invZoom;
    const radius = 3 * invZoom;

    ctx.save();
    ctx.font = `${fontSize}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const width = ctx.measureText(text).width + padX * 2;
    const height = fontSize + padY * 2;
    const labelY = y - 12 * invZoom;

    ctx.fillStyle = 'rgba(16, 16, 16, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(1 * invZoom, 0.5);
    ctx.beginPath();
    ctx.roundRect(x - width / 2, labelY - height / 2, width, height, radius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f4f4f5';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 2 * invZoom;
    ctx.fillText(text, x, labelY);
    ctx.restore();
};

export const drawDoorLabels = (
    rCtx: RenderContext,
    bX1: number,
    bY1: number,
    bX2: number,
    bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, preloaded, explored, unveilMap, treatMapAsExplored, currentZ, invZoom } = rCtx;
    const drawn = new Set<string>();

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;

            for (const vnum of bucket) {
                if (!explored.has(vnum) && !unveilMap && !treatMapAsExplored) continue;

                const roomData = preloaded[vnum];
                if (!roomData || Math.abs((roomData[2] || 0) - currentZ) > 1.5) continue;

                const exits = roomData[4] || {};
                for (const dir of CARDINAL_DIRS) {
                    const exit = exits[dir] as DoorExit | undefined;
                    const doorName = getDoorName(exit);
                    if (!doorName) continue;

                    const target = getExitTargetId(exit);
                    const oppositeDir = DIRS[dir]?.opp;
                    const oppositeExit = target && oppositeDir ? preloaded[target]?.[4]?.[oppositeDir] : undefined;
                    const oppositeName = getDoorName(oppositeExit);
                    const label = makeDoorLabel(doorName, oppositeName);
                    const key = [vnum, target || `${roomData[0]},${roomData[1]},${dir}`].sort().join(':');
                    if (drawn.has(key)) continue;
                    drawn.add(key);

                    const point = getLabelPoint(roomData[0], roomData[1], roomData[2] || 0, dir, target, preloaded);
                    drawLabelBubble(ctx, label, point.x, point.y, invZoom);
                }
            }
        }
    }
};
