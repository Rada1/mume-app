import { RenderContext } from './rendererUtils';
import { GRID_SIZE, normalizeTerrain, getTerrainColor } from '../mapperUtils';
import { drawBlobTerrain, BlobNeighbors } from '../blobTerrainRenderer';

const BLOB_TERRAINS = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'Building', 'City', 'Tunnel', 'Cavern'];

// Pre-allocate shared neighbor object to reduce GC pressure
const sharedNeighbors: BlobNeighbors = { t: false, b: false, l: false, r: false, tl: false, tr: false, bl: false, br: false };

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, now, ANIM_DUR, isDarkMode, explored, unveilMap, allRooms, preloaded, firstExploredAtRef, roomAtCoord, camera, isMapBlobsEnabled } = rCtx;
    const wallColor = "#795548"; // Warm Brown

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const rData = preloaded[vnum];
                if (!explored.has(vnum) && !unveilMap) continue;
                
                const rx = rData[0], ry = rData[1], tSector = rData[3];
                const wx = Math.round(rx) * GRID_SIZE, wy = Math.round(ry) * GRID_SIZE, s = GRID_SIZE;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const norm = normalizeTerrain(terrain);

                ctx.save();

                const isBlob = BLOB_TERRAINS.includes(norm) && isMapBlobsEnabled;
                ctx.fillStyle = isBlob ? getTerrainColor('Base', isDarkMode) : getTerrainColor(terrain, isDarkMode);
                // Increased overdraw to 1.5px and floor/ceil to ensure no sub-pixel gaps
                ctx.fillRect(wx - 1.0, wy - 1.0, s + 2.0, s + 2.0);

                if (isBlob && camera.zoom >= 0.5) {
                    const irx = Math.round(rx), iry = Math.round(ry);
                    sharedNeighbors.t = roomAtCoord[`${irx},${iry - 1}`] === norm;
                    sharedNeighbors.b = roomAtCoord[`${irx},${iry + 1}`] === norm;
                    sharedNeighbors.l = roomAtCoord[`${irx - 1},${iry}`] === norm;
                    sharedNeighbors.r = roomAtCoord[`${irx + 1},${iry}`] === norm;
                    sharedNeighbors.tl = roomAtCoord[`${irx - 1},${iry - 1}`] === norm;
                    sharedNeighbors.tr = roomAtCoord[`${irx + 1},${iry - 1}`] === norm;
                    sharedNeighbors.bl = roomAtCoord[`${irx - 1},${iry + 1}`] === norm;
                    sharedNeighbors.br = roomAtCoord[`${irx + 1},${iry + 1}`] === norm;

                    const isWavy = ['Water', 'Shallows', 'Rapids', 'Tunnel', 'Hills'].includes(norm);
                    const isCraggy = ['Cavern', 'Mountains'].includes(norm);
                    const isPatchy = ['Field', 'Grasslands', 'Forest', 'Brush'].includes(norm);
                    let inset = 20;
                    if (['Tunnel', 'Cavern', 'Water', 'Shallows', 'Rapids'].includes(norm)) inset = 35;
                    else if (['Field', 'Grasslands', 'Forest'].includes(norm)) inset = 2;
                    
                    drawBlobTerrain(ctx, wx, wy, s, sharedNeighbors, getTerrainColor(terrain, isDarkMode) as any, {
                        sharpCorners: norm === 'Building' || norm === 'City', inset,
                        wavy: isWavy, craggy: isCraggy, patchy: isPatchy,
                        strokeColor: norm === 'Building' ? wallColor : undefined, strokeWidth: norm === 'Building' ? (3.5 / camera.zoom) : undefined
                    });
                }
                ctx.restore();
            }
        }
    }
};
export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, now, ANIM_DUR, isDarkMode, currentZ, firstExploredAtRef, isMapBlobsEnabled } = rCtx;

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;

        const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE;
        const norm = normalizeTerrain(room.terrain);

        ctx.save();
        ctx.fillStyle = (BLOB_TERRAINS.includes(norm) && isMapBlobsEnabled) ? getTerrainColor('Base', isDarkMode) : getTerrainColor(room.terrain, isDarkMode);
        ctx.fillRect(rx - 1.0, ry - 1.0, s + 2.0, s + 2.0);
        ctx.restore();
    }
};