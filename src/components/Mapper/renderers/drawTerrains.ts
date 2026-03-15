import { RenderContext, drawInkyLine } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, WALL_COLOR } from '../mapperUtils';

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, dpr, invZoom } = rCtx;
    const s = GRID_SIZE;

    // Batch by color for backgrounds
    const exploredBatches: Record<string, { x: number, y: number, terrain: string }[]> = {};
    const revealedBatches: Record<string, { x: number, y: number, terrain: string }[]> = {};

    if (!floorIndex) return;

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const isExplored = explored.has(vnum);
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
                    exploredBatches[color].push({ x: tx, y: ty, terrain });
                } else {
                    if (!revealedBatches[color]) revealedBatches[color] = [];
                    revealedBatches[color].push({ x: tx, y: ty, terrain });
                }
            }
        }
    }

    // Pass 1: Explored Background Colors
    for (const color in exploredBatches) {
        ctx.fillStyle = color;
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            ctx.fillRect(r.x - 4.0, r.y - 4.0, s + 8.0, s + 8.0);
            
            // Special handling for Caverns/Tunnels: Add a rough "hewn" ink outline
            if (r.terrain === 'Cavern' || r.terrain === 'Tunnel' || r.terrain === 'Inside/Cavern') {
                const tx = r.x, ty = r.y;
                drawInkyLine(ctx, tx, ty, tx + s, ty, WALL_COLOR, 1.5, dpr, invZoom);
                drawInkyLine(ctx, tx + s, ty, tx + s, ty + s, WALL_COLOR, 1.5, dpr, invZoom);
                drawInkyLine(ctx, tx + s, ty + s, tx, ty + s, WALL_COLOR, 1.5, dpr, invZoom);
                drawInkyLine(ctx, tx, ty + s, tx, ty, WALL_COLOR, 1.5, dpr, invZoom);
            }
        }
    }

    // Pass 2: Revealed Background Colors (Opaque but distinct with Bleed)
    if (unveilMap) {
        ctx.globalAlpha = 1.0; 
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            
            // Backdrop removed for sharper look

            // Draw terrain at FULL opacity
            ctx.fillStyle = color;
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x - 4.0, r.y - 4.0, s + 8.0, s + 8.0);
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
        // Add 4px bleed to local terrain to eliminate gaps
        ctx.fillRect(rx - 4.0, ry - 4.0, s + 8.0, s + 8.0);
    }
};
