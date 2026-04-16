import { RenderContext, drawLine, drawInkyLine } from './rendererUtils';
import { GRID_SIZE, DIRS, normalizeTerrain, ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT, getGateState, WALL_COLOR, LONG_CONNECTION_COLOR } from '../mapperUtils';

// Pre-render common indicators for performance
const indicatorIcons: Record<string, HTMLCanvasElement> = {};
export const getIndicatorIcon = (sym: string, color: string, outline: boolean = false) => {
    const key = `${sym}_${color}_${outline}`;
    if (indicatorIcons[key]) return indicatorIcons[key];
    const canvas = document.createElement('canvas');
    canvas.width = 24; canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    
    // Draw fading black background
    const gradient = ctx.createRadialGradient(12, 12, 4, 12, 12, 12);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(12, 12, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    
    if (outline) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeText(sym, 12, 12);
    } else {
        ctx.fillStyle = color;
        ctx.fillText(sym, 12, 12);
    }
    
    indicatorIcons[key] = canvas;
    return canvas;
};

export const drawRoomFlagsOptimized = (
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    zoom: number,
    mobF: string[],
    loadF: string[],
    questF: string[]
) => {
    let off = 0;
    const spacing = 12;
    const iconSize = 16;
    const drawnSymbols = new Set<string>();

    const indicators = [
        { regex: /QUEST|MISSION/i, sym: '?', color: '#fab387' },
        { regex: /SHOP|STORE/i, sym: '$', color: '#f9e2af' },
        { regex: /GUILD|OFFICE/i, sym: 'G', color: '#cba6f7' },
        { regex: /RENT|INN/i, sym: 'R', color: '#89b4fa' },
        { regex: /AGGRESSIVE|DEATH|DANGER/i, sym: '!', color: '#f38ba8', large: true },
        { regex: /STABLE|HORSE|MULE|PACK_HORSE|TRAINED_HORSE|WARG/i, sym: '♘', color: '#e8b86d', large: true },
        { regex: /HERB/i, sym: '♣', color: '#a6e3a1', large: true },
        { regex: /WATER|POND|WELL|FOUNTAIN/i, sym: '≈', color: '#89b4fa', large: true },
        { regex: /DARK/i, sym: '☾', color: '#cad3f5' },
        { regex: /NO_SUNDEATH/i, sym: '☠', color: '#ee99a0' }
    ];

    // 1. Special case: Quest Flags (always prioritized)
    if (questF.length > 0 || /QUEST|MISSION/i.test([...mobF, ...loadF].join('|'))) {
        const icon = getIndicatorIcon('?', '#fab387');
        ctx.drawImage(icon, anchorX + off - iconSize/2, anchorY - iconSize/2, iconSize, iconSize);
        off += spacing;
        drawnSymbols.add('?');
    }

    // 2. Process all other indicators
    const allFlagsStr = [...mobF, ...loadF].join('|').toUpperCase();
    for (const ind of indicators) {
        if (drawnSymbols.has(ind.sym)) continue;
        if (ind.regex.test(allFlagsStr)) {
            const currentIconSize = (ind as any).large ? 20 : iconSize;
            const icon = getIndicatorIcon(ind.sym, ind.color);
            ctx.drawImage(icon, anchorX + off - currentIconSize/2, anchorY - currentIconSize/2, currentIconSize, currentIconSize);
            off += spacing + ((ind as any).large ? 4 : 0);
            drawnSymbols.add(ind.sym);
        }
    }
};


