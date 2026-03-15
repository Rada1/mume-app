import { RenderContext, drawInkyLine, getSeed } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, normalizeTerrain, getRoomDNA, getTerrainDepth, WALL_COLOR } from '../mapperUtils';

/**
 * Optimized drawer for "Organic" terrain (Mountains, Forests, Water).
 * Uses seeded DNA and neighbor-depth to break the grid and clump features.
 */
export const drawOrganicTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, camera, dpr, invZoom } = rCtx;
    const s = GRID_SIZE;

    if (!floorIndex) return;

    // We draw in layers to ensure clumping looks right (e.g. background water before foreground mountains)
    const layers = ['Water', 'Brush', 'Forest', 'Hills', 'Mountains'];
    
    // 1. Gather visible rooms and their metadata
    const visibleRoomsByTerrain: Record<string, any[]> = {};
    
    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                if (!explored.has(vnum) && !unveilMap) continue;

                const rData = preloaded[vnum];
                if (!rData) continue;
                
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = normalizeTerrain(localRoom ? localRoom.terrain : rData[3]);
                
                if (!visibleRoomsByTerrain[terrain]) visibleRoomsByTerrain[terrain] = [];
                visibleRoomsByTerrain[terrain].push({
                    vnum,
                    x: rData[0] * s,
                    y: rData[1] * s,
                    terrain,
                    dna: getRoomDNA(vnum)
                });
            }
        }
    }

    // 2. Draw each layer
    for (const layerTerrain of layers) {
        const rooms = visibleRoomsByTerrain[layerTerrain];
        if (!rooms) continue;

        ctx.fillStyle = getTerrainColor(layerTerrain, isDarkMode);

        if (layerTerrain === 'Mountains') {
            // MOUNTAIN RANGES: Draw peaks with depth-based scaling
            // Sort by Y so southern mountains overlap northern ones
            rooms.sort((a, b) => a.y - b.y);

            for (const r of rooms) {
                const depth = getTerrainDepth(r.vnum, allRooms, preloaded);
                const isLonelyPeak = r.dna.mutation > 0.96;
                const effectiveDepth = isLonelyPeak ? 3 : depth;
                
                const cX = r.x + s / 2 + r.dna.offsetX;
                const cY = r.y + s / 2 + r.dna.offsetY;
                
                // Base width and height scaled by depth and DNA
                const baseW = s * (1.2 + effectiveDepth * 0.4) * r.dna.scale;
                const baseH = s * (0.8 + effectiveDepth * 0.6) * r.dna.scale;

                // Draw peak (triangle)
                // Fill with terrain color
                ctx.fillStyle = getTerrainColor('Mountains', isDarkMode);
                ctx.fill();
                
                // Fountain pen outline for the peak
                drawInkyLine(ctx, cX - baseW / 2, cY + baseH / 4, cX, cY - baseH * 0.75, WALL_COLOR, 1.5, dpr, invZoom);
                drawInkyLine(ctx, cX, cY - baseH * 0.75, cX + baseW / 2, cY + baseH / 4, WALL_COLOR, 1.5, dpr, invZoom);
                
                // Alpha stroke removed for sharper look

                // Snow cap for high peaks
                if (effectiveDepth >= 3) {
                    ctx.fillStyle = isDarkMode ? '#fff' : '#fff';
                    ctx.beginPath();
                    ctx.moveTo(cX - baseW * 0.15, cY - baseH * 0.4);
                    ctx.lineTo(cX, cY - baseH * 0.75);
                    ctx.lineTo(cX + baseW * 0.15, cY - baseH * 0.4);
                    ctx.lineTo(cX, cY - baseH * 0.3);
                    ctx.fill();
                }
            }
        } 
        else if (layerTerrain === 'Water') {
            // RIVERS/WATER: Connect adjacent water rooms with paths and ripples
            for (const r of rooms) {
                const cX = r.x + s / 2;
                const cY = r.y + s / 2;
                
                ctx.fillStyle = getTerrainColor('Water', isDarkMode);
                ctx.beginPath();
                ctx.arc(cX, cY, s * 0.75, 0, Math.PI * 2);
                ctx.fill();

                // Shoreline Ripples (subtle inky lines around water)
                if (r.dna.mutation > 0.6) {
                    const rX = cX + (r.dna.offsetX * 0.5);
                    const rY = cY + (r.dna.offsetY * 0.5);
                    ctx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(rX, rY, s * 0.9, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        else if (layerTerrain === 'Hills') {
            // HILLS: Illustrative mounds with hatching
            for (const r of rooms) {
                const cX = r.x + s / 2 + r.dna.offsetX;
                const cY = r.y + s / 2 + r.dna.offsetY;
                const baseW = s * 0.8 * r.dna.scale;
                const baseH = s * 0.5 * r.dna.scale;

                // Draw the mound
                ctx.beginPath();
                ctx.ellipse(cX, cY + baseH/4, baseW/2, baseH/2, 0, Math.PI, 0);
                ctx.fillStyle = getTerrainColor('Hills', isDarkMode);
                ctx.fill();
                
                // Ink outline
                drawInkyLine(ctx, cX - baseW/2, cY + baseH/4, cX, cY - baseH/4, WALL_COLOR, 1.2, dpr, invZoom);
                drawInkyLine(ctx, cX, cY - baseH/4, cX + baseW/2, cY + baseH/4, WALL_COLOR, 1.2, dpr, invZoom);

                // Hatching (shading)
                if (camera.zoom > 0.15) {
                    ctx.strokeStyle = WALL_COLOR;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(cX - baseW*0.2, cY); ctx.lineTo(cX - baseW*0.3, cY + baseH*0.2);
                    ctx.moveTo(cX, cY - baseH*0.1); ctx.lineTo(cX - baseW*0.1, cY + baseH*0.1);
                    ctx.stroke();
                }
            }
        }
        else if (layerTerrain === 'Forest') {
            // FORESTS: Draw organic clumps (puffs) with ink outlines
            for (const r of rooms) {
                const cX = r.x + s / 2 + r.dna.offsetX;
                const cY = r.y + s / 2 + r.dna.offsetY;
                const radius = s * 0.75 * r.dna.scale;

                ctx.fillStyle = getTerrainColor('Forest', isDarkMode);
                ctx.beginPath();
                ctx.arc(cX, cY, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Ink "cloud" outline segments
                if (camera.zoom > 0.1) {
                    ctx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)";
                    ctx.lineWidth = 1;
                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
                        const px = cX + Math.cos(angle) * radius;
                        const py = cY + Math.sin(angle) * radius;
                        ctx.beginPath();
                        ctx.arc(px, py, radius * 0.3, angle - 0.5, angle + 0.5);
                        ctx.stroke();
                    }
                }
            }
        }
        else {
            // Default blob for other terrains
            for (const r of rooms) {
                ctx.fillRect(r.x - 2, r.y - 2, s + 4, s + 4);
            }
        }
    }
};
