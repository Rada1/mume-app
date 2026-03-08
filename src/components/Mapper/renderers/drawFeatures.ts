import { RenderContext, getRoomAnchor, drawCurvedPath, drawLine, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS, normalizeTerrain, ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT, PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES } from '../mapperUtils';

export const drawFeatures = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, dpr, now, ANIM_DUR, isDarkMode, isMobile, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, firstExploredAtRef, imagesRef, processedIconsRef, roomAtCoord, visitedAtCoord, selectedRoomIds, activeId, camera } = rCtx;

    const isMtn = (rVal: any) => rVal === 'Mountains' || rVal === '<';
    const isFor = (rVal: any) => rVal === 'Forest' || rVal === 'f';
    const isHill = (rVal: any) => rVal === 'Hills' || rVal === '(';

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
        const exB = n?.exits?.[oD], isD = (n: string) => /\b(door|gate|portcullis|secret)\b/i.test(n), hasDF = (f?: any[]) => f?.some(x => /^(door|gate|portcullis|secret)$/i.test(String(x)));
        const hasD = !!(exA.hasDoor || (exB && exB.hasDoor) || hasDF(exA.flags) || isD(exA.name || '') || (!lEx && wEx?.hasDoor));
        if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };
        let isC = true; if (lEx?.closed === false || exB?.closed === false || wEx?.closed === false) isC = false;
        return { hasExit: true, hasDoor: hasD, isClosed: isC };
    };

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            bucket.forEach(vnum => {
                const [rx, ry, , tSector, ghostExits, rName, , mobFlagsGhost, loadFlagsGhost] = preloaded[vnum];
                if (!explored.has(vnum) && !unveilMap) return;
                const wx = Math.round(rx) * GRID_SIZE, wy = Math.round(ry) * GRID_SIZE, s = GRID_SIZE;
                const anchor = getRoomAnchor(rx, ry);
                const centerPX = anchor.x, centerPY = anchor.y;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const norm = normalizeTerrain(terrain);

                const p = Math.min(1, (now - (firstExploredAtRef.current[vnum] || now)) / ANIM_DUR);
                ctx.save();
                if (p < 1) {
                    ctx.globalAlpha = p;
                    ctx.translate(centerPX, centerPY); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-centerPX, -centerPY);
                }

                if (ghostExits) {
                    const currentRoomObj = localRoom || { terrain: tSector, exits: {} };
                    const isCurrentRoad = normalizeTerrain(currentRoomObj.terrain) === 'Road';
                    for (const dir in ghostExits) {
                        const exObj = ghostExits[dir];
                        if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && Math.abs(targetData[2] - currentZ) <= 0.5 && (explored.has(targetVnum) || unveilMap)) {
                            const combinedFlags = [...(exObj.flags || []), ...(currentRoomObj.exits?.[dir]?.flags || [])];
                            const hasRoadFlag = combinedFlags.some((f: string) => /road|trail|path/i.test(String(f)));
                            const tAnchor = getRoomAnchor(targetData[0], targetData[1]);
                            const tpx = tAnchor.x, tpy = tAnchor.y;
                            if (hasRoadFlag) {
                                if (isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road') drawCurvedPath(ctx, centerPX, centerPY, tpx, tpy, isDarkMode ? ROAD_COLOR_DARK : ROAD_COLOR_LIGHT, 12, dpr, invZoom);
                                else drawCurvedPath(ctx, centerPX, centerPY, tpx, tpy, isDarkMode ? PATH_COLOR_DARK : PATH_COLOR_LIGHT, 4, dpr, invZoom);
                            } else if (targetVnum > vnum && (Math.abs(targetData[0] - rx) > 1.1 || Math.abs(targetData[1] - ry) > 1.1)) {
                                drawLine(ctx, centerPX, centerPY, tpx, tpy, isDarkMode ? "rgba(137, 180, 250, 0.15)" : "rgba(37, 99, 235, 0.15)", 2, dpr, invZoom);
                            }
                        }
                    }
                }

                if (isMtn(terrain)) {
                    const seed = getSeed(Math.round(rx), Math.round(ry)), img = imagesRef.current[PEAK_IMAGES[Math.floor(seed * PEAK_IMAGES.length)]];
                    if (img) { const iw = s * 2.4 * (0.9 + seed * 0.2), ih = img.height * (iw / img.width); drawIcon(img, wx + s/2 - iw/2, wy + s/2 - ih/2, iw, ih); }
                } else if (isFor(terrain)) {
                    const img = imagesRef.current[FOREST_IMAGES[0]];
                    if (img) {
                        for (let i = 0; i < (isMobile ? 6 : 10); i++) {
                            const ssX = getSeed(Math.round(rx) + i * 0.21, Math.round(ry) + i * 0.13), ssY = getSeed(Math.round(rx) + i * 0.47, Math.round(ry) + i * 0.29);
                            const sc = (s * 0.36 / Math.max(img.width, img.height)) * (0.8 + getSeed(i, i) * 0.4);
                            drawIcon(img, wx + ssX * s - (img.width * sc) / 2, wy + ssY * s - (img.height * sc) / 2, img.width * sc, img.height * sc);
                        }
                    }
                } else if (isHill(terrain)) {
                    const seed = getSeed(Math.round(rx), Math.round(ry)), img = imagesRef.current[HILL_IMAGES[0]];
                    if (img) { const iw = s * 1.8 * (0.9 + seed * 0.2), ih = img.height * (iw / img.width); drawIcon(img, wx + s/2 - iw/2, wy + s/2 - ih/2, iw, ih); }
                }

                const drawWallSide = (x1: number, y1: number, x2: number, y2: number, d: string) => {
                    const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, d);
                    if (!hasExit) {
                        const isB = norm === 'Building';
                        const dx = DIRS[d].dx, dy = DIRS[d].dy;
                        const irx = Math.round(rx), iry = Math.round(ry);
                        const nT = roomAtCoord[`${irx + dx},${iry + dy}`];
                        const sameBlob = nT && (nT === norm || (['Field', 'Forest', 'Grasslands'].includes(norm) && ['Field', 'Forest', 'Grasslands'].includes(nT)));
                        const nVisited = visitedAtCoord[`${irx + dx},${iry + dy}`];

                        // ELIMINATE GHOST LINES only for organic blobs and cities
                        const isOrganic = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'City'].includes(norm);
                        if (isOrganic && sameBlob && nVisited) return;

                        ctx.beginPath();
                        ctx.strokeStyle = isB ? (isDarkMode ? "rgba(88, 91, 112, 1.0)" : "rgba(76, 79, 105, 1.0)") : (isDarkMode ? "rgba(137, 180, 250, 0.4)" : "#3b82f6");
                        ctx.lineWidth = (isB ? 2.5 : 1.0) / camera.zoom; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                    } else if (hasDoor) {
                        const dx = x2 - x1, dy = y2 - y1; ctx.strokeStyle = isDarkMode ? "#fab387" : "#e67e22"; ctx.lineWidth = 3.5 / camera.zoom;
                        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + dx * 0.25, y1 + dy * 0.25); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25); ctx.stroke();
                        if (isClosed) { ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0 / camera.zoom; ctx.beginPath(); ctx.moveTo(x1 + dx * 0.25, y1 + dy * 0.25); ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25); ctx.stroke(); }
                    }
                };
                drawWallSide(wx, wy, wx+s, wy, 'n'); drawWallSide(wx, wy+s, wx+s, wy+s, 's'); drawWallSide(wx+s, wy, wx+s, wy+s, 'e'); drawWallSide(wx, wy, wx, wy+s, 'w');

                const activeMobFlags = (localRoom?.mobFlags || mobFlagsGhost || []), activeLoadFlags = (localRoom?.loadFlags || loadFlagsGhost || []);
                if (activeMobFlags.length > 0 || activeLoadFlags.length > 0) {
                    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${Math.max(10, 14 / camera.zoom)}px "Inter", sans-serif`;
                    let off = 0;
                    if (activeMobFlags.some((f: string) => f.includes('AGGRESSIVE'))) { ctx.fillStyle = '#f38ba8'; ctx.fillText('!', centerPX + off, centerPY); off += 8 / camera.zoom; }
                    if (activeMobFlags.some((f: string) => f.includes('SHOP'))) { ctx.fillStyle = '#f9e2af'; ctx.fillText('$', centerPX + off, centerPY); off += 8 / camera.zoom; }
                    if (activeLoadFlags.some((f: string) => f.includes('HERB') || f.includes('WATER'))) { ctx.fillStyle = '#a6e3a1'; ctx.fillText('*', centerPX + off, centerPY); }
                    ctx.restore();
                }

                if (activeId === `m_${vnum}`) {
                    ctx.save(); const grad = ctx.createRadialGradient(centerPX, centerPY, 0, centerPX, centerPY, s / 2.2);
                    grad.addColorStop(0, 'rgba(249, 226, 175, 0.8)'); grad.addColorStop(0.5, 'rgba(249, 226, 175, 0.3)'); grad.addColorStop(1, 'rgba(249, 226, 175, 0)');
                    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(centerPX, centerPY, s / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                }
                if (selectedRoomIds.has(`m_${vnum}`) || selectedRoomIds.has(vnum)) {
                    ctx.strokeStyle = isDarkMode ? '#89b4fa' : '#3b82f6'; ctx.lineWidth = 2 / camera.zoom;
                    ctx.setLineDash([4 * invZoom, 2 * invZoom]); ctx.strokeRect(wx + 3, wy + 3, s - 6, s - 6); ctx.setLineDash([]);
                }
                if (camera.zoom > 1.8) { ctx.font = '8px "Aniron"'; ctx.fillStyle = isDarkMode ? '#cdd6f4' : '#45475a'; ctx.textAlign = 'center'; ctx.fillText(rName.substring(0, 12), centerPX, wy + s * 0.95); }
                ctx.restore();
            });
        }
    }
};

export const drawLocalFeatures = (rCtx: RenderContext) => {
    const { ctx, now, ANIM_DUR, isDarkMode, invZoom, currentZ, allRooms, preloaded, firstExploredAtRef, roomAtCoord, visitedAtCoord, selectedRoomIds, activeId, camera } = rCtx;

    Object.values(allRooms).forEach((room: any) => {
        if (room.id.startsWith('m_')) return;
        const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) return;

        const getLGS = (rA: any, d: string) => {
            const exA = rA.exits?.[d], rId = String(rA.id).startsWith('m_') ? rA.id.substring(2) : rA.id, wEx = preloaded[rId]?.[4][d], effEx = exA || wEx; if (!effEx) return { hasExit: false };
            const tId = effEx.target, oD = DIRS[d]?.opp, nId = tId ? (String(tId).startsWith('m_') ? tId : `m_${tId}`) : null;
            const n = nId ? (allRooms[nId] || allRooms[tId] || (preloaded[String(tId)] ? { exits: preloaded[String(tId)][4] } : null)) : null, exB = n?.exits?.[oD];
            const isD = (n: string) => /\b(door|gate|portcullis|secret)\b/i.test(n), hasDF = (f?: any[]) => f?.some(x => /^(door|gate|portcullis|secret)$/i.test(String(x)));
            const hasD = !!(effEx.hasDoor || hasDF(effEx.flags) || isD(effEx.name||'') || exB?.hasDoor || hasDF(exB?.flags) || isD(exB?.name||'') || wEx?.hasDoor);
            if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };
            let isC = true; if (exA?.closed === false || exB?.closed === false) isC = false; else if (exA?.flags?.some((f: any) => String(f).toLowerCase() === 'closed')) isC = true;
            return { hasExit: true, hasDoor: hasD, isClosed: isC };
        };
        const drawLWS = (x1: number, y1: number, x2: number, y2: number, d: string) => {
            const { hasExit, hasDoor, isClosed } = getLGS(room, d);
            if (!hasExit) {
                const norm = normalizeTerrain(room.terrain);
                const isB = norm === 'Building';
                const dx = DIRS[d].dx, dy = DIRS[d].dy;
                const irx = Math.round(room.x), iry = Math.round(room.y);
                const nT = roomAtCoord[`${irx + dx},${iry + dy}`];
                const sameBlob = nT && (nT === norm || (['Field', 'Forest', 'Grasslands'].includes(norm) && ['Field', 'Forest', 'Grasslands'].includes(nT)));
                const nVisited = visitedAtCoord[`${irx + dx},${iry + dy}`];

                const isOrganic = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'City'].includes(norm);
                if (isOrganic && sameBlob && nVisited) return;

                ctx.beginPath();
                ctx.strokeStyle = isB ? (isDarkMode ? "rgba(88, 91, 112, 1.0)" : "rgba(76, 79, 105, 1.0)") : (isDarkMode ? "rgba(137, 180, 250, 0.4)" : "#3b82f6");
                ctx.lineWidth = (isB ? 2.5 : 1.0) / camera.zoom; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            } else if (hasDoor) {
                const dx = x2 - x1, dy = y2 - y1; ctx.strokeStyle = isDarkMode ? "#fab387" : "#e67e22"; ctx.lineWidth = 3.5 / camera.zoom;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + dx * 0.25, y1 + dy * 0.25); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25); ctx.stroke();
                if (isClosed) { ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0 / camera.zoom; ctx.beginPath(); ctx.moveTo(x1 + dx * 0.25, y1 + dy * 0.25); ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25); ctx.stroke(); }
            }
        };
        drawLWS(rx, ry, rx + s, ry, 'n'); drawLWS(rx, ry + s, rx + s, ry + s, 's'); drawLWS(rx + s, ry, rx + s, ry + s, 'e'); drawLWS(rx, ry, rx, ry + s, 'w');

        const rId = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
        const pData = preloaded[rId];
        const mobFG = (pData ? pData[7] : []) || [], loadFG = (pData ? pData[8] : []) || [];
        const activeMobFlags = (room.mobFlags || mobFG), activeLoadFlags = (room.loadFlags || loadFG);

        const p = Math.min(1, (now - (firstExploredAtRef.current[room.id] || now)) / ANIM_DUR);
        ctx.save();
        if (p < 1) {
            ctx.globalAlpha = p;
            ctx.translate(rx + s/2, ry + s/2); ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p); ctx.translate(-(rx + s/2), -(ry + s/2));
        }

        if (activeMobFlags.length > 0 || activeLoadFlags.length > 0) {
            ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const cX = rx + s/2, cY = ry + s/2;
            ctx.font = `bold ${Math.max(10, 14 / camera.zoom)}px "Inter", sans-serif`;
            let off = 0;
            if (activeMobFlags.some((f: string) => f.includes('AGGRESSIVE'))) { ctx.fillStyle = '#f38ba8'; ctx.fillText('!', cX + off, cY); off += 8 / camera.zoom; }
            if (activeMobFlags.some((f: string) => f.includes('SHOP'))) { ctx.fillStyle = '#f9e2af'; ctx.fillText('$', cX + off, cY); off += 8 / camera.zoom; }
            if (activeLoadFlags.some((f: string) => f.includes('HERB') || f.includes('WATER'))) { ctx.fillStyle = '#a6e3a1'; ctx.fillText('*', cX + off, cY); }
            ctx.restore();
        }

        if (activeId === room.id) {
            const cLX = rx + s / 2, cLY = ry + s / 2; ctx.save(); const grad = ctx.createRadialGradient(cLX, cLY, 0, cLX, cLY, s / 2.2);
            grad.addColorStop(0, 'rgba(249, 226, 175, 0.8)'); grad.addColorStop(0.5, 'rgba(249, 226, 175, 0.3)'); grad.addColorStop(1, 'rgba(249, 226, 175, 0)');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cLX, cLY, s / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (selectedRoomIds.has(room.id)) {
            ctx.strokeStyle = isDarkMode ? '#89b4fa' : '#3b82f6'; ctx.lineWidth = 2 / camera.zoom;
            ctx.setLineDash([4 * invZoom, 2 * invZoom]); ctx.strokeRect(rx + 3, ry + 3, s - 6, s - 6); ctx.setLineDash([]);
        }
        ctx.restore();
    });
};