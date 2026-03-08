import { useCallback, useRef, MutableRefObject } from 'react';
import { 
    GRID_SIZE, DIRS, PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES, 
    getTerrainColor, normalizeTerrain,
    ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT 
} from './mapperUtils';
import { drawBlobTerrain, BlobNeighbors } from './blobTerrainRenderer';

interface RendererProps {
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    selectedRoomIds: Set<string>;
    selectedMarkerId: string | null;
    cameraRef: MutableRefObject<{ x: number, y: number, zoom: number }>;
    isDarkMode: boolean;
    isMobile: boolean;
    imagesRef: MutableRefObject<Record<string, HTMLImageElement>>;
    characterName: string | null;
    playerPosRef: MutableRefObject<{ x: number, y: number, z: number } | null>;
    playerTrailRef: MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>;
    stableRoomsRef: MutableRefObject<Record<string, any>>;
    stableRoomIdRef: MutableRefObject<string | null>;
    stableMarkersRef: MutableRefObject<Record<string, any>>;
    unveilMap?: boolean;
    viewZ?: number | null;
    exploredVnums?: Set<string>;
    firstExploredAtRef: MutableRefObject<Record<string, number>>;
    preloadedCoordsRef: MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean, flags?: string[] }>, string, string, string[], string[]]>>;
    spatialIndexRef: MutableRefObject<Record<number, Record<string, string[]>>>;
}

