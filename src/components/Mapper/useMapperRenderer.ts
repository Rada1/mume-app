import { useCallback, useRef } from 'react';
import { GRID_SIZE, DIRS, PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES, getTerrainColor } from './mapperUtils';

interface RendererProps {
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    selectedRoomIds: Set<string>;
    selectedMarkerId: string | null;
    cameraRef: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    isDarkMode: boolean;
    isMobile: boolean;
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>;
    characterName: string | null;
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>;
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>;
    stableRoomsRef: React.MutableRefObject<Record<string, any>>;
    stableRoomIdRef: React.MutableRefObject<string | null>;
    stableMarkersRef: React.MutableRefObject<Record<string, any>>;
    unveilMap?: boolean;
    viewZ?: number | null;
    exploredVnums?: Set<string>;
}

export const useMapperRenderer = ({
    rooms: stateRooms, markers: stateMarkers, currentRoomId: stateRoomId, selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef, preloadedCoordsRef,
    spatialIndexRef, exploredVnums: stateExploredVnums,
    unveilMap, viewZ
}: RendererProps & {
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>,
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>,
    exploredVnums?: Set<string>
}) => {

    const getSeed = (x: number, y: number) => Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);

    const drawMap = useCallback((ctx: CanvasRenderingContext2D, dpr: number, canvasWidth: number, canvasHeight: number, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
        const now = Date.now();
        const activeId = stableRoomIdRef.current;
        const baseZ = activeId ? (stableRoomsRef.current[activeId]?.z || 0) : 0;
        const currentZ = viewZ !== null && viewZ !== undefined ? viewZ : baseZ;
        const camera = cameraRef.current;
        const invZoom = 1 / camera.zoom;
        const ANIM_DUR = 800;
        const isMtn = (rVal: any) => rVal === 'Mountains' || rVal === '<';
        const isFor = (rVal: any) => rVal === 'Forest' || rVal === 'f';

        const allRooms = stableRoomsRef.current;
        const explored = stateExploredVnums || new Set<string>();

        // Background (Solid Fill)
        ctx.fillStyle = isDarkMode ? '#181825' : '#f2f2f2';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // Viewport culling bounds in grid coordinates
        const vX1 = camera.x, vY1 = camera.y;
        const vX2 = camera.x + (canvasWidth / camera.zoom), vY2 = camera.y + (canvasHeight / camera.zoom);

        const gX1 = Math.floor(vX1 / GRID_SIZE) - 1;
        const gY1 = Math.floor(vY1 / GRID_SIZE) - 1;
        const gX2 = Math.ceil(vX2 / GRID_SIZE) + 1;
        const gY2 = Math.ceil(vY2 / GRID_SIZE) + 1;

        // Grid
        ctx.beginPath();
        const gridColor = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1 / camera.zoom;
        for (let x = gX1 * GRID_SIZE; x <= gX2 * GRID_SIZE; x += GRID_SIZE) { ctx.moveTo(x, vY1); ctx.lineTo(x, vY2); }
        for (let y = gY1 * GRID_SIZE; y <= gY2 * GRID_SIZE; y += GRID_SIZE) { ctx.moveTo(vX1, y); ctx.lineTo(vX2, y); }
        ctx.stroke();

        const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, thickness: number = 2, dashed = false) => {
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = (thickness / dpr) * invZoom;
            if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        };

        const roomAtCoord: Record<string, any> = {};

        // --- DRAW MASTER MAP ROOMS (USING SPATIAL INDEX) ---
        const preloaded = preloadedCoordsRef.current;
        const floorIndex = spatialIndexRef.current[Math.round(currentZ)];

        if (floorIndex) {
            // Only look through buckets overlapping our viewport
            const bX1 = Math.floor(gX1 / 5), bY1 = Math.floor(gY1 / 5);
            const bX2 = Math.floor(gX2 / 5), bY2 = Math.floor(gY2 / 5);

            for (let bx = bX1; bx <= bX2; bx++) {
                for (let by = bY1; by <= bY2; by++) {
                    const bucket = floorIndex[`${bx},${by}`];
                    if (!bucket) continue;

                    bucket.forEach(vnum => {
                        const [rx, ry, rz, tSector, ghostExits, rName, , mobFlagsGhost, loadFlagsGhost] = preloaded[vnum];
                        const isVisited = explored.has(vnum);
                        const isUnveiled = unveilMap;

                        if (!isVisited && !isUnveiled) return;

                        const wx = Math.round(rx) * GRID_SIZE;
                        const wy = Math.round(ry) * GRID_SIZE;
                        const centerPX = wx + GRID_SIZE / 2;
                        const centerPY = wy + GRID_SIZE / 2;

                        // Adoption check: If we have a local room override, skip or merge
                        const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                        if (localRoom) roomAtCoord[`${Math.round(rx)},${Math.round(ry)}`] = localRoom;

                        ctx.globalAlpha = 1.0;

                        // DRAW EXITS (Lines between rooms for wide/non-cardinal connections)
                        if (ghostExits) {
                            for (const dir in ghostExits) {
                                const exObj = ghostExits[dir];
                                if (!exObj) continue;
                                const targetVnum = String(exObj.target);
                                const targetData = preloaded[targetVnum];
                                if (targetData && Math.abs(targetData[2] - currentZ) <= 0.5 && targetVnum > vnum) {
                                    const isTargetVisited = explored.has(targetVnum);
                                    if (isUnveiled || (isVisited && isTargetVisited)) {
                                        const tx = Math.round(targetData[0]);
                                        const ty = Math.round(targetData[1]);

                                        const dx = tx - Math.round(rx);
                                        const dy = ty - Math.round(ry);
                                        const isAdjacentCardinal = (Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0);
                                        const isCardinalDir = ['n', 's', 'e', 'w'].includes(dir);

                                        if (!(isAdjacentCardinal && isCardinalDir)) {
                                            const lineColor = isDarkMode ? "rgba(137, 180, 250, 0.3)" : "rgba(59, 130, 246, 0.3)";
                                            drawLine(centerPX, centerPY, tx * GRID_SIZE + GRID_SIZE / 2, ty * GRID_SIZE + GRID_SIZE / 2, lineColor, 1);
                                        }
                                    }
                                }
                            }
                        }

                        // DRAW ROOM BODY
                        if (isVisited || isUnveiled) {
                            const terrain = localRoom ? localRoom.terrain : tSector;
                            const s = GRID_SIZE;

                            // 1. Fill Room Background based on terrain
                            ctx.fillStyle = getTerrainColor(terrain, isDarkMode);
                            ctx.fillRect(wx, wy, s, s);

                            // 2. Draw Terrain Features (behind labels/walls)
                            if (isMtn(terrain)) {
                                const seed = getSeed(Math.round(rx), Math.round(ry));
                                const img = imagesRef.current[PEAK_IMAGES[Math.floor(seed * PEAK_IMAGES.length)]];
                                if (img?.complete) {
                                    const iw = s * 2.4 * (0.9 + seed * 0.2), ih = img.height * (iw / img.width);
                                    ctx.drawImage(img, wx + s / 2 - iw / 2, wy + s / 2 - ih / 2, iw, ih);
                                }
                            } else if (isFor(terrain)) {
                                const img = imagesRef.current[FOREST_IMAGES[0]];
                                if (img?.complete) {
                                    const tCount = isMobile ? 6 : 10;
                                    for (let i = 0; i < tCount; i++) {
                                        const ssX = getSeed(Math.round(rx) + i * 0.21, Math.round(ry) + i * 0.13), ssY = getSeed(Math.round(rx) + i * 0.47, Math.round(ry) + i * 0.29);
                                        const sc = (s * 0.36 / Math.max(img.width, img.height)) * (0.8 + getSeed(i, i) * 0.4);
                                        ctx.drawImage(img, wx + ssX * s - (img.width * sc) / 2, wy + ssY * s - (img.height * sc) / 2, img.width * sc, img.height * sc);
                                    }
                                }
                            }

                            // 3. Draw Tactical Indicators (Shops, Aggressive, Resources)
                            const activeMobFlags = (localRoom?.mobFlags || mobFlagsGhost || []);
                            const activeLoadFlags = (localRoom?.loadFlags || loadFlagsGhost || []);

                            if (activeMobFlags.length > 0 || activeLoadFlags.length > 0) {
                                ctx.save();
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.font = `bold ${Math.max(10, 14 / camera.zoom)}px "Inter", sans-serif`;

                                let offset = 0;
                                if (activeMobFlags.some(f => f.includes('AGGRESSIVE'))) {
                                    ctx.fillStyle = '#f38ba8'; // Red
                                    ctx.fillText('!', centerPX + offset, centerPY);
                                    offset += 8 / camera.zoom;
                                }
                                if (activeMobFlags.some(f => f.includes('SHOP'))) {
                                    ctx.fillStyle = '#f9e2af'; // Gold
                                    ctx.fillText('$', centerPX + offset, centerPY);
                                    offset += 8 / camera.zoom;
                                }
                                if (activeLoadFlags.some(f => f.includes('HERB') || f.includes('WATER'))) {
                                    ctx.fillStyle = '#a6e3a1'; // Green
                                    ctx.fillText('*', centerPX + offset, centerPY);
                                }
                                ctx.restore();
                            }

                            // Unified door state helper: check both sides for 'Open' status
                            const getGateState = (roomA: any, wallExitsA: any, dir: string) => {
                                const localExA = roomA?.exits?.[dir]; // Real-time data
                                const wallExA = wallExitsA?.[dir];   // Permanent data

                                if (!localExA && !wallExA) {
                                    return { hasExit: false };
                                }

                                const exitA = localExA || wallExA;
                                if (!exitA) return { hasExit: false };

                                const targetId = exitA.target;
                                const oppDir = DIRS[dir]?.opp;

                                // Look for the neighbor
                                const neighborId = String(targetId).startsWith('m_') ? targetId : `m_${targetId}`;
                                const neighbor = allRooms[neighborId] || allRooms[targetId] || (preloaded[String(targetId)] ? { exits: preloaded[String(targetId)][4] } : null);
                                const exitB = neighbor?.exits?.[oppDir];

                                // Knowledge of door exists if either side or the map says so
                                const hasDoor = exitA.hasDoor || (exitA.flags?.some((f: any) => f.includes('door') || f === 'closed' || f === 'locked')) ||
                                    exitB?.hasDoor || (exitB?.flags?.some((f: any) => f.includes('door') || f === 'closed' || f === 'locked')) ||
                                    wallExA?.hasDoor;

                                if (!hasDoor) return { hasExit: true, hasDoor: false, isClosed: false };

                                // State Logic:
                                // If EITHER side says it's OPEN (closed === false), we show it as open.
                                // Otherwise, if it has a door, it defaults to CLOSED.
                                let isClosed = hasDoor;
                                if (localExA && localExA.closed === false) isClosed = false;
                                else if (exitB && exitB.closed === false) isClosed = false;
                                else if (wallExA && wallExA.closed === false) isClosed = false; // from map history if any

                                return { hasExit: true, hasDoor, isClosed };
                            };

                            const drawWallSide = (x1: number, y1: number, x2: number, y2: number, dir: string) => {
                                const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, dir);
                                const orange = isDarkMode ? "#fab387" : "#e67e22";
                                const doorGold = "#ffcc00"; // Vibrant gold for closed segment visibility

                                if (!hasExit) {
                                    // Regular Wall
                                    ctx.beginPath();
                                    ctx.strokeStyle = isDarkMode ? "rgba(137, 180, 250, 0.4)" : "#3b82f6";
                                    ctx.lineWidth = 1.0 / camera.zoom;
                                    ctx.moveTo(x1, y1);
                                    ctx.lineTo(x2, y2);
                                    ctx.stroke();
                                } else if (hasDoor) {
                                    const dx = x2 - x1, dy = y2 - y1;

                                    // 1. Draw Orange Posts (Permanent)
                                    ctx.strokeStyle = orange;
                                    ctx.lineWidth = 3.5 / camera.zoom;

                                    ctx.beginPath();
                                    ctx.moveTo(x1, y1);
                                    ctx.lineTo(x1 + dx * 0.25, y1 + dy * 0.25);
                                    ctx.stroke();

                                    ctx.beginPath();
                                    ctx.moveTo(x2, y2);
                                    ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25);
                                    ctx.stroke();

                                    // 2. Draw Yellow Closure (If Closed)
                                    if (isClosed) {
                                        ctx.strokeStyle = doorGold;
                                        ctx.lineWidth = 4.0 / camera.zoom;
                                        ctx.beginPath();
                                        ctx.moveTo(x1 + dx * 0.25, y1 + dy * 0.25);
                                        ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25);
                                        ctx.stroke();
                                    }
                                }
                            };

                            drawWallSide(wx, wy, wx + s, wy, 'n');
                            drawWallSide(wx, wy + s, wx + s, wy + s, 's');
                            drawWallSide(wx + s, wy, wx + s, wy + s, 'e');
                            drawWallSide(wx, wy, wx, wy + s, 'w');

                            // 4. Special Highlights (Active Room & Selection)
                            // Current Room Highlight
                            if (activeId === `m_${vnum}`) {
                                ctx.strokeStyle = '#f9e2af';
                                ctx.lineWidth = 3 / camera.zoom;
                                ctx.strokeRect(wx + 1, wy + 1, s - 2, s - 2);
                            }

                            // Selection Highlight
                            if (selectedRoomIds.has(`m_${vnum}`) || selectedRoomIds.has(vnum)) {
                                ctx.strokeStyle = isDarkMode ? '#89b4fa' : '#3b82f6';
                                ctx.lineWidth = 2 / camera.zoom;
                                ctx.setLineDash([4 * invZoom, 2 * invZoom]);
                                ctx.strokeRect(wx + 3, wy + 3, s - 6, s - 6);
                                ctx.setLineDash([]);
                            }

                            // 5. Room Labels
                            if (camera.zoom > 1.8) {
                                ctx.font = '8px "Aniron"'; ctx.fillStyle = isDarkMode ? '#cdd6f4' : '#45475a';
                                ctx.textAlign = 'center';
                                ctx.fillText(rName.substring(0, 12), centerPX, wy + s * 0.95);
                            }
                        }
                    });
                }
            }
        }

        // --- DRAW LOCAL OVERRIDES / CUSTOM ROOMS ---
        Object.values(allRooms).forEach((room: any) => {
            if (room.id.startsWith('m_')) return; // Already handled by master map loop

            const rx = room.x * GRID_SIZE + GRID_SIZE / 2, ry = room.y * GRID_SIZE + GRID_SIZE / 2, rz = room.z || 0;
            if (Math.abs(rz - currentZ) > 4) return;
            // Similar logic for local rooms...
            // (Keeping this for rooms created manually that don't exist in master map)
        });

        // --- DRAW LOCAL CUSTOM ROOMS (THAT ARE NOT IN MASTER MAP) ---
        Object.values(allRooms).forEach((room: any) => {
            if (room.id.startsWith('m_')) return;
            const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;
            if (Math.abs(rz - currentZ) > 1.5) return;

            // Fill Room Square
            ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode);
            ctx.fillRect(rx, ry, s, s);

            // Draw Walls and Doors using unified gate state
            const getLocalGateState = (roomA: any, dir: string) => {
                const exitA = roomA.exits?.[dir];
                // Check if master map has this exit/door too
                const roomId = String(roomA.id).startsWith('m_') ? roomA.id.substring(2) : roomA.id;
                const wallExA = preloaded[roomId]?.[4][dir];

                const effectiveExit = exitA || wallExA;
                if (!effectiveExit) return { hasExit: false };

                const targetId = effectiveExit.target;
                const oppDir = DIRS[dir]?.opp;
                const neighborId = targetId ? (String(targetId).startsWith('m_') ? targetId : `m_${targetId}`) : null;
                const neighbor = neighborId ? (allRooms[neighborId] || allRooms[targetId] || (preloaded[String(targetId)] ? { exits: preloaded[String(targetId)][4] } : null)) : null;
                const exitB = neighbor?.exits?.[oppDir];

                const hasDoor = effectiveExit.hasDoor || (effectiveExit.flags?.some((f: any) => f.includes('door') || f === 'closed' || f === 'locked')) ||
                    exitB?.hasDoor || (exitB?.flags?.some((f: any) => f.includes('door') || f === 'closed' || f === 'locked')) ||
                    wallExA?.hasDoor;

                if (!hasDoor) return { hasExit: true, hasDoor: false, isClosed: false };

                // State Logic for Local Custom Rooms
                let isClosed = hasDoor;
                if (exitA && exitA.closed === false) isClosed = false;
                else if (exitB && exitB.closed === false) isClosed = false;

                return { hasExit: true, hasDoor, isClosed };
            };

            const drawLocalWallSide = (x1: number, y1: number, x2: number, y2: number, dir: string) => {
                const { hasExit, hasDoor, isClosed } = getLocalGateState(room, dir);
                const orange = isDarkMode ? "#fab387" : "#e67e22";
                const doorGold = "#ffcc00";

                if (!hasExit) {
                    ctx.beginPath();
                    ctx.strokeStyle = isDarkMode ? "rgba(137, 180, 250, 0.4)" : "#3b82f6";
                    ctx.lineWidth = 1.0 / camera.zoom;
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                } else if (hasDoor) {
                    const dx = x2 - x1, dy = y2 - y1;

                    ctx.strokeStyle = orange;
                    ctx.lineWidth = 3.5 / camera.zoom;

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x1 + dx * 0.25, y1 + dy * 0.25);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25);
                    ctx.stroke();

                    if (isClosed) {
                        ctx.strokeStyle = doorGold;
                        ctx.lineWidth = 4.0 / camera.zoom;
                        ctx.beginPath();
                        ctx.moveTo(x1 + dx * 0.25, y1 + dy * 0.25);
                        ctx.lineTo(x2 - dx * 0.25, y2 - dy * 0.25);
                        ctx.stroke();
                    }
                }
            };

            drawLocalWallSide(rx, ry, rx + s, ry, 'n');
            drawLocalWallSide(rx, ry + s, rx + s, ry + s, 's');
            drawLocalWallSide(rx + s, ry, rx + s, ry + s, 'e');
            drawLocalWallSide(rx, ry, rx, ry + s, 'w');

            // Special Highlights
            if (activeId === room.id) {
                ctx.strokeStyle = '#f9e2af';
                ctx.lineWidth = 3 / camera.zoom;
                ctx.strokeRect(rx + 1, ry + 1, s - 2, s - 2);
            }

            if (selectedRoomIds.has(room.id)) {
                ctx.strokeStyle = isDarkMode ? '#89b4fa' : '#3b82f6';
                ctx.lineWidth = 2 / camera.zoom;
                ctx.setLineDash([4 * invZoom, 2 * invZoom]);
                ctx.strokeRect(rx + 3, ry + 3, s - 6, s - 6);
                ctx.setLineDash([]);
            }
        });

        // --- PLAYER TRAIL ---
        if (playerTrailRef.current.length > 0) {
            ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
            playerTrailRef.current.forEach(t => {
                const zDist = Math.abs(t.z - currentZ);
                if (zDist < 1.5) {
                    ctx.globalAlpha = Math.max(0, t.alpha * (1 - zDist));
                    ctx.fillStyle = '#3b82f6'; ctx.beginPath();
                    const tx = t.x * GRID_SIZE + GRID_SIZE / 2, ty = t.y * GRID_SIZE + GRID_SIZE / 2;
                    ctx.arc(tx, ty, 1 + (t.alpha * 4), 0, Math.PI * 2); ctx.fill();
                }
            });
            ctx.restore();
        }

        // --- PLAYER ---
        if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.5) {
            const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2, py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
            ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ));
            ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

            ctx.fillStyle = '#3b82f6'; ctx.beginPath();
            const pV = 10, pR = 7;
            for (let i = 0; i < pV; i++) {
                const ang = (i / pV) * Math.PI * 2, jit = (getSeed(i, 999) - 0.5) * 1.5;
                ctx.lineTo(px + Math.cos(ang) * (pR + jit), py + Math.sin(ang) * (pR + jit));
            }
            ctx.closePath(); ctx.fill();

            if (characterName) {
                const clean = characterName.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\{FULLNAME:/i, '').replace(/\}$/g, '').split(' ')[0].replace(/[{}"']/g, '').split(':').pop()?.trim() || "";
                ctx.font = 'bold 13px "Aniron"'; ctx.fillStyle = '#1e40af'; ctx.textAlign = 'center';
                ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(255,255,255,0.8)';
                ctx.fillText(clean, px, py - 18);
            }
            ctx.restore();
        }

        // --- DRAW MARKERS ---
        Object.values(stableMarkersRef.current).forEach((marker: any) => {
            const mx = marker.x * GRID_SIZE, my = marker.y * GRID_SIZE;
            if (mx < vX1 - GRID_SIZE || mx > vX2 + GRID_SIZE || my < vY1 - GRID_SIZE || my > vY2 + GRID_SIZE) return;
            if ((marker.z || 0) !== currentZ) return;

            const isSelected = selectedMarkerId === marker.id;
            const dotSize = marker.dotSize || 8;
            const mSeed = (marker.x * 1.5 + marker.y * 2.5);
            const mP = Math.min(1, (now - (marker.createdAt || 0)) / ANIM_DUR);
            const isMAnimating = mP < 1;

            if (isMAnimating) {
                ctx.save();
                const mR = dotSize * 6 * mP;
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const ang = (i / 10) * Math.PI * 2, jit = (getSeed(mSeed + i, mSeed) - 0.5) * dotSize * 2 * (1 - mP);
                    ctx.lineTo(mx + Math.cos(ang) * (mR + jit), my + Math.sin(ang) * (mR + jit));
                }
                ctx.closePath(); ctx.clip();
                ctx.translate((getSeed(mSeed, now * 0.01) - 0.5) * 2 * (1 - mP), (getSeed(mSeed + 1, now * 0.012) - 0.5) * 2 * (1 - mP));
            }

            ctx.fillStyle = isSelected ? '#ef4444' : '#000000';
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2, r = dotSize + (getSeed(mSeed + i, 0) - 0.5) * (dotSize * 0.4);
                ctx.lineTo(mx + Math.cos(ang) * r, my + Math.sin(ang) * r);
            }
            ctx.closePath(); ctx.fill();

            if (marker.text) {
                ctx.font = `${marker.fontSize || 16}px Aniron`; ctx.fillStyle = '#8b0000'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(marker.text, mx, my - dotSize - 4);
            }
            if (isMAnimating) ctx.restore();
        });

        ctx.restore();

        // --- MARQUEE ---
        if (marquee && marquee.start && marquee.end) {
            const x1 = marquee.start.x / dpr, y1 = marquee.start.y / dpr, x2 = marquee.end.x / dpr, y2 = marquee.end.y / dpr;
            ctx.save(); ctx.scale(dpr, dpr);
            ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillStyle = 'rgba(137, 180, 250, 0.2)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            ctx.restore();
        }
    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef, unveilMap, viewZ]);

    return { drawMap };
};
