import { RenderContext, drawLine } from './rendererUtils';
import { GRID_SIZE, DIRS, normalizeTerrain, ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT } from '../mapperUtils';

export const drawFeatures = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, dpr, isDarkMode, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, camera } = rCtx;
    const s = GRID_SIZE;

    const getGateState = (rA: any, wE: any, d: string) => {
        // Authoritative data source: trust live exits if they exist.
        // If we have live data for the room, and the direction is missing, a wall exists.
        const exA = rA?.exits ? rA.exits[d] : wE?.[d];
        if (!exA) return { hasExit: false };
        
        const tV = String(exA.target || exA.gmcpDestId || ""), oD = DIRS[d]?.opp;
        const nId = tV && !tV.startsWith('m_') ? `m_${tV}` : tV;
        const n = tV ? (allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { exits: preloaded[tV][4] } : null)) : null;
        const exB = n?.exits?.[oD], hasDF = (f?: any[]) => f?.some(x => /^(door|gate|portcullis|secret)$/i.test(String(x)));

        // Neighbor check: if the neighbor is discovered but has no exit back, we shouldn't draw a door.
        const neighborIsLive = n && (allRooms[nId] || allRooms[tV]);
        if (neighborIsLive && !exB) return { hasExit: true, hasDoor: false, isClosed: false };

        const neighborPointsBack = exB && String(exB.target || exB.gmcpDestId || "").replace(/^m_/, '') === String(rA?.id || "").replace(/^m_/, '');
        let hasD = !!(exA.hasDoor || hasDF(exA.flags) || (neighborPointsBack && (exB.hasDoor || hasDF(exB.flags))));
        
        if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };
        
        let isC = (exA.closed !== false); 
        if (exB && exB.closed === false) isC = false;
        
        return { hasExit: true, hasDoor: hasD, isClosed: isC };
    };

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const featureFont = `bold ${Math.min(16, Math.max(10, 14 / camera.zoom))}px "Inter", sans-serif`;

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                if (!explored.has(vnum) && !unveilMap) continue;
                const rData = preloaded[vnum];
                const rx = rData[0], ry = rData[1], tSector = rData[3], ghostExits = rData[4];
                const wx = Math.round(rx) * s, wy = Math.round(ry) * s;
                const anchorX = rx * s + s / 2, anchorY = ry * s + s / 2;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];

                // Roads and trails
                if (ghostExits) {
                    const currentRoomObj = localRoom || { terrain: tSector, exits: {} };
                    const isCurrentRoad = normalizeTerrain(currentRoomObj.terrain) === 'Road';
                    for (const dir in ghostExits) {
                        const exObj = ghostExits[dir]; if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && (Math.abs(targetData[2] - currentZ) <= 0.5 || ((dir === 'u' || dir === 'd') && Math.abs(targetData[2] - currentZ) <= 1.5)) && (explored.has(targetVnum) || unveilMap)) {
                            const combinedFlags = [...(exObj.flags || []), ...(currentRoomObj.exits?.[dir]?.flags || [])];
                            const hasRoadFlag = combinedFlags.some((f: string) => /road|trail|path/i.test(String(f)));
                            const tpx = targetData[0] * s + s/2, tpy = targetData[1] * s + s/2;
                            if (hasRoadFlag && camera.zoom >= 0.1) {
                                if (isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road') drawLine(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? ROAD_COLOR_DARK : ROAD_COLOR_LIGHT, 12, dpr, invZoom);
                                else drawLine(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? PATH_COLOR_DARK : PATH_COLOR_LIGHT, 4, dpr, invZoom);
                            } else if (camera.zoom >= 0.1) {
                                // Only draw connection line if rooms are NOT directly next to each other
                                const dx = Math.abs(rx - targetData[0]), dy = Math.abs(ry - targetData[1]);
                                // Always show connection line for up/down exits regardless of proximity
                                if (dx > 1.1 || dy > 1.1 || dir === 'u' || dir === 'd') {
                                    drawLine(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', 2, dpr, invZoom);
                                }
                            }
                        }
                    }
                }

                // Walls and Doors
                for (const d of ['n', 's', 'e', 'w']) {
                    const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, d);
                    let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                    if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                    
                    if (!hasExit) {
                        ctx.beginPath(); ctx.strokeStyle = "#795548"; ctx.lineWidth = 2.5 / camera.zoom;
                        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                    } else if (hasDoor && camera.zoom >= 0.1) {
                        const ddx = x2 - x1, ddy = y2 - y1; ctx.strokeStyle = isDarkMode ? "#fab387" : "#e67e22"; ctx.lineWidth = 3.5 / camera.zoom;
                        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                        if (isClosed) { ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0 / camera.zoom; ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke(); }
                    }
                }

                // Mob/Load Flags
                const mobF = localRoom?.mobFlags || rData[7] || [], loadF = localRoom?.loadFlags || rData[8] || [];
                if (mobF.length > 0 || loadF.length > 0) {
                    ctx.save(); ctx.font = featureFont; let off = 0;
                    for (const f of mobF) {
                        if (f.includes('AGGRESSIVE')) { ctx.fillStyle = '#f38ba8'; ctx.fillText('!', anchorX + off, anchorY); off += 10 / camera.zoom; }
                        else if (f.includes('SHOP')) { ctx.fillStyle = '#f9e2af'; ctx.fillText('$', anchorX + off, anchorY); off += 10 / camera.zoom; }
                        else if (f.includes('GUILD')) { ctx.fillStyle = '#cba6f7'; ctx.fillText('G', anchorX + off, anchorY); off += 10 / camera.zoom; }
                        else if (f.includes('RENT')) { ctx.fillStyle = '#89b4fa'; ctx.fillText('R', anchorX + off, anchorY); off += 10 / camera.zoom; }
                    }
                    if (loadF.some((f: any) => /HERB|WATER/i.test(String(f)))) { ctx.fillStyle = '#a6e3a1'; ctx.fillText('*', anchorX + off, anchorY); }
                    ctx.restore();
                }

                // Up/Down Exit Indicators
                if (ghostExits && (ghostExits.u || ghostExits.d)) {
                    ctx.save();
                    ctx.font = featureFont;
                    ctx.fillStyle = isDarkMode ? '#fab387' : '#e67e22';
                    if (ghostExits.u) {
                        ctx.fillText('▲', anchorX, anchorY - 14 / camera.zoom);
                    }
                    if (ghostExits.d) {
                        ctx.fillText('▼', anchorX, anchorY + 14 / camera.zoom);
                    }
                    ctx.restore();
                }
            }
        }
    }
};

