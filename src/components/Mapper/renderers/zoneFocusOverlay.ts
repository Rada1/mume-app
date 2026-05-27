/**
 * @file zoneFocusOverlay.ts
 * @description Applies a subtle washed-out overlay to map rooms outside the active zone.
 */
import { GRID_SIZE } from '../mapperUtils';
import { RenderContext } from './rendererUtils';

const ZONE_GRAY_LIGHT = '#b8b8b8';
const ZONE_GRAY_DARK = '#383838';
const DETAIL_GRAYSCALE = 0.74;
export const DETAIL_GRAYSCALE_FILTER = `grayscale(${DETAIL_GRAYSCALE})`;
const DETAIL_FILTER_MIN_ZOOM = 0.3;

const normalizeZoneName = (zone: string | null | undefined): string => {
    return String(zone || '').trim().toLowerCase().replace(/^the\s+/i, '').replace(/[-_]+/g, ' ');
};

export const getRoomZone = (room: any, preloadedData?: any): string => {
    return room?.zone || preloadedData?.[9] || '';
};

export const isOutsideActiveZone = (zone: string, activeZone: string | null | undefined): boolean => {
    const normalizedZone = normalizeZoneName(zone);
    const normalizedActiveZone = normalizeZoneName(activeZone);
    return !!normalizedZone && !!normalizedActiveZone && normalizedZone !== normalizedActiveZone;
};

const fillGrayRoomTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillRect(Math.round(x) * GRID_SIZE, Math.round(y) * GRID_SIZE, GRID_SIZE, GRID_SIZE);
};

const filterGrayRoomTile = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const transform = ctx.getTransform();
    const sx = Math.floor(Math.round(x) * GRID_SIZE * transform.a + transform.e);
    const sy = Math.floor(Math.round(y) * GRID_SIZE * transform.d + transform.f);
    const size = Math.ceil(GRID_SIZE * transform.a);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = DETAIL_GRAYSCALE_FILTER;
    ctx.drawImage(ctx.canvas, sx, sy, size, size, sx, sy, size, size);
    ctx.restore();
};

const applyZoneTerrainTone = (ctx: CanvasRenderingContext2D, x: number, y: number, useDetailFilter: boolean) => {
    if (useDetailFilter) filterGrayRoomTile(ctx, x, y);
    else fillGrayRoomTile(ctx, x, y);
};

export const drawZoneFocusOverlay = (
    rCtx: RenderContext,
    bX1: number,
    bY1: number,
    bX2: number,
    bY2: number,
    floorIndex: Record<string, string[]>,
    localRooms: any[],
    grayTerrain: boolean = false
) => {
    const { activeZone, allRooms, ctx, currentZ, explored, isDarkMode, preloaded, treatMapAsExplored, unveilMap } = rCtx;
    if (!activeZone || !grayTerrain) return;

    const revealAll = !!(unveilMap || treatMapAsExplored);
    const useDetailFilter = rCtx.camera.zoom >= DETAIL_FILTER_MIN_ZOOM;
    ctx.save();
    ctx.fillStyle = isDarkMode ? ZONE_GRAY_DARK : ZONE_GRAY_LIGHT;

    if (floorIndex) {
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (!revealAll && !explored.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData || Math.abs((rData[2] || 0) - currentZ) > 0.5) continue;
                    const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                    if (!isOutsideActiveZone(getRoomZone(localRoom, rData), activeZone)) continue;
                    applyZoneTerrainTone(ctx, rData[0], rData[1], useDetailFilter);
                }
            }
        }
    }

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id?.startsWith('m_')) continue;
        if (Math.abs((room.z || 0) - currentZ) > 1.5) continue;
        if (!isOutsideActiveZone(getRoomZone(room), activeZone)) continue;
        applyZoneTerrainTone(ctx, room.x, room.y, useDetailFilter);
    }

    ctx.restore();
};
