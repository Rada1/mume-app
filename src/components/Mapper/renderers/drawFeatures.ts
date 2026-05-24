import { RenderContext, drawLine, drawInkyLine } from './rendererUtils';
import { getZoneVisuals } from '../zoneFilters';
import { GRID_SIZE, DIRS, normalizeTerrain, ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT, getGateState, WALL_COLOR, LONG_CONNECTION_COLOR } from '../mapperUtils';

const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

// Pre-render common indicators for performance
const indicatorIcons: Record<string, HTMLCanvasElement> = {};
export const getIndicatorIcon = (
    sym: string,
    color: string,
    outline: boolean = false,
    glowStrength: number = 7,
    noBackground: boolean = false,
    noBlackBg: boolean = false,
    size: number = 16
) => {
    const key = `${sym}_${color}_${outline}_${glowStrength}_${noBackground}_${noBlackBg}_${size}`;
    if (indicatorIcons[key]) return indicatorIcons[key];
    const canvas = document.createElement('canvas');
    
    // Calculate padding dynamically based on glowStrength to prevent clipping
    const padding = Math.max(8, Math.round(glowStrength * 1.2));
    const canvasSize = size + padding * 2;
    canvas.width = canvasSize; canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!;
    const center = canvasSize / 2;

    if (!noBackground && !noBlackBg) {
        // Draw fading black background for contrast
        const bgGradient = ctx.createRadialGradient(center, center, size * 0.25, center, center, size * 0.75);
        bgGradient.addColorStop(0, glowStrength > 10 ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.85)');
        bgGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.75, 0, Math.PI * 2);
        ctx.fill();
    }

    // For high-glow icons, draw a colored outer bloom ring/gradient
    if (!noBackground && glowStrength > 10) {
        const coloredGlow = ctx.createRadialGradient(center, center, size * 0.1, center, center, size * 0.9);
        if (noBlackBg) {
            // A more solid center bloom fading outwards when there is no black background
            coloredGlow.addColorStop(0, hexToRgba(color, 0.3));
            coloredGlow.addColorStop(0.5, hexToRgba(color, 0.1));
            coloredGlow.addColorStop(1, hexToRgba(color, 0.0));
        } else {
            // Ring bloom (legacy/contrast mode)
            coloredGlow.addColorStop(0, hexToRgba(color, 0.0));
            coloredGlow.addColorStop(0.55, hexToRgba(color, 0.22));
            coloredGlow.addColorStop(1, hexToRgba(color, 0.0));
        }
        ctx.fillStyle = coloredGlow;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    } else if (!noBackground) {
        const glowGradient = ctx.createRadialGradient(center, center, size * 0.15, center, center, size * 0.8);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        glowGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.font = `bold ${size}px "Inter", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    if (outline) {
        ctx.shadowBlur = glowStrength;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        ctx.strokeText(sym, center, center);
        ctx.shadowBlur = 0;
    } else if (glowStrength > 10) {
        // Multi-pass bloom for heavy glow on the icon itself
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = glowStrength * 1.5;
        ctx.fillText(sym, center, center);
        ctx.globalAlpha = 0.55;
        ctx.shadowBlur = glowStrength * 0.75;
        ctx.fillText(sym, center, center);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = glowStrength * 0.3;
        ctx.fillText(sym, center, center);
        ctx.shadowBlur = 0;
    } else {
        ctx.shadowBlur = glowStrength;
        ctx.shadowColor = color;
        ctx.fillText(sym, center, center);
        ctx.shadowBlur = 0;
    }

    indicatorIcons[key] = canvas;
    return canvas;
};

const drawClimbIndicator = (
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number,
    s: number,
    d: string,
    invZoom: number,
    wallColor: string,
) => {
    const isNS = d === 'n' || d === 's';
    const margin = 7;
    const amp = 3.5;
    const waves = 3;
    const steps = 32;

    // Baseline runs along the exit edge
    const x0 = isNS ? wx + margin : (d === 'e' ? wx + s : wx);
    const y0 = isNS ? (d === 'n' ? wy : wy + s) : wy + margin;
    const totalDx = isNS ? s - margin * 2 : 0;
    const totalDy = isNS ? 0 : s - margin * 2;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = 2.0 * invZoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 1.5 * invZoom;
    ctx.shadowOffsetY = 2.5 * invZoom;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wave = Math.sin(t * Math.PI * 2 * waves) * amp;
        const px = x0 + totalDx * t + (isNS ? 0 : wave);
        const py = y0 + totalDy * t + (isNS ? wave : 0);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
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
    type Indicator = { regex: RegExp, sym: string, color: string, size: number, glowStrength?: number, noBlackBg?: boolean };

    // Priority order: danger first, then services, then loot/resources
    const indicators: Indicator[] = [
        // --- Danger ---
        { regex: /DEATHTRAP/i,                                          sym: '☠', color: '#ff3030', size: 20, glowStrength: 14, noBlackBg: true },
        { regex: /AGGRESSIVE_MOB/i,                                     sym: '!', color: '#ff2020', size: 26, glowStrength: 12, noBlackBg: true },
        { regex: /SUPER_MOB/i,                                          sym: '★', color: '#ff6060', size: 16 },
        { regex: /ELITE_MOB/i,                                          sym: '✦', color: '#f38ba8', size: 13 },
        { regex: /RATTLESNAKE/i,                                        sym: '🐍', color: '#ff3030', size: 15, glowStrength: 10, noBlackBg: true },
        // --- Quest / mission ---
        { regex: /QUEST/i,                                              sym: '?', color: '#00c0ff', size: 22 },
        // --- Mob services ---
        { regex: /RENT/i,                                               sym: 'R', color: '#89b4fa', size: 13 },
        { regex: /WEAPON_SHOP/i,                                        sym: '⚔', color: '#bac2de', size: 13 },
        { regex: /ARMOUR_SHOP/i,                                        sym: 'A', color: '#a6adc8', size: 13 },
        { regex: /FOOD_SHOP/i,                                          sym: 'F', color: '#fab387', size: 13 },
        { regex: /PET_SHOP/i,                                           sym: '♞', color: '#e8b86d', size: 13 },
        { regex: /SHOP/i,                                               sym: '$', color: '#f9e2af', size: 13 },
        { regex: /GUILD/i,                                              sym: 'G', color: '#cba6f7', size: 13 },
        { regex: /MILKABLE/i,                                           sym: '🐄', color: '#e8d5c0', size: 13 },
        { regex: /PASSIVE_MOB/i,                                        sym: '·', color: '#6c7086', size: 14 },
        // --- Valuables ---
        { regex: /TREASURE/i,                                           sym: '💰', color: '#ffd700', size: 14 },
        { regex: /WEAPON(?!_SHOP)/i,                                    sym: '🗡', color: '#bac2de', size: 15 },
        { regex: /ARMOUR(?!_SHOP)/i,                                    sym: '🛡', color: '#9399b2', size: 13 },
        { regex: /EQUIPMENT/i,                                          sym: '⚙', color: '#9399b2', size: 13 },
        { regex: /KEY/i,                                                sym: '🔑', color: '#f9e2af', size: 13 },
        // --- Resources ---
        { regex: /HERB/i,                                               sym: '♣', color: '#a6e3a1', size: 15 },
        { regex: /WATER|POND|WELL|FOUNTAIN/i,                           sym: '≈', color: '#89b4fa', size: 15 },
        { regex: /FOOD(?!_SHOP)/i,                                      sym: '🍖', color: '#fab387', size: 13 },
        // --- Mounts / transport ---
        { regex: /ROHIRRIM|WARG|PACK_HORSE|TRAINED_HORSE|HORSE|MULE|STABLE/i, sym: '♘', color: '#e8b86d', size: 15 },
        { regex: /BOAT/i,                                               sym: '🛶', color: '#74c7ec', size: 14 },
        { regex: /FERRY/i,                                              sym: '⌑', color: '#5fb3e0', size: 14 },
        { regex: /COACH/i,                                              sym: 'C', color: '#c9a66b', size: 13 },
        // --- Infrastructure ---
        { regex: /TOWER/i,                                              sym: '△', color: '#9399b2', size: 14 },
        { regex: /MAIL/i,                                               sym: '✉', color: '#cdd6f4', size: 13 },
        { regex: /CLOCK/i,                                              sym: '◔', color: '#f9e2af', size: 13 },
        { regex: /ATTENTION/i,                                          sym: '⚑', color: '#fab387', size: 13 },
        { regex: /WHITE_WORD/i,                                         sym: 'W', color: '#eeeeee', size: 12 },
        { regex: /DARK_WORD/i,                                          sym: 'D', color: '#7f849c', size: 12 },
    ];

    const allFlagsStr = [...mobF, ...loadF].join('|').toUpperCase();
    const hasQuest = questF.length > 0 || /QUEST/i.test(allFlagsStr);

    // First pass: collect matching indicators (deduplicated by symbol)
    const matched: Indicator[] = [];
    const seenSyms = new Set<string>();
    for (const ind of indicators) {
        if (seenSyms.has(ind.sym)) continue;
        const matches = ind.sym === '?' ? hasQuest : ind.regex.test(allFlagsStr);
        if (matches) { matched.push(ind); seenSyms.add(ind.sym); }
    }

    // Draw centered on anchorX
    const totalW = matched.reduce((sum, ind) => sum + ind.size + 4, 0);
    let off = -totalW / 2 + (matched[0]?.size ?? 0) / 2;
    for (const ind of matched) {
        const icon = getIndicatorIcon(ind.sym, ind.color, false, ind.glowStrength, false, true, ind.size);
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        ctx.drawImage(icon, anchorX + off - icon.width / 2, anchorY - icon.height / 2);
        ctx.restore();
        off += ind.size + 4;
    }
};

export const drawFeatures = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, dpr, isDarkMode, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, camera, baseMapExitsRef } = rCtx;
    const wallColor = rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
    const s = GRID_SIZE;

    // Fast return if no buckets
    if (!floorIndex) return;

    // Compute two-ring fog-of-war visibility sets
    const ring1Revealed = new Set<string>(); // adjacent to explored → grayscale terrain, no flags
    const ring2Peeked = new Set<string>();   // adjacent to ring-1 → faint wall hints only
    if (!unveilMap) {
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (explored.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData?.[4]) continue;
                    for (const dir of ['n', 's', 'e', 'w']) {
                        const exit = rData[4][dir];
                        if (exit && explored.has(String(exit.target))) { ring1Revealed.add(vnum); break; }
                    }
                }
            }
        }
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (explored.has(vnum) || ring1Revealed.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData?.[4]) continue;
                    for (const dir of ['n', 's', 'e', 'w']) {
                        const exit = rData[4][dir];
                        if (exit && ring1Revealed.has(String(exit.target))) { ring2Peeked.add(vnum); break; }
                    }
                }
            }
        }
    }

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const rData = preloaded[vnum];
                if (!rData) continue;

                const isExplored = explored.has(vnum);
                const isRevealed = !isExplored && ring1Revealed.has(vnum);
                let isPeeked = false;
                const peekDirs: string[] = [];

                if (!isExplored && !isRevealed && !unveilMap) {
                    const ghostExits = rData[4];
                    if (ghostExits && ring2Peeked.has(vnum)) {
                        for (const dir of ['n', 's', 'e', 'w']) {
                            const exit = ghostExits[dir];
                            if (exit && ring1Revealed.has(String(exit.target))) {
                                isPeeked = true;
                                peekDirs.push(dir);
                            }
                        }
                    }
                }

                if (!isExplored && !isRevealed && !isPeeked && !unveilMap) continue;

                const rx = rData[0], ry = rData[1], tSector = rData[3], ghostExits = rData[4];
                const wx = Math.round(rx) * s, wy = Math.round(ry) * s;
                const anchorX = rx * s + s / 2, anchorY = ry * s + s / 2;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const zoneName = localRoom?.zone || rData[9] || '';
                const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
                const currentWallColor = zoneVis.wallColor || rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
                const currentDoorColor = zoneVis.doorColor || rCtx.mapTileVisuals?.doorColor || '#ffcc00';

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

                // 1. Roads and trails (Zoom >= 0.15 or reveal all mode)
                if (ghostExits && Object.keys(ghostExits).length > 0 && (camera.zoom >= 0.15 || unveilMap)) {
                    const currentRoomObj = localRoom || { terrain: tSector, exits: {} };
                    const isCurrentRoad = normalizeTerrain(currentRoomObj.terrain) === 'Road';
                    for (const dir in ghostExits) {
                        const exObj = ghostExits[dir]; if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && (Math.abs(targetData[2] - currentZ) <= 0.5 || ((dir === 'u' || dir === 'd') && Math.abs(targetData[2] - currentZ) <= 1.5))) {
                            const isTargetExplored = explored.has(targetVnum);
                            const isTargetRevealed = ring1Revealed.has(targetVnum);

                            // Show exit if at least one side is explored or ring-1 revealed
                            if (!unveilMap && !isExplored && !isRevealed && !isTargetExplored && !isTargetRevealed) continue;

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
                            if (!isExplored && !isRevealed) ctx.globalAlpha = 0.15;
                            else if (isRevealed) ctx.globalAlpha = 0.3;
                            else ctx.globalAlpha = exploredAlphaMul;

                            if (hasRoadFlag) {
                                ctx.save();
                                const isRoad = isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road';
                                const defaultRoadColor = isDarkMode
                                    ? (isRoad ? ROAD_COLOR_DARK : PATH_COLOR_DARK)
                                    : (isRoad ? ROAD_COLOR_LIGHT : PATH_COLOR_LIGHT);
                                const roadColor = isRoad
                                    ? (zoneVis.roadColor || defaultRoadColor)
                                    : (zoneVis.pathColor || defaultRoadColor);
                                const lineWidth = isRoad ? 12 : 6;

                                if (unveilMap) {
                                    drawLine(ctx, anchorX, anchorY, tpx, tpy, roadColor, lineWidth, dpr, invZoom);
                                } else if (!isExplored && !isRevealed) {
                                    // Ring-2 peeked → skip; the ring-1 side will draw toward us
                                } else if (!isTargetExplored && !isTargetRevealed) {
                                    // Explored/revealed → unknown: fade to transparent
                                    const grad = ctx.createLinearGradient(anchorX, anchorY, tpx, tpy);
                                    grad.addColorStop(0, roadColor);
                                    grad.addColorStop(1, hexToRgba(roadColor, 0));
                                    ctx.strokeStyle = grad;
                                    ctx.lineWidth = lineWidth;
                                    ctx.globalAlpha = isRevealed ? 0.25 : exploredAlphaMul;
                                    ctx.beginPath();
                                    ctx.moveTo(anchorX, anchorY);
                                    ctx.lineTo(tpx, tpy);
                                    ctx.stroke();
                                } else {
                                    // Both visible (explored or revealed)
                                    let alpha = 1.0;
                                    if (!isExplored || !isTargetExplored) {
                                        alpha = (isExplored || isTargetExplored) ? 0.6 : 0.3;
                                    }
                                    ctx.globalAlpha = alpha * exploredAlphaMul;
                                    drawLine(ctx, anchorX, anchorY, tpx, tpy, roadColor, lineWidth, dpr, invZoom);
                                }
                                ctx.restore();
                            }

                            // --- 1.1 Vertical Arrow Connections (Bidirectional Only) ---
                            if ((dir === 'u' || dir === 'd') && camera.zoom > 0.3) {
                                const oppDir = dir === 'u' ? 'd' : 'u';
                                const targetExits = targetData[4];
                                const pointsBack = targetExits?.[oppDir] &&
                                    String(targetExits[oppDir].target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                                if (pointsBack) {
                                    const iconColor = 'rgba(148, 163, 184, 0.8)';
                                    const cOff = 12;
                                    const startX = anchorX + (dir === 'u' ? -cOff : cOff);
                                    const startY = anchorY + (dir === 'u' ? -cOff : cOff);
                                    const endX = tpx + (dir === 'u' ? cOff : -cOff);
                                    const endY = tpy + (dir === 'u' ? cOff : -cOff);

                                    ctx.save();
                                    ctx.globalAlpha = isExplored ? exploredAlphaMul * 0.5 : 0.2;
                                    drawLine(ctx, startX, startY, endX, endY, iconColor, 1.5, dpr, invZoom, true);
                                    ctx.restore();
                                }
                            }
                            ctx.restore();
                        }
                    }
                }

                // 2. High-Detail Walls and Doors (Zoom > 0.3)
                if (camera.zoom > 0.3) {
                    ctx.save();
                    if (isPeeked) {
                        // Clip wall drawing to sides facing ring-1 revealed neighbors
                        const clipExtent = s * 0.7;
                        ctx.beginPath();
                        for (const pd of peekDirs) {
                            if (pd === 'n') ctx.rect(wx, wy, s, clipExtent);
                            else if (pd === 's') ctx.rect(wx, wy + s - clipExtent, s, clipExtent);
                            else if (pd === 'e') ctx.rect(wx + s - clipExtent, wy, clipExtent, s);
                            else if (pd === 'w') ctx.rect(wx, wy, clipExtent, s);
                        }
                        ctx.clip();
                        ctx.globalAlpha = 0.2;
                    } else if (isRevealed) {
                        ctx.globalAlpha = 0.35;
                    } else if (isExplored) ctx.globalAlpha = exploredAlphaMul;

                    for (const d of ['n', 's', 'e', 'w']) {
                        const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, d, allRooms, preloaded);
                        let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                        if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }

                        if (!hasExit) {
                            drawInkyLine(ctx, x1, y1, x2, y2, currentWallColor, 3.0, dpr, invZoom);
                        } else if (hasDoor) {
                            const ddx = x2 - x1, ddy = y2 - y1;
                            // Clip to this room's tile so the door doesn't bleed into the neighbor
                            ctx.save();
                            ctx.beginPath(); ctx.rect(wx, wy, s, s); ctx.clip();
                            // Brown post segments with drop shadow
                            ctx.save();
                            ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
                            ctx.shadowBlur = 6 * invZoom;
                            ctx.shadowOffsetX = 1.5 * invZoom;
                            ctx.shadowOffsetY = 2.0 * invZoom;
                            ctx.strokeStyle = currentWallColor;
                            ctx.lineWidth = 3.5;
                            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                            ctx.restore();

                            // Yellow door elements with glow
                            ctx.save();
                            ctx.fillStyle = currentDoorColor;
                            ctx.shadowBlur = 8;
                            ctx.shadowColor = currentDoorColor;
                            if (isClosed) {
                                ctx.strokeStyle = currentDoorColor;
                                ctx.lineWidth = 4.0;
                                ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                            } else {
                                const sqSize = 4.0;
                                if (ddx === 0) {
                                    ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.25, sqSize, sqSize);
                                    ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.75 - sqSize, sqSize, sqSize);
                                } else {
                                    ctx.fillRect(x1 + ddx * 0.25, y1 - sqSize/2, sqSize, sqSize);
                                    ctx.fillRect(x1 + ddx * 0.75 - sqSize, y1 - sqSize/2, sqSize, sqSize);
                                }
                            }
                            ctx.restore();
                            ctx.restore(); // restore clip
                        }

                        // Climb indicator — amber oval on the exit edge
                        if (hasExit) {
                            const exFlags = ghostExits?.[d]?.flags || localRoom?.exits?.[d]?.flags || [];
                            if (exFlags.some((f: string) => f === 'CLIMB')) {
                                drawClimbIndicator(ctx, wx, wy, s, d, invZoom, currentWallColor);
                            }
                        }
                    }
                    ctx.restore();
                }

                // 3. Indicators and Flags (Zoom > 0.3)
                if (camera.zoom > 0.3) {
                    const hasLiveMob = localRoom?.mobFlags && localRoom.mobFlags.length > 0;
                    const hasLiveLoad = localRoom?.loadFlags && localRoom.loadFlags.length > 0;
                    
                    const mobF = hasLiveMob ? localRoom.mobFlags! : (rData[7] || []);
                    const loadF = hasLiveLoad ? localRoom.loadFlags! : (rData[8] || []);
                    const questF = localRoom?.roomQuestFlags || [];

                    const finalMobF = [...mobF];
                    // Skip synthetic map icons for DARK/SUNDEATH as per user request
                    // Shading is handled in drawTerrains.ts

                    // Only draw flags for fully explored rooms
                    if (isExplored && (finalMobF.length > 0 || loadF.length > 0 || questF.length > 0)) {
                        ctx.save();
                        ctx.globalAlpha = exploredAlphaMul;
                        drawRoomFlagsOptimized(ctx, anchorX, anchorY, camera.zoom, finalMobF, loadF, questF);
                        ctx.restore();
                    }

                    // Up/down arrows: show for explored and ring-1 revealed, skip for peeked
                    if (ghostExits && (ghostExits.u || ghostExits.d) && (isExplored || isRevealed)) {
                        const iconColor = 'rgba(148, 163, 184, 0.8)';
                        const cOff = 12;
                        const arrowSize = 18;

                        ctx.save();
                        if (isRevealed) ctx.globalAlpha = 0.25;
                        else ctx.globalAlpha = exploredAlphaMul;

                        if (ghostExits.u) {
                            const { hasDoor, isClosed } = getGateState(localRoom, ghostExits, 'u', allRooms, preloaded);
                            const finalColor = hasDoor ? currentDoorColor : iconColor;
                            const isOutline = hasDoor && !isClosed;
                            const icon = getIndicatorIcon('▲', finalColor, isOutline, 7, true, true, arrowSize);
                            ctx.save();
                            ctx.globalAlpha = isExplored ? (hasDoor ? 1.0 : exploredAlphaMul * 0.5) : 0.2;
                            ctx.drawImage(icon, anchorX - cOff - icon.width / 2, anchorY - cOff - icon.height / 2);
                            ctx.restore();
                        }
                        if (ghostExits.d) {
                            const { hasDoor, isClosed } = getGateState(localRoom, ghostExits, 'd', allRooms, preloaded);
                            const finalColor = hasDoor ? currentDoorColor : iconColor;
                            const isOutline = hasDoor && !isClosed;
                            const icon = getIndicatorIcon('▼', finalColor, isOutline, 7, true, true, arrowSize);
                            ctx.save();
                            ctx.globalAlpha = isExplored ? (hasDoor ? 1.0 : exploredAlphaMul * 0.5) : 0.2;
                            ctx.drawImage(icon, anchorX + cOff - icon.width / 2, anchorY + cOff - icon.height / 2);
                            ctx.restore();
                        }

                        // --- Internal Dotted Connection (Bidirectional Validation) ---
                        if (ghostExits.u && ghostExits.d) {
                            const uTargetVnum = String(ghostExits.u.target), dTargetVnum = String(ghostExits.d.target);
                            const uTarget = preloaded[uTargetVnum], dTarget = preloaded[dTargetVnum];
                            const uPointsBack = uTarget?.[4]?.d && String(uTarget[4].d.target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');
                            const dPointsBack = dTarget?.[4]?.u && String(dTarget[4].u.target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                            if (uPointsBack && dPointsBack) {
                                ctx.save();
                                ctx.globalAlpha = isExplored ? exploredAlphaMul * 0.5 : 0.15;
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

};

export const drawLocalFeatures = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, preloaded, camera, allRooms, dpr, invZoom, baseMapExitsRef } = rCtx;
    const wallColor = rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
    const s = GRID_SIZE;

    for (const room of localRooms) {
        const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
        if (preloaded[vnum]) continue;
        if (Math.abs((room.z || 0) - currentZ) > 1.5) continue;
        const wx = room.x * s, wy = room.y * s, cX = wx + s / 2, cY = wy + s / 2;
        const zoneName = room.zone || '';
        const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
        const currentWallColor = zoneVis.wallColor || rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
        const currentDoorColor = zoneVis.doorColor || rCtx.mapTileVisuals?.doorColor || '#ffcc00';

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
                                const iconColor = 'rgba(148, 163, 184, 0.8)'; // Tactical grey connection line
                                const cOff = 12;
                                const startX = cX + (d === 'u' ? -cOff : cOff);
                                const startY = cY + (d === 'u' ? -cOff : cOff);
                                const endX = tpx + (d === 'u' ? cOff : -cOff);
                                const endY = tpy + (d === 'u' ? cOff : -cOff);
                                
                                ctx.save();
                                ctx.globalAlpha = 0.5;
                                drawLine(ctx, startX, startY, endX, endY, iconColor, 1.5, dpr, invZoom, true);
                                ctx.restore();
                            }
                        }
                    }
                }
            }
        }

        // Local Up/Down Indicators
        if (room.exits && (room.exits.u || room.exits.d) && camera.zoom > 0.3) {
            const vOff = 10;
            const arrowSize = 18;
            if (room.exits.u) {
                const { hasDoor, isClosed } = getGateState(room, null, 'u', allRooms, preloaded);
                const finalColor = hasDoor ? currentDoorColor : 'rgba(148, 163, 184, 0.8)';
                const isOutline = hasDoor && !isClosed;
                const icon = getIndicatorIcon('▲', finalColor, isOutline, 7, true, true, arrowSize);
                ctx.save();
                ctx.globalAlpha = hasDoor ? 1.0 : 0.5;
                ctx.drawImage(icon, cX - 12 - icon.width / 2, cY - 12 - icon.height / 2);
                ctx.restore();
            }
            if (room.exits.d) {
                const { hasDoor, isClosed } = getGateState(room, null, 'd', allRooms, preloaded);
                const finalColor = hasDoor ? currentDoorColor : 'rgba(148, 163, 184, 0.8)';
                const isOutline = hasDoor && !isClosed;
                const icon = getIndicatorIcon('▼', finalColor, isOutline, 7, true, true, arrowSize);
                ctx.save();
                ctx.globalAlpha = hasDoor ? 1.0 : 0.5;
                ctx.drawImage(icon, cX + 12 - icon.width / 2, cY + 12 - icon.height / 2);
                ctx.restore();
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
                    const iconColor = 'rgba(148, 163, 184, 0.8)'; // Tactical grey connection line
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    drawLine(ctx, cX - 12, cY - 12, cX + 12, cY + 12, iconColor, 1.5, dpr, invZoom, true);
                    ctx.restore();
                }
            }
        }
    }

    // --- Local Wall Rendering ---
    if (camera.zoom > 0.3) {
        for (const room of localRooms) {
            const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            if (preloaded[vnum] || Math.abs((room.z || 0) - currentZ) > 1.5) continue;
            const wx = room.x * s, wy = room.y * s;
            const zoneName = room.zone || '';
            const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
            const currentWallColor = zoneVis.wallColor || rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
            const currentDoorColor = zoneVis.doorColor || rCtx.mapTileVisuals?.doorColor || '#ffcc00';
            for (const d of ['n', 's', 'e', 'w']) {
                const rId = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
                const wEx = preloaded[rId]?.[4]?.[d];
                const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, d, allRooms, preloaded);
                let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                if (!hasExit) {
                    drawInkyLine(ctx, x1, y1, x2, y2, currentWallColor, 3.0, dpr, invZoom);
                } else if (hasDoor && camera.zoom >= 0.1) {
                    const ddx = x2 - x1, ddy = y2 - y1;
                    // Clip to this room's tile so the door doesn't bleed into the neighbor
                    ctx.save();
                    ctx.beginPath(); ctx.rect(wx, wy, s, s); ctx.clip();
                    // Brown post segments with drop shadow
                    ctx.save();
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
                    ctx.shadowBlur = 6 * invZoom;
                    ctx.shadowOffsetX = 1.5 * invZoom;
                    ctx.shadowOffsetY = 2.0 * invZoom;
                    ctx.strokeStyle = currentWallColor; ctx.lineWidth = 3.5;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                    ctx.restore();
                    // Yellow door elements with glow
                    ctx.save();
                    ctx.fillStyle = currentDoorColor;
                    ctx.shadowBlur = 8; ctx.shadowColor = currentDoorColor;
                    if (isClosed) {
                        ctx.strokeStyle = currentDoorColor; ctx.lineWidth = 4.0;
                        ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                    } else {
                        const sqSize = 4.0;
                        if (ddx === 0) {
                            ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.25, sqSize, sqSize);
                            ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.75 - sqSize, sqSize, sqSize);
                        } else {
                            ctx.fillRect(x1 + ddx * 0.25, y1 - sqSize/2, sqSize, sqSize);
                            ctx.fillRect(x1 + ddx * 0.75 - sqSize, y1 - sqSize/2, sqSize, sqSize);
                        }
                    }
                    ctx.restore();
                    ctx.restore(); // restore clip
                }

                if (hasExit) {
                    const exFlags = room.exits?.[d]?.flags || wEx?.flags || [];
                    if (exFlags.some((f: string) => f === 'CLIMB')) {
                        drawClimbIndicator(ctx, wx, wy, s, d, invZoom, currentWallColor);
                    }
                }
            }
        }
    }

    // --- Local Flags ---
    if (camera.zoom > 0.3) {
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
