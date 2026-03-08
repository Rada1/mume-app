import { RenderContext, getRoomAnchor, drawCurvedPath, drawLine, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS, normalizeTerrain, ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT, PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES } from '../mapperUtils';

const BLOB_TERRAINS = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'City', 'Building', 'Tunnel', 'Cavern'];

export const drawFeatures = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, dpr, now, ANIM_DUR, isDarkMode, isMobile, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, firstExploredAtRef, imagesRef, processedIconsRef, roomAtCoord, visitedAtCoord, selectedRoomIds, activeId, camera } = rCtx;

    const drawIcon = (img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
        if (!img?.complete || img.width <= 0 || img.height <= 0) return;
        let source: HTMLImageElement | HTMLCanvasElement = img;
        if (!processedIconsRef.current[img.src]) {
            try {
                const cvs = document.createElement('canvas'); cvs.width = img.width; cvs.height = img.height;
                const tctx = cvs.getContext('2d', { willReadFrequently: true });
                if (tctx) {
                    tctx.drawImage(img, 0, 0);
                    const idata = tctx.getImageData(0, 0, img.width, img.height), data = idata.data, br = data[0], bg = data[1], bb = data[2];
                    for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - br) + Math.abs(data[i+1] - bg) + Math.abs(data[i+2] - bb) < 45) data[i+3] = 0;
                    tctx.putImageData(idata, 0, 0); processedIconsRef.current[img.src] = cvs; source = cvs;
                }
            } catch (e) { processedIconsRef.current[img.src] = img as any; }
        } else source = processedIconsRef.current[img.src];
        ctx.drawImage(source, dx, dy, dw, dh);
    };

    const getGateState = (rA: any, wE: any, d: string) => {
        const lEx = rA?.exits?.[d], wEx = wE?.[d], exA = lEx || wEx; if (!exA) return { hasExit: false };
        const tV = String(exA.target), oD = DIRS[d]?.opp, nId = tV.startsWith('m_') ? tV : `m_${tV}`;
        const n = allRooms[nId] || allRooms[tV] || (preloaded[String(tV)] ? { exits: preloaded[String(tV)][4] } : null);
        const exB = n?.exits?.[oD], hasDF = (f?: any[]) => f?.some(x => /^(door|gate|portcullis|secret)$/i.test(String(x)));
        
        // Strict logic: If we have live GMCP (lEx), trust it. Otherwise, fallback to ghost data.
        let hasD = lEx ? !!(lEx.hasDoor || hasDF(lEx.flags)) : !!(wEx?.hasDoor || (exB && exB.hasDoor) || hasDF(wEx?.flags));
        
        if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };
        let isC = true; if (lEx?.closed === false || exB?.closed === false || wEx?.closed === false) isC = false;
        return { hasExit: true, hasDoor: hasD, isClosed: isC };
    };

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const featureFont = `bold ${Math.min(16, Math.max(10, 14 / camera.zoom))}px "Inter", sans-serif`;
    const nameFont = '8px "Aniron"';

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                if (!explored.has(vnum) && !unveilMap) continue;
                const rData = preloaded[vnum];
                const rx = rData[0], ry = rData[1], tSector = rData[3], ghostExits = rData[4], rName = rData[5], mobFlagsGhost = rData[7], loadFlagsGhost = rData[8];
                const wx = Math.round(rx) * GRID_SIZE, wy = Math.round(ry) * GRID_SIZE, s = GRID_SIZE;
                const anchorX = rx * s + s / 2, anchorY = ry * s + s / 2;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const norm = normalizeTerrain(terrain);

                const firstExplored = firstExploredAtRef.current[vnum];
                if (firstExplored === undefined) firstExploredAtRef.current[vnum] = now;
                const p = Math.min(1, (now - (firstExploredAtRef.current[vnum] || now)) / ANIM_DUR);
                ctx.save();
                if (p < 1) {
                    ctx.globalAlpha = p;
                    ctx.translate(anchorX, anchorY); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-anchorX, -anchorY);
                }

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
                            if (hasRoadFlag && camera.zoom >= 0.6) {
                                if (isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road') drawCurvedPath(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? ROAD_COLOR_DARK : ROAD_COLOR_LIGHT, 12, dpr, invZoom);
                                else drawCurvedPath(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? PATH_COLOR_DARK : PATH_COLOR_LIGHT, 4, dpr, invZoom);
                            } else if (targetVnum > vnum && (Math.abs(targetData[0] - rx) > 1.1 || Math.abs(targetData[1] - ry) > 1.1)) {
                                drawLine(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? "rgba(137, 180, 250, 0.15)" : "rgba(37, 99, 235, 0.15)", 2, dpr, invZoom);
                            }

                            // Vertical connection line between indicators
                            if (dir === 'u' && targetData && (explored.has(targetVnum) || unveilMap)) {
                                if (Math.abs(targetData[2] - currentZ) <= 1.1) {
                                    const margin = 4 / camera.zoom;
                                    const triSize = 6 / camera.zoom;
                                    const p1 = { x: wx + s - margin - triSize / 2, y: wy + margin };
                                    const p2 = { x: Math.round(targetData[0]) * s + s - margin - triSize / 2, y: Math.round(targetData[1]) * s + s - margin };
                                    drawLine(ctx, p1.x, p1.y, p2.x, p2.y, isDarkMode ? "rgba(205, 214, 244, 0.4)" : "rgba(69, 71, 90, 0.4)", 1.5, dpr, invZoom, true);
                                }
                            }
                        }
                    }
                }

                if (camera.zoom >= 0.8) {
                    if (terrain === 'Mountains' || terrain === '<') {
                        const seed = getSeed(Math.round(rx), Math.round(ry)), img = imagesRef.current[PEAK_IMAGES[Math.floor(seed * PEAK_IMAGES.length)]];
                        if (img) { const iw = s * 2.4 * (0.9 + seed * 0.2), ih = img.height * (iw / img.width); drawIcon(img, wx + s/2 - iw/2, wy + s/2 - ih/2, iw, ih); }
                    } else if (terrain === 'Forest' || terrain === 'f') {
                        const img = imagesRef.current[FOREST_IMAGES[0]];
                        if (img) {
                            for (let j = 0; j < (isMobile ? 5 : 8); j++) {
                                const ssX = getSeed(Math.round(rx) + j * 0.21, Math.round(ry) + j * 0.13), ssY = getSeed(Math.round(rx) + j * 0.47, Math.round(ry) + j * 0.29);
                                const sc = (s * 0.36 / Math.max(img.width, img.height)) * (0.8 + getSeed(j, j) * 0.4);
                                drawIcon(img, wx + ssX * s - (img.width * sc) / 2, wy + ssY * s - (img.height * sc) / 2, img.width * sc, img.height * sc);
                            }
                        }
                    } else if (terrain === 'Hills' || terrain === '(') {
                        const seed = getSeed(Math.round(rx), Math.round(ry)), img = imagesRef.current[HILL_IMAGES[0]];
                        if (img) { const iw = s * 1.8 * (0.9 + seed * 0.2), ih = img.height * (iw / img.width); drawIcon(img, wx + s/2 - iw/2, wy + s/2 - ih/2, iw, ih); }
                    }
                }

                for (const d of ['n', 's', 'e', 'w']) {
                    const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, d);
                    const isB = norm === 'Building';
                    let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                    if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                    
                    if (!hasExit) {
                        ctx.beginPath();
                        ctx.strokeStyle = "#795548"; // Warm Brown
                        ctx.lineWidth = 2.5 / camera.zoom;
                        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                    } else if (hasDoor && camera.zoom >= 0.4) {
                        const ddx = x2 - x1, ddy = y2 - y1; ctx.strokeStyle = isDarkMode ? "#fab387" : "#e67e22"; ctx.lineWidth = 3.5 / camera.zoom;
                        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                        if (isClosed) { ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0 / camera.zoom; ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke(); }
                    }
                }

                const mobF = localRoom?.mobFlags || mobFlagsGhost || [], loadF = localRoom?.loadFlags || loadFlagsGhost || [];
                if (mobF.length > 0 || loadF.length > 0) {
                    ctx.save(); ctx.font = featureFont; let off = 0;
                    for (let j = 0; j < mobF.length; j++) {
                        const f = mobF[j];
                        if (f.includes('AGGRESSIVE')) { ctx.fillStyle = '#f38ba8'; ctx.fillText('!', anchorX + off, anchorY); off += 10 / camera.zoom; }
                        else if (f.includes('SHOP')) { ctx.fillStyle = '#f9e2af'; ctx.fillText('$', anchorX + off, anchorY); off += 10 / camera.zoom; }
                        else if (f.includes('GUILD')) { ctx.fillStyle = '#cba6f7'; ctx.fillText('G', anchorX + off, anchorY); off += 10 / camera.zoom; }
                        else if (f.includes('RENT')) { ctx.fillStyle = '#89b4fa'; ctx.fillText('R', anchorX + off, anchorY); off += 10 / camera.zoom; }
                    }
                    if (loadF.some(f => f.includes('HERB') || f.includes('WATER'))) { ctx.fillStyle = '#a6e3a1'; ctx.fillText('*', anchorX + off, anchorY); }
                    ctx.restore();
                }

                if (camera.zoom > 1.8) { ctx.font = nameFont; ctx.fillStyle = isDarkMode ? '#cdd6f4' : '#45475a'; ctx.fillText(rName.substring(0, 12), anchorX, wy + s * 0.95); }
                ctx.restore();
            }
        }
    }
};

