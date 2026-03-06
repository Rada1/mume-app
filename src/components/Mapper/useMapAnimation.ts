import { useEffect, useRef, useCallback } from 'react';
import { GRID_SIZE } from './mapperUtils';

interface AnimationProps {
    drawMap: (ctx: CanvasRenderingContext2D, dpr: number, w: number, h: number, marquee: any) => void;
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    isDragging: boolean;
    renderVersion: number;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    camera: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>;
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>;
    getDPR: () => number;
    marquee: any;
    autoCenter?: boolean;
    stableRoomsRef: React.MutableRefObject<Record<string, any>>;
    stableRoomIdRef: React.MutableRefObject<string | null>;
}

export const useMapAnimation = ({
    drawMap, rooms, markers, currentRoomId, isDragging, renderVersion,
    canvasRef, camera, playerPosRef, playerTrailRef, getDPR, marquee, autoCenter, stableRoomsRef, stableRoomIdRef
}: AnimationProps) => {
    const requestRef = useRef<number | null>(null);

    const tick = useCallback(() => {
        const cvs = canvasRef.current;
        if (!cvs) return false;
        const ctx = cvs.getContext('2d');
        if (!ctx) return false;

        const dpr = getDPR();
        const w = cvs.width / dpr;
        const h = cvs.height / dpr;

        let needsNextFrame = isDragging;

        // Auto-centering & Player Animation
        const activeRoomId = stableRoomIdRef.current;
        if (playerPosRef.current && activeRoomId && stableRoomsRef.current[activeRoomId]) {
            const target = stableRoomsRef.current[activeRoomId];
            const px = playerPosRef.current.x, py = playerPosRef.current.y;
            const targetX = target.x, targetY = target.y;

            if (Math.hypot(px - targetX, py - targetY) > 0.001) {
                playerPosRef.current.x += (targetX - px) * 0.15;
                playerPosRef.current.y += (targetY - py) * 0.15;
                needsNextFrame = true;
            }

            if (autoCenter && !isDragging) {
                const zoom = camera.current.zoom || 1;
                const targetCamX = (playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2) - (w / (2 * zoom));
                const targetCamY = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));

                if (Math.abs(camera.current.x - targetCamX) > 0.1 || Math.abs(camera.current.y - targetCamY) > 0.1) {
                    camera.current.x += (targetCamX - camera.current.x) * 0.1;
                    camera.current.y += (targetCamY - camera.current.y) * 0.1;
                    needsNextFrame = true;
                }
            }
        }

        if (playerTrailRef.current.length > 0) {
            playerTrailRef.current = playerTrailRef.current.filter(t => t.alpha > 0.01);
            playerTrailRef.current.forEach(t => { t.alpha *= 0.92; });
            if (playerTrailRef.current.length > 0) needsNextFrame = true;
        }

        const now = Date.now();
        const isAnyRoomAnimating = Object.values(stableRoomsRef.current).some((r: any) => now - (r.createdAt || 0) < 800);
        if (isAnyRoomAnimating) needsNextFrame = true;

        drawMap(ctx, dpr, w, h, marquee);
        return needsNextFrame;
    }, [drawMap, isDragging, getDPR, marquee, canvasRef, camera, playerPosRef, playerTrailRef, autoCenter, stableRoomIdRef, stableRoomsRef]);

    const lastRenderVersion = useRef(renderVersion);

    useEffect(() => {
        let active = true;
        let isLooping = false;

        const loop = () => {
            if (!active) {
                isLooping = false;
                return;
            }

            const needsNextFrame = tick();

            if (needsNextFrame) {
                isLooping = true;
                requestRef.current = requestAnimationFrame(loop);
            } else {
                isLooping = false;
                requestRef.current = null;
            }
        };

        // Start or restart the loop whenever deps change (especially renderVersion)
        if (!isLooping) {
            loop();
        }

        return () => {
            active = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, [tick, renderVersion, isDragging]);

    return { tick };
};