export const drawLocalFeatures = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, preloaded, camera, allRooms, dpr, invZoom } = rCtx;
    const s = GRID_SIZE;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const localFeatureFont = `bold ${Math.min(16, Math.max(10, 14 / camera.zoom))}px "Inter", sans-serif`;

    const getLGS = (rA: any, d: string) => {
        const rId = String(rA.id).startsWith('m_') ? rA.id.substring(2) : rA.id;
        const wEx = preloaded[rId]?.[4]?.[d];
        const exA = rA.exits ? rA.exits[d] : wEx;
        if (!exA) return { hasExit: false };

        const tV = String(exA.target || exA.gmcpDestId || ""), oD = DIRS[d]?.opp;
        const nId = tV && !tV.startsWith('m_') ? `m_${tV}` : tV;
        const n = tV ? (allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { exits: preloaded[tV][4] } : null)) : null;
        const exB = n?.exits?.[oD];

        // Neighbor check for doors: if neighbor is live and lacks exit back, no door.
        const neighborIsLive = n && (allRooms[nId] || allRooms[tV]);
        if (neighborIsLive && !exB) return { hasExit: true, hasDoor: false, isClosed: false };

        const hasDF = (f?: any[]) => f?.some((x: any) => /door|gate|portcullis|secret/i.test(String(x)));
        const neighborPointsBack = exB && String(exB.target || exB.gmcpDestId || "").replace(/^m_/, '') === String(rA?.id || "").replace(/^m_/, '');
        const hasD = !!(exA.hasDoor || hasDF(exA.flags) || (neighborPointsBack && (exB.hasDoor || hasDF(exB.flags))));
        
        if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };
        
        return { hasExit: true, hasDoor: hasD, isClosed: exA.closed !== false };
    };

    for (const room of localRooms) {
        // Skip if this room is already in the preloaded map (to avoid double drawing overlaps)
        const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
        if (preloaded[vnum]) continue;

        if (Math.abs((room.z || 0) - currentZ) > 1.5) continue;
        const wx = room.x * s, wy = room.y * s, cX = wx + s/2, cY = wy + s/2;

        // Draw connections for local rooms
        if (room.exits) {
            for (const d in room.exits) {
                const ex = room.exits[d]; if (!ex) continue;
                const tV = String(ex.target || ex.gmcpDestId || "");
                if (!tV) continue;
                const nId = tV.startsWith('m_') ? tV : `m_${tV}`;
                const n = allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { x: preloaded[tV][0], y: preloaded[tV][1], z: preloaded[tV][2] } : null);
                if (n && (Math.abs((n.z || 0) - currentZ) <= 0.5)) {
                    const dx = Math.abs(room.x - n.x), dy = Math.abs(room.y - n.y);
                    // Always show connection line for up/down exits regardless of proximity
                    if (dx > 1.1 || dy > 1.1 || d === 'u' || d === 'd') {
                        const tpx = n.x * s + s/2, tpy = n.y * s + s/2;
                        drawLine(ctx, cX, cY, tpx, tpy, isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', 2, dpr, invZoom);
                    }
                }
            }
        }

        // Draw Up/Down indicators for local rooms
        if (room.exits && (room.exits.u || room.exits.d)) {
            ctx.save();
            ctx.font = localFeatureFont;
            ctx.fillStyle = isDarkMode ? '#fab387' : '#e67e22';
            if (room.exits.u) ctx.fillText('▲', cX, cY - 14 / camera.zoom);
            if (room.exits.d) ctx.fillText('▼', cX, cY + 14 / camera.zoom);
            ctx.restore();
        }

        for (const d of ['n', 's', 'e', 'w']) {
            const { hasExit, hasDoor, isClosed } = getLGS(room, d);
            let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
            if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
            if (!hasExit) {
                ctx.beginPath(); ctx.strokeStyle = "#795548"; ctx.lineWidth = 2.5 / camera.zoom;
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            } else if (hasDoor && camera.zoom >= 0.1) {
                const ddx = x2 - x1, ddy = y2 - y1; ctx.strokeStyle = isDarkMode ? "#fab387" : "#e67e22"; ctx.lineWidth = 3.5 / camera.zoom;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx*0.25, y1 + ddy*0.25); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx*0.25, y2 - ddy*0.25); ctx.stroke();
                if (isClosed) { ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0 / camera.zoom; ctx.beginPath(); ctx.moveTo(x1 + ddx*0.25, y1+ddy*0.25); ctx.lineTo(x2-ddx*0.25, y2-ddy*0.25); ctx.stroke(); }
            }
        }
        
        const mobF = room.mobFlags || [], loadF = room.loadFlags || [];
        if (mobF.length > 0 || loadF.length > 0) {
            ctx.save(); ctx.font = localFeatureFont; let off = 0;
            for (const f of mobF) {
                if (f.includes('AGGRESSIVE')) { ctx.fillStyle = '#f38ba8'; ctx.fillText('!', cX + off, cY); off += 10 / camera.zoom; }
                else if (f.includes('SHOP')) { ctx.fillStyle = '#f9e2af'; ctx.fillText('$', cX + off, cY); off += 10 / camera.zoom; }
                else if (f.includes('GUILD')) { ctx.fillStyle = '#cba6f7'; ctx.fillText('G', cX + off, cY); off += 10 / camera.zoom; }
                else if (f.includes('RENT')) { ctx.fillStyle = '#89b4fa'; ctx.fillText('R', cX + off, cY); off += 10 / camera.zoom; }
            }
            if (loadF.some((f: any) => String(f).includes('HERB'))) { ctx.fillStyle = '#a6e3a1'; ctx.fillText('*', cX + off, cY); }
            ctx.restore();
        }
    }
};