export const drawLocalFeatures = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, dpr, now, ANIM_DUR, isDarkMode, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, firstExploredAtRef, roomAtCoord, visitedAtCoord, activeId, camera } = rCtx;
    const s = GRID_SIZE;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const localFeatureFont = `bold ${Math.min(16, Math.max(10, 14 / camera.zoom))}px "Inter", sans-serif`;

    const getLGS = (rA: any, d: string) => {
        const exA = rA.exits?.[d], rId = String(rA.id).startsWith('m_') ? rA.id.substring(2) : rA.id, wEx = preloaded[rId]?.[4][d], effEx = exA || wEx; if (!effEx) return { hasExit: false };
        const hasDF = (f?: any[]) => f?.some((x: any) => /door|gate|portcullis|secret/i.test(String(x)));
        // Strict logic same as above
        const hasD = exA ? !!(exA.hasDoor || hasDF(exA.flags)) : !!(wEx?.hasDoor || hasDF(wEx?.flags));
        if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };
        let isC = true; if (exA?.closed === false) isC = false;
        return { hasExit: true, hasDoor: hasD, isClosed: isC };
    };

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i]; if (room.id.startsWith('m_')) continue;
        if (Math.abs((room.z || 0) - currentZ) > 1.5) continue;
        const rx = room.x, ry = room.y, wx = rx * s, wy = ry * s, cX = wx + s/2, cY = wy + s/2, norm = normalizeTerrain(room.terrain);
        const p = Math.min(1, (now - (firstExploredAtRef.current[room.id] || now)) / ANIM_DUR);
        ctx.save();
        if (p < 1) { ctx.globalAlpha = p; ctx.translate(cX, cY); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-cX, -cY); }

        for (const d of ['n', 's', 'e', 'w']) {
            const { hasExit, hasDoor, isClosed } = getLGS(room, d);
            let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
            if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
            if (!hasExit) {
                ctx.beginPath();
                ctx.strokeStyle = "#795548"; // Warm Brown
                ctx.lineWidth = 2.5 / camera.zoom;
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            } else if (hasDoor && camera.zoom >= 0.4) {
                const ddx = x2 - x1, ddy = y2 - y1; ctx.strokeStyle = isDarkMode ? "#fab387" : "#e67e22"; ctx.lineWidth = 3.5 / camera.zoom;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx*0.25, y1 + ddy*0.25); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx*0.25, y2 - ddy*0.25); ctx.stroke();
                if (isClosed) { ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0 / camera.zoom; ctx.beginPath(); ctx.moveTo(x1 + ddx*0.25, y1+ddy*0.25); ctx.lineTo(x2-ddx*0.25, y2-ddy*0.25); ctx.stroke(); }
            }
        }
        
        const mobF = room.mobFlags || [], loadF = room.loadFlags || [];
        if (mobF.length > 0 || loadF.length > 0) {
            ctx.save(); ctx.font = localFeatureFont; let off = 0;
            for (let j = 0; j < mobF.length; j++) {
                const f = mobF[j];
                if (f.includes('AGGRESSIVE')) { ctx.fillStyle = '#f38ba8'; ctx.fillText('!', cX + off, cY); off += 10 / camera.zoom; }
                else if (f.includes('SHOP')) { ctx.fillStyle = '#f9e2af'; ctx.fillText('$', cX + off, cY); off += 10 / camera.zoom; }
                else if (f.includes('GUILD')) { ctx.fillStyle = '#cba6f7'; ctx.fillText('G', cX + off, cY); off += 10 / camera.zoom; }
                else if (f.includes('RENT')) { ctx.fillStyle = '#89b4fa'; ctx.fillText('R', cX + off, cY); off += 10 / camera.zoom; }
            }
            if (loadF.some((f: any) => String(f).includes('HERB'))) { ctx.fillStyle = '#a6e3a1'; ctx.fillText('*', cX + off, cY); }
            ctx.restore();
        }

        // Vertical connection line for dynamic rooms
        if (room.exits) {
            Object.entries(room.exits).forEach(([dir, ex]: [string, any]) => {
                if (dir !== 'u') return; // Only draw from 'up' to avoid doubles
                const targetId = String(ex.target);
                const targetRoom = allRooms[`m_${targetId}`] || allRooms[targetId];
                const targetData = preloaded[targetId];
                
                let tX: number | undefined, tY: number | undefined, tZ: number | undefined;
                if (targetRoom) {
                    tX = targetRoom.x; tY = targetRoom.y; tZ = targetRoom.z;
                } else if (targetData && (explored.has(targetId) || unveilMap)) {
                    tX = targetData[0]; tY = targetData[1]; tZ = targetData[2];
                }

                if (tX !== undefined && tY !== undefined && tZ !== undefined && Math.abs(tZ - currentZ) <= 1.5) {
                    const margin = 4 / camera.zoom;
                    const triSize = 6 / camera.zoom;
                    const p1 = { x: wx + s - margin - triSize / 2, y: wy + margin };
                    const p2 = { x: tX * s + s - margin - triSize / 2, y: tY * s + s - margin };
                    drawLine(ctx, p1.x, p1.y, p2.x, p2.y, isDarkMode ? "rgba(205, 214, 244, 0.4)" : "rgba(69, 71, 90, 0.4)", 1.5, dpr, invZoom, true);
                }
            });
        }

        ctx.restore();
    }
};