import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor } from '../mapperUtils';

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded } = rCtx;
    const s = GRID_SIZE;

    // Batch by color to minimize fillStyle changes and draw calls
    const colorBatches: Record<string, { x: number, y: number }[]> = {};

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                if (!explored.has(vnum) && !unveilMap) continue;
                
                const rData = preloaded[vnum];
                const rx = rData[0], ry = rData[1], tSector = rData[3];
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const color = getTerrainColor(terrain, isDarkMode);

                if (!colorBatches[color]) colorBatches[color] = [];
                colorBatches[color].push({ x: Math.round(rx) * s, y: Math.round(ry) * s });
            }
        }
    }

    for (const color in colorBatches) {
        ctx.fillStyle = color;
        const rooms = colorBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            ctx.fillRect(r.x - 1.0, r.y - 1.0, s + 2.0, s + 2.0);
        }
    }
};

export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ } = rCtx;
    const s = GRID_SIZE;

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = room.x * s, ry = room.y * s;
        ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode);
        ctx.fillRect(rx - 1.0, ry - 1.0, s + 2.0, s + 2.0);
    }
};