export const drawFeatures = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, dpr, isDarkMode, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, camera, baseMapExitsRef } = rCtx;
    const s = GRID_SIZE;

    // Fast return if no buckets
    if (!floorIndex) return;

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const rData = preloaded[vnum];
                if (!rData) continue;

                const isExplored = explored.has(vnum);
                let isPeeked = false;
                const peekDirs: string[] = [];

                if (!isExplored && !unveilMap) {
                    const ghostExits = rData[4];
                    if (ghostExits) {
                        for (const dir of ['n', 's', 'e', 'w']) {
                            const exit = ghostExits[dir];
                            if (exit && explored.has(String(exit.target))) {
                                isPeeked = true;
                                peekDirs.push(dir);
                            }
                        }
                    }
                }

                if (!isExplored && !isPeeked && !unveilMap) continue;

                const rx = rData[0], ry = rData[1], tSector = rData[3], ghostExits = rData[4];
                const wx = Math.round(rx) * s, wy = Math.round(ry) * s;
                const anchorX = rx * s + s / 2, anchorY = ry * s + s / 2;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];

                // Calculate fade-in for newly explored rooms (skip for active room)
                let exploredAlphaMul = 1.0;
                const isActive = vnum && rCtx.activeId && (
                    vnum === rCtx.activeId || 
                    `m_${vnum}` === rCtx.activeId || 
                    vnum === `m_${rCtx.activeId}`
                );
                if (!isActive && isExplored && rCtx.firstExploredAtRef.current[vnum]) {
                    const elapsed = rCtx.now - rCtx.firstExploredAtRef.current[vnum];
                    const animDur = 800;
                    if (elapsed < animDur) {
                        exploredAlphaMul = elapsed / animDur;
                        rCtx.triggerRender?.();
                    }
                }

                // 1. Roads and trails (Zoom >= 0.1)
                if (ghostExits && Object.keys(ghostExits).length > 0 && camera.zoom >= 0.1) {
                    const currentRoomObj = localRoom || { terrain: tSector, exits: {} };
                    const isCurrentRoad = normalizeTerrain(currentRoomObj.terrain) === 'Road';
                    for (const dir in ghostExits) {
                        const exObj = ghostExits[dir]; if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && (Math.abs(targetData[2] - currentZ) <= 0.5 || ((dir === 'u' || dir === 'd') && Math.abs(targetData[2] - currentZ) <= 1.5))) {
                            const isTargetExplored = explored.has(targetVnum);
                            
                            // Only show exit if at least one side is explored (or both are peeked/unveiled)
                            if (!unveilMap && !isExplored && !isTargetExplored) continue;

                            const ardaMapping = preloaded[vnum];
                            const sId = ardaMapping ? String(ardaMapping[6]) : vnum;
                            const ardaExit = baseMapExitsRef.current[sId]?.[4]?.[dir];

                            const combinedFlags = [
                                ...(ardaExit?.flags || []),
                                ...(currentRoomObj.exits?.[dir]?.flags || []),
                                ...(exObj.flags || [])
                            ];
                            const hasRoadFlag = combinedFlags.some((f: string) => /road|trail|path/i.test(String(f)));
                            
                            const tpx = targetData[0] * s + s / 2, tpy = targetData[1] * s + s / 2;
                            ctx.save();
                            if (!isExplored) ctx.globalAlpha = 0.4;
                            else ctx.globalAlpha = exploredAlphaMul;

                            if (hasRoadFlag) {
                                const roadWidth = 12;
                                const pathWidth = 6;
                                if (isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road') drawLine(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? ROAD_COLOR_DARK : ROAD_COLOR_LIGHT, roadWidth, dpr, invZoom);
                                else drawLine(ctx, anchorX, anchorY, tpx, tpy, isDarkMode ? PATH_COLOR_DARK : PATH_COLOR_LIGHT, pathWidth, dpr, invZoom);
                            }

                            // --- 1.1 Vertical Arrow Connections (Bidirectional Only) ---
                            if ((dir === 'u' || dir === 'd') && camera.zoom > 0.2) {
                                const oppDir = dir === 'u' ? 'd' : 'u';
                                const targetExits = targetData[4];
                                const pointsBack = targetExits?.[oppDir] && 
                                    String(targetExits[oppDir].target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                                if (pointsBack) {
                                    const iconColor = isDarkMode ? '#fab387' : '#e67e22';
                                    const cOff = 12; // Corner offset
                                    const startX = anchorX + (dir === 'u' ? -cOff : cOff);
                                    const startY = anchorY + (dir === 'u' ? -cOff : cOff);
                                    const endX = tpx + (dir === 'u' ? cOff : -cOff);
                                    const endY = tpy + (dir === 'u' ? cOff : -cOff);
                                    
                                    ctx.save();
                                    ctx.globalAlpha = isExplored ? exploredAlphaMul * 0.6 : 0.3;
                                    drawLine(ctx, startX, startY, endX, endY, iconColor, 1.5, dpr, invZoom, true);
                                    ctx.restore();
                                }
                            }
                            ctx.restore();
                        }
                    }
                }

                // 2. High-Detail Walls and Doors (Zoom > 0.15)
                if (camera.zoom > 0.15) {
                    ctx.save();
                    if (isPeeked) ctx.globalAlpha = 0.4;
                    else if (isExplored) ctx.globalAlpha = exploredAlphaMul;

                    for (const d of ['n', 's', 'e', 'w']) {
                        const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, d, allRooms, preloaded);
                        let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                        if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }

                        if (!hasExit) {
                            drawInkyLine(ctx, x1, y1, x2, y2, WALL_COLOR, 3.0, dpr, invZoom);
                        } else if (hasDoor) {
                            const ddx = x2 - x1, ddy = y2 - y1;
                            ctx.strokeStyle = WALL_COLOR;
                            ctx.lineWidth = 3.5;
                            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                            if (isClosed) {
                                ctx.strokeStyle = "#ffcc00";
                                ctx.lineWidth = 4.0;
                                ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                            } else {
                                // Open door indicator: little yellow squares touching the posts
                                ctx.fillStyle = "#ffcc00";
                                const sqSize = 4.0;
                                if (ddx === 0) { // Vertical wall
                                    ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.25, sqSize, sqSize);
                                    ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.75 - sqSize, sqSize, sqSize);
                                } else { // Horizontal wall
                                    ctx.fillRect(x1 + ddx * 0.25, y1 - sqSize/2, sqSize, sqSize);
                                    ctx.fillRect(x1 + ddx * 0.75 - sqSize, y1 - sqSize/2, sqSize, sqSize);
                                }
                            }
                        }
                    }
                    ctx.restore();
                }

                // 3. Indicators and Flags (Zoom > 0.2)
                if (camera.zoom > 0.2) {
                    const hasLiveMob = localRoom?.mobFlags && localRoom.mobFlags.length > 0;
                    const hasLiveLoad = localRoom?.loadFlags && localRoom.loadFlags.length > 0;
                    
                    const mobF = hasLiveMob ? localRoom.mobFlags! : (rData[7] || []);
                    const loadF = hasLiveLoad ? localRoom.loadFlags! : (rData[8] || []);
                    const questF = localRoom?.roomQuestFlags || [];

                    const finalMobF = [...mobF];
                    // Skip synthetic map icons for DARK/SUNDEATH as per user request
                    // Shading is handled in drawTerrains.ts

                    if (finalMobF.length > 0 || loadF.length > 0 || questF.length > 0) {
                        ctx.save();
                        if (isPeeked) {
                            ctx.globalAlpha = 0.4;
                        } else if (isExplored) {
                            ctx.globalAlpha = exploredAlphaMul;
                        }
                        drawRoomFlagsOptimized(ctx, anchorX, anchorY, camera.zoom, finalMobF, loadF, questF);
                        ctx.restore();
                    }

                    if (ghostExits && (ghostExits.u || ghostExits.d)) {
                        const iconColor = isDarkMode ? '#fab387' : '#e67e22';
                        const cOff = 12; // NW/SE Corner displacement
                        const arrowSize = 18;
                        
                        ctx.save();
                        if (isPeeked) ctx.globalAlpha = 0.35;
                        else if (isExplored) ctx.globalAlpha = exploredAlphaMul;
                        
                        if (ghostExits.u) {
                            const { hasDoor, isClosed } = getGateState(localRoom, ghostExits, 'u', allRooms, preloaded);
                            const finalColor = hasDoor ? "#ffcc00" : iconColor;
                            const isOutline = hasDoor && !isClosed;
                            const icon = getIndicatorIcon('▲', finalColor, isOutline);
                            ctx.drawImage(icon, anchorX - cOff - arrowSize/2, anchorY - cOff - arrowSize/2, arrowSize, arrowSize);
                        }
                        if (ghostExits.d) {
                            const { hasDoor, isClosed } = getGateState(localRoom, ghostExits, 'd', allRooms, preloaded);
                            const finalColor = hasDoor ? "#ffcc00" : iconColor;
                            const isOutline = hasDoor && !isClosed;
                            const icon = getIndicatorIcon('▼', finalColor, isOutline);
                            ctx.drawImage(icon, anchorX + cOff - arrowSize/2, anchorY + cOff - arrowSize/2, arrowSize, arrowSize);
                        }

                        // --- Internal Dotted Connection (Bidirectional Validation) ---
                        if (ghostExits.u && ghostExits.d) {
                            const uTargetVnum = String(ghostExits.u.target), dTargetVnum = String(ghostExits.d.target);
                            const uTarget = preloaded[uTargetVnum], dTarget = preloaded[dTargetVnum];
                            const uPointsBack = uTarget?.[4]?.d && String(uTarget[4].d.target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');
                            const dPointsBack = dTarget?.[4]?.u && String(dTarget[4].u.target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                            if (uPointsBack && dPointsBack) {
                                ctx.save();
                                ctx.globalAlpha = isExplored ? exploredAlphaMul * 0.6 : 0.3;
                                drawLine(ctx, anchorX - cOff, anchorY - cOff, anchorX + cOff, anchorY + cOff, iconColor, 1.5, dpr, invZoom, true);
                                ctx.restore();
                            }
                        }
                        
                        ctx.restore();
                    }
                }
            }
        }
    }

    // --- Fast Wall Pass (Low Zoom) ---
    if (camera.zoom <= 0.15) {
        ctx.beginPath(); ctx.strokeStyle = WALL_COLOR;
        ctx.lineWidth = 2.5;
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (!explored.has(vnum) && !unveilMap) continue;
                    const rData = preloaded[vnum];
                    const rx = rData[0], ry = rData[1], ghostExits = rData[4];
                    const wx = Math.round(rx) * s, wy = Math.round(ry) * s;
                    const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                    const exits = localRoom?.exits || ghostExits;
                    for (const d of ['n', 's', 'e', 'w']) {
                        if (!exits || !exits[d]) {
                            let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                            if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                            drawInkyLine(ctx, x1, y1, x2, y2, WALL_COLOR, 3.0, dpr, invZoom);
                        }
                    }
                }
            }
        }
    }
};

