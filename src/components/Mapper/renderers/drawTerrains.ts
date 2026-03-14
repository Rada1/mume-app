import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor } from '../mapperUtils';

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded } = rCtx;
    const s = GRID_SIZE;

    // Batch by color for backgrounds
    const exploredBatches: Record<string, { x: number, y: number }[]> = {};
    const revealedBatches: Record<string, { x: number, y: number }[]> = {};

    if (!floorIndex) return;

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const key = `${bx},${by}`;
            const bucket = floorIndex[key];
            if (!bucket) continue;
            
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const isExplored = explored.has(vnum);
                // Skip rendering if not explored and map unveil is off
                if (!isExplored && !unveilMap) continue;

                const rData = preloaded[vnum];
                if (!rData) continue;
                
                const rx = rData[0], ry = rData[1], tSector = rData[3];
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                
                const color = getTerrainColor(terrain, isDarkMode);
                const tx = Math.round(rx) * s;
                const ty = Math.round(ry) * s;

                if (isExplored) {
                    if (!exploredBatches[color]) exploredBatches[color] = [];
                    exploredBatches[color].push({ x: tx, y: ty });
                } else {
                    if (!revealedBatches[color]) revealedBatches[color] = [];
                    revealedBatches[color].push({ x: tx, y: ty });
                }
            }
        }
    }

    // Pass 1: Explored Background Colors (Opaque with Bleed)
    ctx.globalAlpha = 1.0;
    for (const color in exploredBatches) {
        ctx.fillStyle = color;
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            // Add 0.5px bleed to eliminate hairline gaps
            ctx.fillRect(r.x - 0.5, r.y - 0.5, s + 1.0, s + 1.0);
        }
    }

    // Pass 2: Revealed Background Colors (Opaque but distinct with Bleed)
    if (unveilMap) {
        ctx.globalAlpha = 1.0; 
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            
            // Draw a slightly lightened backdrop
            ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x - 0.5, r.y - 0.5, s + 1.0, s + 1.0);
            }

            // Draw terrain at FULL opacity
            ctx.fillStyle = color;
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x - 0.5, r.y - 0.5, s + 1.0, s + 1.0);
            }
        }
    }

    // Pass 3: Borders REMOVED to eliminate gaps
};

export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ } = rCtx;
    const s = GRID_SIZE;

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
        ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode);
        // Add bleed to local terrain as well
        ctx.fillRect(rx - 0.5, ry - 0.5, s + 1.0, s + 1.0);
    }
};
