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

    // Pass 1: Explored Background Colors (Opaque)
    ctx.globalAlpha = 1.0;
    for (const color in exploredBatches) {
        ctx.fillStyle = color;
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            ctx.fillRect(r.x, r.y, s, s);
        }
    }

    // Pass 2: Revealed Background Colors (Opaque but distinct)
    if (unveilMap) {
        ctx.globalAlpha = 1.0; 
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            
            // Draw a slightly lightened backdrop
            ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x, r.y, s, s);
            }

            // Draw terrain at FULL opacity to ensure visibility. 
            // We use the backdrop above to differentiate it from "Explored" 
            ctx.fillStyle = color;
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x, r.y, s, s);
            }
        }
    }

    // Pass 3: Borders (Subtle overlay)
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    for (const color in exploredBatches) {
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            ctx.strokeRect(r.x, r.y, s, s);
        }
    }
    if (unveilMap) {
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.strokeRect(r.x, r.y, s, s);
            }
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