export const drawLocalFeatures = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, preloaded, camera, allRooms, dpr, invZoom, baseMapExitsRef } = rCtx;
    const s = GRID_SIZE;

    for (const room of localRooms) {
        const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
        if (preloaded[vnum]) continue;
        if (Math.abs((room.z || 0) - currentZ) > 1.5) continue;
        const wx = room.x * s, wy = room.y * s, cX = wx + s / 2, cY = wy + s / 2;

        // Local Connections
        if (room.exits) {
            for (const d in room.exits) {
                const ex = room.exits[d]; if (!ex) continue;
                const tV = String(ex.target || ex.gmcpDestId || "");
                if (!tV) continue;
                const nId = tV.startsWith('m_') ? tV : `m_${tV}`;
                const n = allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { x: preloaded[tV][0], y: preloaded[tV][1], z: preloaded[tV][2] } : null);
                if (n && (Math.abs((n.z || 0) - currentZ) <= 0.5)) {
                    const dx = Math.abs(room.x - n.x), dy = Math.abs(room.y - n.y);
                    if (dx > 1.1 || dy > 1.1 || d === 'u' || d === 'd') {
                        const tpx = n.x * s + s / 2, tpy = n.y * s + s / 2;
                        drawLine(ctx, cX, cY, tpx, tpy, LONG_CONNECTION_COLOR, 2, dpr, invZoom);

                        // --- Local Vertical Arrow Connections (Bidirectional Only) ---
                        if ((d === 'u' || d === 'd') && camera.zoom > 0.2) {
                            const oD = d === 'u' ? 'd' : 'u';
                            const pointsBack = n?.exits?.[oD] && 
                                String(n.exits[oD].target || n.exits[oD].gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');

                            if (pointsBack) {
                                const iconColor = isDarkMode ? '#fab387' : '#e67e22';
                                const cOff = 12;
                                const startX = cX + (d === 'u' ? -cOff : cOff);
                                const startY = cY + (d === 'u' ? -cOff : cOff);
                                const endX = tpx + (d === 'u' ? cOff : -cOff);
                                const endY = tpy + (d === 'u' ? cOff : -cOff);
                                
                                ctx.save();
                                ctx.globalAlpha = 0.6;
                                drawLine(ctx, startX, startY, endX, endY, iconColor, 1.5, dpr, invZoom, true);
                                ctx.restore();
                            }
                        }
                    }
                }
            }
        }

        // Local Up/Down Indicators
        if (room.exits && (room.exits.u || room.exits.d) && camera.zoom > 0.2) {
            const vOff = 10;
            const arrowSize = 18;
            if (room.exits.u) {
                const { hasDoor, isClosed } = getGateState(room, null, 'u', allRooms, preloaded);
                const finalColor = hasDoor ? "#ffcc00" : (isDarkMode ? '#fab387' : '#e67e22');
                const isOutline = hasDoor && !isClosed;
                const icon = getIndicatorIcon('▲', finalColor, isOutline);
                ctx.drawImage(icon, cX - 12 - arrowSize/2, cY - 12 - arrowSize/2, arrowSize, arrowSize);
            }
            if (room.exits.d) {
                const { hasDoor, isClosed } = getGateState(room, null, 'd', allRooms, preloaded);
                const finalColor = hasDoor ? "#ffcc00" : (isDarkMode ? '#fab387' : '#e67e22');
                const isOutline = hasDoor && !isClosed;
                const icon = getIndicatorIcon('▼', finalColor, isOutline);
                ctx.drawImage(icon, cX + 12 - arrowSize/2, cY + 12 - arrowSize/2, arrowSize, arrowSize);
            }

            // --- Local Internal Dotted Connection (Bidirectional Validation) ---
            if (room.exits.u && room.exits.d) {
                const uTargetId = String(room.exits.u.target || room.exits.u.gmcpDestId || "");
                const dTargetId = String(room.exits.d.target || room.exits.d.gmcpDestId || "");
                const uN = allRooms[uTargetId.startsWith('m_') ? uTargetId : `m_${uTargetId}`] || allRooms[uTargetId];
                const dN = allRooms[dTargetId.startsWith('m_') ? dTargetId : `m_${dTargetId}`] || allRooms[dTargetId];
                
                const uPointsBack = uN?.exits?.d && String(uN.exits.d.target || uN.exits.d.gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');
                const dPointsBack = dN?.exits?.u && String(dN.exits.u.target || dN.exits.u.gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');

                if (uPointsBack && dPointsBack) {
                    const iconColor = isDarkMode ? '#fab387' : '#e67e22';
                    ctx.save();
                    ctx.globalAlpha = 0.6;
                    drawLine(ctx, cX - 12, cY - 12, cX + 12, cY + 12, iconColor, 1.5, dpr, invZoom, true);
                    ctx.restore();
                }
            }
        }
    }

    // --- Local Wall Rendering ---
    if (camera.zoom <= 0.15) {
        ctx.beginPath(); ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 2.5;
        for (const room of localRooms) {
            const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            if (preloaded[vnum] || Math.abs((room.z || 0) - currentZ) > 1.5) continue;
            const wx = room.x * s, wy = room.y * s;
            for (const d of ['n', 's', 'e', 'w']) {
                if (!room.exits || !room.exits[d]) {
                    let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                    if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                }
            }
        }
        ctx.stroke();
    } else {
        for (const room of localRooms) {
            const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            if (preloaded[vnum] || Math.abs((room.z || 0) - currentZ) > 1.5) continue;
            const wx = room.x * s, wy = room.y * s;
            for (const d of ['n', 's', 'e', 'w']) {
                const rId = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
                const wEx = preloaded[rId]?.[4]?.[d];
                const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, d, allRooms, preloaded);
                let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                if (!hasExit) {
                    drawInkyLine(ctx, x1, y1, x2, y2, WALL_COLOR, 3.0, dpr, invZoom);
                } else if (hasDoor && camera.zoom >= 0.1) {
                    const ddx = x2 - x1, ddy = y2 - y1; ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 3.5;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                    if (isClosed) { 
                        ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 4.0; ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke(); 
                    } else {
                        // Open door indicator: little yellow squares touching the posts
                        ctx.fillStyle = "#ffcc00";
                        const sqSize = 4.0;
                        if (ddx === 0) { // Vertical wall
                            ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.25, sqSize, sqSize);
                            ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.75 - sqSize, sqSize, sqSize);
                        } else { // Horizontal wall
                            ctx.fillRect(x1 + ddx * 0.25, y1 - sqSize/2, sqSize, sqSize);
                            ctx.fillRect(x1 + ddx * 0.75 - sqSize, y1 - sqSize/2, sqSize, sqSize);
                        }
                    }
                }
            }
        }
    }

    // --- Local Flags ---
    if (camera.zoom > 0.2) {
        for (const room of localRooms) {
            const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            if (preloaded[vnum] || Math.abs((room.z || 0) - currentZ) > 1.5) continue;
            const wx = room.x * s, wy = room.y * s, cX = wx + s / 2, cY = wy + s / 2;
            const mobF = room.mobFlags || [], loadF = room.loadFlags || [], questF = room.roomQuestFlags || [];
            if (mobF.length > 0 || loadF.length > 0 || questF.length > 0) {
                drawRoomFlagsOptimized(ctx, cX, cY, camera.zoom, mobF, loadF, questF);
            }
        }
    }
};
