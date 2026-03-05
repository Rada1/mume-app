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
}

export const useMapperRenderer = ({
    rooms: stateRooms, markers: stateMarkers, currentRoomId: stateRoomId, selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef
}: RendererProps) => {

    const getSeed = (x: number, y: number) => Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);

    const drawMap = useCallback((ctx: CanvasRenderingContext2D, dpr: number, canvasWidth: number, canvasHeight: number, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
        const now = Date.now();
        const ANIM_DUR = 800;
        const activeId = stableRoomIdRef.current;
        const currentZ = activeId ? (stableRoomsRef.current[activeId]?.z || 0) : 0;
        const camera = cameraRef.current;
        const invZoom = 1 / camera.zoom;

        const allRooms = stableRoomsRef.current;
        const sortedRooms = Object.values(allRooms).sort((a: any, b: any) => (a.z || 0) - (b.z || 0));

        // Background (Solid Fill)
        ctx.fillStyle = isDarkMode ? '#181825' : '#f2f2f2';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // Grid
        ctx.beginPath();
        const gridColor = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1 / camera.zoom;
        const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
        const endX = startX + (canvasWidth / camera.zoom) + GRID_SIZE * 2;
        const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
        const endY = startY + (canvasHeight / camera.zoom) + GRID_SIZE * 2;

        for (let x = startX; x <= endX; x += GRID_SIZE) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
        for (let y = startY; y <= endY; y += GRID_SIZE) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
        ctx.stroke();

        const vX1 = camera.x, vY1 = camera.y;
        const vX2 = camera.x + (canvasWidth / camera.zoom), vY2 = camera.y + (canvasHeight / camera.zoom);

        // Terrain Detectors
        const isMtn = (r: any) => r && (r.terrain === 'Mountains' || r.terrain === '<');
        const isFor = (r: any) => r && (r.terrain === 'Forest' || r.terrain === 'f');
        const isHil = (r: any) => r && (r.terrain === 'Hills' || r.terrain === '(');
        const isRiv = (r: any) => r && (r.terrain === 'Water' || r.terrain === '~' || r.terrain === 'Rapids' || r.terrain === 'W' || r.terrain === 'River');
        const isRod = (r: any) => r && (r.terrain === 'Road' || r.terrain === '+' || r.terrain === 'Trail' || r.terrain === 'Path');
        const isCit = (r: any) => r && (r.terrain === 'City' || r.terrain === '[' || r.terrain === '#' || r.terrain === 'Town');

        const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, thickness: number = 2, dashed = false) => {
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = (thickness / dpr) * invZoom;
            if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        };

        // --- DRAW CONNECTIONS ---
        Object.values(allRooms).forEach((room: any) => {
            if (!room || !room.exits) return;
            const rx = room.x * GRID_SIZE + GRID_SIZE / 2, ry = room.y * GRID_SIZE + GRID_SIZE / 2, rz = room.z || 0;
            if (Math.abs(rz - currentZ) > 4) return;

            ctx.globalAlpha = rz === currentZ ? 1.0 : 0.25;
            Object.entries(room.exits).forEach(([dir, exitData]: [string, any]) => {
                const targetId = typeof exitData === 'string' ? exitData : exitData.target;
                const target = allRooms[targetId];
                if (!target) return;
                const d = DIRS[dir];
                if (d) {
                    const isNondirectional = Math.abs(target.x - (room.x + d.dx)) > 0.1 || Math.abs(target.y - (room.y + d.dy)) > 0.1;
                    if (isNondirectional) drawLine(rx, ry, target.x * GRID_SIZE + GRID_SIZE / 2, target.y * GRID_SIZE + GRID_SIZE / 2, isDarkMode ? '#45475a' : '#89b4fa', 1.4, !!exitData.closed);
                } else if (dir === 'u' || dir === 'd') {
                    drawLine(rx, ry, target.x * GRID_SIZE + GRID_SIZE / 2, target.y * GRID_SIZE + GRID_SIZE / 2, '#d4a373', 2, !!exitData.closed);
                }
            });
        });

        ctx.globalAlpha = 1.0;
        const roomAtCoord: Record<string, any> = {};
        Object.values(allRooms).forEach((r: any) => { if (r && (r.z || 0) === currentZ) roomAtCoord[`${Math.round(r.x)},${Math.round(r.y)}`] = r; });

        sortedRooms.forEach(room => {
            if (!room) return;
            const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;
            if (Math.abs(rz - currentZ) > 2) return;

            const age = now - (room.createdAt || 0);
            const isAnimating = age < ANIM_DUR;
            const p = isAnimating ? age / ANIM_DUR : 1.0;

            if (isAnimating) {
                ctx.save();
                const centerX = rx + s / 2, centerY = ry + s / 2;
                const maxRadius = s * 1.5;
                const rOffset = maxRadius * p;
                ctx.beginPath();
                for (let i = 0; i < 12; i++) {
                    const ang = (i / 12) * Math.PI * 2;
                    const jit = (getSeed(room.x + i, room.y) - 0.5) * s * 0.4 * (1 - p);
                    ctx.lineTo(centerX + Math.cos(ang) * (rOffset + jit), centerY + Math.sin(ang) * (rOffset + jit));
                }
                ctx.closePath(); ctx.clip();
                ctx.translate((getSeed(room.x, now * 0.01) - 0.5) * 3 * (1 - p), (getSeed(room.y, now * 0.012) - 0.5) * 3 * (1 - p));
            }

            ctx.globalAlpha = rz === currentZ ? 1.0 : 0.35;
            const rAt = (dx: number, dy: number) => roomAtCoord[`${Math.round(room.x + dx)},${Math.round(room.y + dy)}`];

            if (isMtn(room)) {
                const seed = getSeed(room.x, room.y);
                const img = imagesRef.current[PEAK_IMAGES[Math.floor(seed * PEAK_IMAGES.length)]];
                if (img?.complete) {
                    const iw = s * 2.4 * (0.9 + seed * 0.2), ih = img.height * (iw / img.width);
                    ctx.drawImage(img, rx + s / 2 - iw / 2, ry + s / 2 - ih / 2, iw, ih);
                } else {
                    ctx.fillStyle = isDarkMode ? '#45475a' : '#a6adc8';
                    ctx.beginPath(); ctx.moveTo(rx + s * 0.1, ry + s * 0.9); ctx.lineTo(rx + s * 0.5, ry + s * 0.1); ctx.lineTo(rx + s * 0.9, ry + s * 0.9); ctx.fill();
                }
            } else if (isFor(room)) {
                const img = imagesRef.current[FOREST_IMAGES[0]];
                if (img?.complete) {
                    const tCount = isMobile ? 8 : 15;
                    for (let i = 0; i < tCount; i++) {
                        const ssX = getSeed(room.x + i * 0.21, room.y + i * 0.13), ssY = getSeed(room.x + i * 0.47, room.y + i * 0.29);
                        const scOffset = (0.8 + getSeed(room.x + i, room.y + i) * 0.4);
                        const sc = (s * 0.36 / Math.max(img.width, img.height)) * scOffset;
                        ctx.drawImage(img, rx + ssX * s - (img.width * sc) / 2, ry + ssY * s - (img.height * sc) / 2, img.width * sc, img.height * sc);
                    }
                } else {
                    ctx.fillStyle = isDarkMode ? '#313244' : '#94e2d5';
                    ctx.beginPath(); ctx.arc(rx + s / 2, ry + s / 2, s * 0.35, 0, Math.PI * 2); ctx.fill();
                }
            } else if (isHil(room)) {
                const img = imagesRef.current[HILL_IMAGES[0]];
                if (img?.complete) {
                    const seed = getSeed(room.x, room.y);
                    for (let i = 0; i < (Math.floor(seed * 2) + 1); i++) {
                        const hSeedX = getSeed(room.x + i * 0.33, room.y + i * 0.17), hSeedY = getSeed(room.x + i * 0.58, room.y + i * 0.44);
                        const hS = s * (0.8 + getSeed(i, room.y) * 0.4);
                        ctx.drawImage(img, rx + hSeedX * s - hS / 2, ry + hSeedY * s - hS / 2, hS, hS * (img.height / img.width));
                    }
                } else {
                    ctx.fillStyle = isDarkMode ? '#313244' : '#f9e2af';
                    ctx.beginPath(); ctx.ellipse(rx + s / 2, ry + s * 0.7, s * 0.4, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
                }
            } else if (isRiv(room)) {
                ctx.strokeStyle = isDarkMode ? '#89b4fa' : '#3b82f6';
                ctx.lineWidth = s * 0.15; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(rx + s / 2, ry + s / 2);
                ['n', 's', 'e', 'w'].forEach(d => { if (isRiv(rAt(DIRS[d].dx, DIRS[d].dy))) { ctx.moveTo(rx + s / 2, ry + s / 2); ctx.lineTo(rx + s / 2 + DIRS[d].dx * s / 2, ry + s / 2 + DIRS[d].dy * s / 2); } });
                ctx.stroke();
            } else if (isRod(room) || isCit(room)) {
                ctx.strokeStyle = isDarkMode ? '#585b70' : '#b1b1b1';
                ctx.setLineDash([2, 4]); ctx.lineWidth = s * 0.08;
                ctx.beginPath(); ctx.moveTo(rx + s / 2, ry + s / 2);
                ['n', 's', 'e', 'w'].forEach(d => { if (isRod(rAt(DIRS[d].dx, DIRS[d].dy)) || isCit(rAt(DIRS[d].dx, DIRS[d].dy))) { ctx.moveTo(rx + s / 2, ry + s / 2); ctx.lineTo(rx + s / 2 + DIRS[d].dx * s / 2, ry + s / 2 + DIRS[d].dy * s / 2); } });
                ctx.stroke(); ctx.setLineDash([]);
            } else {
                ctx.fillStyle = isDarkMode ? '#585b70' : '#89b4fa';
                ctx.fillRect(rx + s * 0.1, ry + s * 0.1, s * 0.8, s * 0.8);
            }

            // High contrast border
            ctx.strokeStyle = isDarkMode ? '#cdd6f4' : '#11111b';
            ctx.lineWidth = 1 / (dpr * camera.zoom);
            ctx.strokeRect(rx + s * 0.1, ry + s * 0.1, s * 0.8, s * 0.8);

            if (selectedRoomIds.has(room.id)) {
                ctx.fillStyle = 'rgba(249, 226, 175, 0.4)';
                ctx.fillRect(rx, ry, s, s);
            }

            ctx.globalAlpha = 1.0; // Ensure next room or effect has full opacity
            if (isAnimating) ctx.restore();
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
    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef]);

    return { drawMap };
};
