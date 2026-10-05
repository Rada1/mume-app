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
    hasDoor?: boolean;
    flags?: string[];
    doorFlags?: string[];
};

const CARDINAL_DIRS = ['n', 's', 'e', 'w', 'u', 'd'] as const;

const getDoorName = (exit: unknown): string => {
    if (!exit || typeof exit !== 'object') return '';
    const door = exit as DoorExit;
    const flags = [...(door.flags || []), ...(door.doorFlags || [])];
    if (!(door.hasDoor || flags.some(flag => /^door$/i.test(flag)))
        || !flags.some(flag => /^hidden$/i.test(flag))) return '';
    const value = door.doorName;
    if (typeof value !== 'string' || !value.trim()) return '';
    const suffix = `${flags.some(flag => /^need_?key$/i.test(flag)) ? 'L' : ''}`
        + `${flags.some(flag => /^no_?pick$/i.test(flag)) ? '/NP' : ''}`
        + `${flags.some(flag => /^delayed$/i.test(flag)) ? 'd' : ''}`;
    return suffix ? `${value.trim()} [${suffix}]` : value.trim();
};

const makeDoorLabel = (name: string, oppositeName: string): string => {
    if (!oppositeName || oppositeName.toLowerCase() === name.toLowerCase()) return name;
    return `${name}/${oppositeName}`;
};

const getLabelPoint = (
    x: number,
    y: number,
    dir: string,
    pairedTarget: string | null,
    preloaded: RenderContext['preloaded']
) => {
    const targetRoom = pairedTarget ? preloaded[pairedTarget] : null;
    if (targetRoom) return {
        x: ((x + targetRoom[0]) / 2 + 0.6) * GRID_SIZE,
        y: ((y + targetRoom[1]) / 2 + 0.3) * GRID_SIZE
    };
    const yOffset: Record<string, number> = {
        n: 0.15, s: 0.65, w: 0.3, e: 0.45, u: -0.05, d: 0.8
    };
    return {
        x: (x + 0.6) * GRID_SIZE,
        y: (y + (yOffset[dir] ?? 0.5)) * GRID_SIZE
    };
};

const drawLabelBubble = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    invZoom: number,
    occupied: Array<{ x: number; y: number; width: number; height: number }>
) => {
    const fontSize = 13 * invZoom;
    const padX = 4 * invZoom;
    const padY = 2 * invZoom;
    const radius = 3 * invZoom;

    ctx.save();
    ctx.font = `${fontSize}px "Iosevka", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const width = ctx.measureText(text).width + padX * 2;
    const height = fontSize + padY * 2;
    const labelY = y;
    const box = { x, y: labelY, width: width + 3 * invZoom, height: height + 3 * invZoom };
    if (occupied.some(prior =>
        Math.abs(box.x - prior.x) < (box.width + prior.width) / 2
        && Math.abs(box.y - prior.y) < (box.height + prior.height) / 2
    )) {
        ctx.restore();
        return;
    }
    occupied.push(box);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, labelY - height / 2, width, height, radius);
    ctx.fill();

    ctx.fillStyle = '#fff';
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
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;

            for (const vnum of bucket) {
                if (!explored.has(vnum) && !unveilMap && !treatMapAsExplored) continue;

                const roomData = preloaded[vnum];
                if (!roomData || Math.round(roomData[2] || 0) !== Math.round(currentZ)) continue;

                const exits = roomData[4] || {};
                for (const dir of CARDINAL_DIRS) {
                    const exit = exits[dir] as DoorExit | undefined;
                    const doorName = getDoorName(exit);
                    if (!doorName) continue;

                    const target = getExitTargetId(exit).replace(/^m_/, '');
                    const targetRoom = preloaded[target];
                    const oppositeDir = DIRS[dir]?.opp;
                    const oppositeExit = targetRoom && oppositeDir ? targetRoom[4]?.[oppositeDir] : undefined;
                    const near = targetRoom && Math.abs(targetRoom[0] - roomData[0]) <= 1
                        && Math.abs(targetRoom[1] - roomData[1]) <= 1;
                    const targetVisible = explored.has(target) || unveilMap || treatMapAsExplored;
                    const oppositeName = near && targetVisible ? getDoorName(oppositeExit) : '';
                    const paired = !!oppositeName;
                    if (paired && Math.round(targetRoom[2] || 0) === Math.round(roomData[2] || 0)
                        && vnum.localeCompare(target, undefined, { numeric: true }) > 0) continue;
                    const label = makeDoorLabel(doorName, oppositeName);
                    const key = paired
                        ? [vnum, target].sort().join(':')
                        : `${vnum}:${dir}`;
                    if (drawn.has(key)) continue;
                    drawn.add(key);

                    const point = getLabelPoint(roomData[0], roomData[1], dir, paired ? target : null, preloaded);
                    drawLabelBubble(ctx, label, point.x, point.y, invZoom, occupied);
                }
            }
        }
    }
};
