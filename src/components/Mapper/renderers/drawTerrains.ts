import { RenderContext } from './rendererUtils';
import { GRID_SIZE, normalizeTerrain, getTerrainColor } from '../mapperUtils';
import { drawBlobTerrain, BlobNeighbors } from '../blobTerrainRenderer';

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, now, ANIM_DUR, isDarkMode, explored, unveilMap, allRooms, preloaded, firstExploredAtRef, roomAtCoord, camera } = rCtx;
    const blobTerrains = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'Building', 'City', 'Tunnel', 'Cavern'];

    // Pass 1A: Terrain Backgrounds (Solid fills and Blob Foundations)
    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            bucket.forEach(vnum => {
                const [rx, ry, , tSector] = preloaded[vnum];
                if (!explored.has(vnum) && !unveilMap) return;
                const wx = Math.round(rx) * GRID_SIZE, wy = Math.round(ry) * GRID_SIZE, s = GRID_SIZE;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const norm = normalizeTerrain(terrain);

                const firstExplored = firstExploredAtRef.current[vnum];
                if (firstExplored === undefined) firstExploredAtRef.current[vnum] = now;
                const p = Math.min(1, (now - (firstExploredAtRef.current[vnum] || now)) / ANIM_DUR);

                ctx.save();
                if (p < 1) {
                    ctx.globalAlpha = p;
                    ctx.translate(wx + s/2, wy + s/2); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(wx + s/2), -(wy + s/2));
                }
                ctx.fillStyle = (blobTerrains.includes(norm)) ? getTerrainColor('Base', isDarkMode) : getTerrainColor(terrain, isDarkMode);
                ctx.fillRect(wx - 0.8, wy - 0.8, s + 1.6, s + 1.6);
                ctx.restore();
            });
        }
    }

    // Pass 1B: Terrain Blobs (Organic features on top of backgrounds)
    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            bucket.forEach(vnum => {
                const [rx, ry, , tSector] = preloaded[vnum];
                if (!explored.has(vnum) && !unveilMap) return;
                const wx = Math.round(rx) * GRID_SIZE, wy = Math.round(ry) * GRID_SIZE, s = GRID_SIZE;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const norm = normalizeTerrain(terrain);

                if (blobTerrains.includes(norm)) {
                    const p = Math.min(1, (now - (firstExploredAtRef.current[vnum] || now)) / ANIM_DUR);
                    ctx.save();
                    if (p < 1) {
                        ctx.globalAlpha = p;
                        ctx.translate(wx + s/2, wy + s/2); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(wx + s/2), -(wy + s/2));
                    }
                    const getTAt = (dx: number, dy: number) => {
                        const t = roomAtCoord[`${Math.round(rx) + dx},${Math.round(ry) + dy}`];
                        if (!t) return false;
                        return (t === norm) || (['Tunnel', 'Cavern'].includes(norm) && ['Tunnel', 'Cavern'].includes(t)) || (['Building', 'City'].includes(norm) && ['Building', 'City'].includes(t)) || (['Field', 'Forest', 'Grasslands'].includes(norm) && ['Field', 'Forest', 'Grasslands'].includes(t));
                    };
                    const neighbors: BlobNeighbors = { t: getTAt(0, -1), b: getTAt(0, 1), l: getTAt(-1, 0), r: getTAt(1, 0), tl: getTAt(-1, -1), tr: getTAt(1, -1), bl: getTAt(-1, 1), br: getTAt(1, 1) };
                    const isWavy = ['Water', 'Shallows', 'Rapids', 'Tunnel', 'Hills'].includes(norm);
                    const isCraggy = ['Cavern', 'Mountains'].includes(norm);
                    const isPatchy = ['Field', 'Grasslands', 'Forest', 'Brush'].includes(norm);
                    let inset = 20;
                    if (['Tunnel', 'Cavern', 'Water', 'Shallows', 'Rapids'].includes(norm)) inset = 35;
                    else if (['Field', 'Grasslands', 'Forest'].includes(norm)) inset = 2;
                    const isBuilding = norm === 'Building';
                    const wallColor = isDarkMode ? "rgba(88, 91, 112, 1.0)" : "rgba(76, 79, 105, 1.0)";
                    drawBlobTerrain(ctx, wx, wy, s, neighbors, getTerrainColor(terrain, isDarkMode) as any, {
                        sharpCorners: norm === 'Building' || norm === 'City', inset,
                        wavy: isWavy, craggy: isCraggy, patchy: isPatchy,
                        strokeColor: isBuilding ? wallColor : undefined, strokeWidth: isBuilding ? (2.5 / camera.zoom) : undefined
                    });
                    ctx.restore();
                }
            });
        }
    }
};

export const drawLocalTerrains = (rCtx: RenderContext) => {
    const { ctx, now, ANIM_DUR, isDarkMode, allRooms, currentZ, firstExploredAtRef } = rCtx;
    const blobTerrains = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'Building', 'City', 'Tunnel', 'Cavern'];

    Object.values(allRooms).forEach((room: any) => {
        if (room.id.startsWith('m_')) return;
        const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) return;
        const norm = normalizeTerrain(room.terrain);

        const firstExplored = firstExploredAtRef.current[room.id];
        if (firstExplored === undefined) firstExploredAtRef.current[room.id] = now;
        const p = Math.min(1, (now - (firstExploredAtRef.current[room.id] || now)) / ANIM_DUR);

        ctx.save();
        if (p < 1) {
            ctx.globalAlpha = p;
            ctx.translate(rx + s/2, ry + s/2); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(rx + s/2), -(ry + s/2));
        }
        ctx.fillStyle = (blobTerrains.includes(norm)) ? getTerrainColor('Base', isDarkMode) : getTerrainColor(room.terrain, isDarkMode);
        ctx.fillRect(rx - 0.8, ry - 0.8, s + 1.6, s + 1.6);
        ctx.restore();
    });
};