export const useMapperRenderer = ({
    rooms: stateRooms, markers: stateMarkers, currentRoomId: stateRoomId, selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef, preloadedCoordsRef,
    spatialIndexRef, exploredVnums: stateExploredVnums,
    unveilMap, viewZ, firstExploredAtRef
}: RendererProps) => {

    const processedIconsRef = useRef<Record<string, HTMLCanvasElement>>({});

    const getSeed = (x: number, y: number) => Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);

    const drawMap = useCallback((ctx: CanvasRenderingContext2D, dpr: number, canvasWidth: number, canvasHeight: number, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
        const now = Date.now();
        const activeId = stableRoomIdRef.current;
        const baseZ = activeId ? (stableRoomsRef.current[activeId]?.z || 0) : 0;
        const currentZ = viewZ !== null && viewZ !== undefined ? viewZ : baseZ;
        const camera = cameraRef.current;
        const invZoom = 1 / camera.zoom;
        const ANIM_DUR = 1500;
        
        const isMtn = (rVal: any) => rVal === 'Mountains' || rVal === '<';
        const isFor = (rVal: any) => rVal === 'Forest' || rVal === 'f';
        const isHill = (rVal: any) => rVal === 'Hills' || rVal === '(';

        const allRooms = stableRoomsRef.current;
        const explored = stateExploredVnums || new Set<string>();

        // Background
        ctx.fillStyle = isDarkMode ? '#181825' : '#f2f2f2';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // Grid bounds
        const vX1 = camera.x, vY1 = camera.y;
        const vX2 = camera.x + (canvasWidth / camera.zoom), vY2 = camera.y + (canvasHeight / camera.zoom);
        const gX1 = Math.floor(vX1 / GRID_SIZE) - 1, gY1 = Math.floor(vY1 / GRID_SIZE) - 1;
        const gX2 = Math.ceil(vX2 / GRID_SIZE) + 1, gY2 = Math.ceil(vY2 / GRID_SIZE) + 1;

        const roomAtCoord: Record<string, any> = {};
        const visitedAtCoord: Record<string, boolean> = {};

        const preloaded = preloadedCoordsRef.current;
        const floorIndex = spatialIndexRef.current[Math.round(currentZ)];

        if (floorIndex) {
            const bX1 = Math.floor(gX1 / 5), bY1 = Math.floor(gY1 / 5);
            const bX2 = Math.floor(gX2 / 5), bY2 = Math.floor(gY2 / 5);

            for (let bx = bX1; bx <= bX2; bx++) {
                for (let by = bY1; by <= bY2; by++) {
                    const bucket = floorIndex[`${bx},${by}`];
                    if (!bucket) continue;
                    bucket.forEach(vnum => {
                        const [rx, ry, rz, tSector] = preloaded[vnum];
                        const irx = Math.round(rx), iry = Math.round(ry);
                        const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                        roomAtCoord[`${irx},${iry}`] = normalizeTerrain(localRoom ? localRoom.terrain : tSector);
                        if (explored.has(vnum) || unveilMap) visitedAtCoord[`${irx},${iry}`] = true;
                    });
                }
            }
        }

        Object.values(allRooms).forEach((room: any) => {
            if (!room.id.startsWith('m_') && Math.abs((room.z || 0) - currentZ) < 0.5) {
                const irx = Math.round(room.x), iry = Math.round(room.y);
                roomAtCoord[`${irx},${iry}`] = normalizeTerrain(room.terrain);
                visitedAtCoord[`${irx},${iry}`] = true;
            }
        });

        // Grid Drawing (Segmental)
        ctx.beginPath();
        ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        ctx.lineWidth = 1 / camera.zoom;
        for (let gx = gX1; gx <= gX2; gx++) {
            for (let gy = gY1; gy <= gY2; gy++) {
                if (!visitedAtCoord[`${gx},${gy}`]) {
                    const x = gx * GRID_SIZE, y = gy * GRID_SIZE;
                    ctx.moveTo(x, y); ctx.lineTo(x + GRID_SIZE, y);
                    ctx.moveTo(x, y); ctx.lineTo(x, y + GRID_SIZE);
                    if (!visitedAtCoord[`${gx + 1},${gy}`]) { ctx.moveTo(x + GRID_SIZE, y); ctx.lineTo(x + GRID_SIZE, y + GRID_SIZE); }
                    if (!visitedAtCoord[`${gx},${gy + 1}`]) { ctx.moveTo(x, y + GRID_SIZE); ctx.lineTo(x + GRID_SIZE, y + GRID_SIZE); }
                }
            }
        }
        ctx.stroke();

        const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, thickness: number = 2, dashed = false) => {
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = (thickness / dpr) * invZoom;
            if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        };

        const getRoomAnchor = (rx: number, ry: number) => {
            const sX = getSeed(Math.round(rx), Math.round(ry)), sY = getSeed(Math.round(ry), Math.round(rx));
            const j = GRID_SIZE * 0.22; // 22% jitter
            return { x: Math.round(rx) * GRID_SIZE + GRID_SIZE / 2 + (sX - 0.5) * j, y: Math.round(ry) * GRID_SIZE + GRID_SIZE / 2 + (sY - 0.5) * j };
        };

        const drawCurvedPath = (x1: number, y1: number, x2: number, y2: number, color: string, thickness: number = 2) => {
            const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) return;
            const seed = getSeed(x1 + x2, y1 + y2), bend = dist * (0.1 + seed * 0.15);
            const cx = (x1 + x2) / 2 + (-dy / dist) * (seed - 0.5) * bend, cy = (y1 + y2) / 2 + (dx / dist) * (seed - 0.5) * bend;
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = (thickness / dpr) * invZoom; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
        };

        if (floorIndex) {
            const bX1 = Math.floor(gX1 / 5), bY1 = Math.floor(gY1 / 5);
            const bX2 = Math.floor(gX2 / 5), bY2 = Math.floor(gY2 / 5);

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
                        const blobTerrains = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'Building', 'City', 'Tunnel', 'Cavern'];

                        const firstExplored = firstExploredAtRef.current[vnum];
                        if (firstExplored === undefined) {
                            firstExploredAtRef.current[vnum] = now;
                            firstExploredAtRef.current['_latest'] = now;
                        }
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
                        const blobTerrains = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'Building', 'City', 'Tunnel', 'Cavern'];

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

            // Shared Gate State Logic
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

            // Pass 2: Features
            for (let bx = bX1; bx <= bX2; bx++) {
                for (let by = bY1; by <= bY2; by++) {
                    const bucket = floorIndex[`${bx},${by}`];
                    if (!bucket) continue;
                    bucket.forEach(vnum => {
                        const [rx, ry, rz, tSector, ghostExits, rName, , mobFlagsGhost, loadFlagsGhost] = preloaded[vnum];
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
                                        if (isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road') drawCurvedPath(centerPX, centerPY, tpx, tpy, isDarkMode ? ROAD_COLOR_DARK : ROAD_COLOR_LIGHT, 12);
                                        else drawCurvedPath(centerPX, centerPY, tpx, tpy, isDarkMode ? PATH_COLOR_DARK : PATH_COLOR_LIGHT, 4);
                                    } else if (targetVnum > vnum && (Math.abs(targetData[0] - rx) > 1.1 || Math.abs(targetData[1] - ry) > 1.1)) {
                                        drawLine(centerPX, centerPY, tpx, tpy, isDarkMode ? "rgba(137, 180, 250, 0.15)" : "rgba(37, 99, 235, 0.15)", 2);
                                    }
                                }
                            }
                        }

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
        }

        // Pass 1A (Local): Terrain Backgrounds
        Object.values(allRooms).forEach((room: any) => {
            if (room.id.startsWith('m_')) return;
            const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;
            if (Math.abs(rz - currentZ) > 1.5) return;
            const norm = normalizeTerrain(room.terrain);
            const blobTerrains = ['Forest', 'Mountains', 'Hills', 'Brush', 'Field', 'Grasslands', 'Water', 'Shallows', 'Rapids', 'Building', 'City', 'Tunnel', 'Cavern'];
            
            const firstExplored = firstExploredAtRef.current[room.id];
            if (firstExplored === undefined) {
                firstExploredAtRef.current[room.id] = now;
                firstExploredAtRef.current['_latest'] = now;
            }
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

        // Pass 1B (Local): Local Features Cleanup
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

        // Player Trail
        if (playerTrailRef.current.length > 0) {
            ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
            playerTrailRef.current.forEach(t => {
                const zDist = Math.abs(t.z - currentZ);
                if (zDist < 1.5) {
                    ctx.globalAlpha = Math.max(0, t.alpha * (1 - zDist)); ctx.fillStyle = '#ef4444'; ctx.beginPath();
                    ctx.arc(t.x * GRID_SIZE + GRID_SIZE / 2, t.y * GRID_SIZE + GRID_SIZE / 2, 1 + (t.alpha * 4), 0, Math.PI * 2); ctx.fill();
                }
            });
            ctx.restore();
        }

        // Player
        if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.5) {
            const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2, py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
            ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ)); ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
            ctx.fillStyle = '#ef4444'; ctx.beginPath();
            for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2, jit = (getSeed(i, 999) - 0.5) * 1.5; ctx.lineTo(px + Math.cos(ang) * (7 + jit), py + Math.sin(ang) * (7 + jit)); }
            ctx.closePath(); ctx.fill();
            if (characterName) {
                const clean = characterName.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\{FULLNAME:/i, '').replace(/\}$/g, '').split(' ')[0].replace(/[{}"']/g, '').split(':').pop()?.trim() || "";
                ctx.font = 'bold 13px "Aniron"'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.fillText(clean, px, py - 18);
            }
            ctx.restore();
        }

        // Markers
        Object.values(stableMarkersRef.current).forEach((marker: any) => {
            const mx = marker.x * GRID_SIZE, my = marker.y * GRID_SIZE; if (mx < vX1 - GRID_SIZE || mx > vX2 + GRID_SIZE || my < vY1 - GRID_SIZE || my > vY2 + GRID_SIZE || (marker.z || 0) !== currentZ) return;
            const isSelected = selectedMarkerId === marker.id, dotSize = marker.dotSize || 8, mSeed = marker.x * 1.5 + marker.y * 2.5, mP = Math.min(1, (now - (marker.createdAt || 0)) / ANIM_DUR);
            if (mP < 1) {
                ctx.save(); const mR = dotSize * 6 * mP; ctx.beginPath(); for (let i = 0; i < 10; i++) ctx.lineTo(mx + Math.cos((i/10)*Math.PI*2) * (mR+(getSeed(mSeed+i,mSeed)-0.5)*dotSize*2*(1-mP)), my + Math.sin((i/10)*Math.PI*2)*(mR+(getSeed(mSeed+i,mSeed)-0.5)*dotSize*2*(1-mP)));
                ctx.closePath(); ctx.clip(); ctx.translate((getSeed(mSeed,now*0.01)-0.5)*2*(1-mP), (getSeed(mSeed+1,now*0.012)-0.5)*2*(1-mP));
            }
            ctx.fillStyle = isSelected ? '#ef4444' : '#000000'; ctx.beginPath(); for (let i = 0; i < 8; i++) ctx.lineTo(mx + Math.cos((i/8)*Math.PI*2)*(dotSize+(getSeed(mSeed+i,0)-0.5)*(dotSize*0.4)), my + Math.sin((i/8)*Math.PI*2)*(dotSize+(getSeed(mSeed+i,0)-0.5)*(dotSize*0.4)));
            ctx.closePath(); ctx.fill(); if (marker.text) { ctx.font = `${marker.fontSize || 16}px Aniron`; ctx.fillStyle = '#8b0000'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(marker.text, mx, my - dotSize - 4); }
            if (mP < 1) ctx.restore();
        });

        ctx.restore();

        // Marquee
        if (marquee && marquee.start && marquee.end) {
            const x1 = marquee.start.x / dpr, y1 = marquee.start.y / dpr, x2 = marquee.end.x / dpr, y2 = marquee.end.y / dpr;
            ctx.save(); ctx.scale(dpr, dpr); ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); ctx.fillStyle = 'rgba(137, 180, 250, 0.2)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.restore();
        }
    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef, unveilMap, viewZ, spatialIndexRef, preloadedCoordsRef, stateExploredVnums, firstExploredAtRef]);

    return { drawMap };
};
