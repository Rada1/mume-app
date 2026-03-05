import { useCallback, useRef } from 'react';
import { GRID_SIZE, DIRS, PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES } from './mapperUtils';

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
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, string | number>, string, string]>>,
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
                        const [rx, ry, rz, tSector, ghostExits, rName] = preloaded[vnum];
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

                        // DRAW EXITS
                        if (ghostExits) {
                            for (const dir in ghostExits) {
                                const targetVnum = String(ghostExits[dir]);
                                const targetData = preloaded[targetVnum];
                                if (targetData && Math.abs(targetData[2] - currentZ) <= 0.5 && targetVnum > vnum) {
                                    const isTargetVisited = explored.has(targetVnum);
                                    if (isUnveiled || (isVisited && isTargetVisited)) {
                                        const tx = Math.round(targetData[0]);
                                        const ty = Math.round(targetData[1]);
                                        const lineColor = isDarkMode ? "rgba(137, 180, 250, 0.3)" : "rgba(59, 130, 246, 0.3)";
                                        drawLine(centerPX, centerPY, tx * GRID_SIZE + GRID_SIZE / 2, ty * GRID_SIZE + GRID_SIZE / 2, lineColor, 1);
                                    }
                                }
                            }
                        }

                        // DRAW ROOM BODY
                        if (isVisited) {
                            const terrain = localRoom ? localRoom.terrain : tSector;
                            const s = GRID_SIZE;

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

                            ctx.fillStyle = isDarkMode ? '#313244' : '#ffffff';
                            ctx.strokeStyle = '#89b4fa';
                            ctx.lineWidth = 1.6 / camera.zoom;
                            if (activeId === `m_${vnum}`) ctx.strokeStyle = '#f9e2af';

                            const rectS = s * 0.7;
                            ctx.fillRect(wx + (s - rectS) / 2, wy + (s - rectS) / 2, rectS, rectS);
                            ctx.strokeRect(wx + (s - rectS) / 2, wy + (s - rectS) / 2, rectS, rectS);

                            if (camera.zoom > 1.8) {
                                ctx.font = '8px "Aniron"'; ctx.fillStyle = isDarkMode ? '#cdd6f4' : '#45475a';
                                ctx.textAlign = 'center';
                                ctx.fillText(rName.substring(0, 12), centerPX, wy + s * 0.95);
                            }
                        } else {
                            // Ghost Dot
                            const dotS = GRID_SIZE * 0.25;
                            ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                            ctx.fillRect(wx + (GRID_SIZE - dotS) / 2, wy + (GRID_SIZE - dotS) / 2, dotS, dotS);
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

            ctx.fillStyle = isDarkMode ? '#313244' : '#ffffff';
            ctx.strokeStyle = '#89b4fa';
            ctx.lineWidth = 1.6 / camera.zoom;
            if (activeId === room.id) ctx.strokeStyle = '#f9e2af';
            const rectS = s * 0.7;
            ctx.fillRect(rx + (s - rectS) / 2, ry + (s - rectS) / 2, rectS, rectS);
            ctx.strokeRect(rx + (s - rectS) / 2, ry + (s - rectS) / 2, rectS, rectS);
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
