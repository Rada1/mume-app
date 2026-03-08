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
    stableMarkersRef: React.MutableRefObject<Record<string, any>>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
}

export const useMapAnimation = ({
    drawMap, rooms, markers, currentRoomId, isDragging, renderVersion,
    canvasRef, camera, playerPosRef, playerTrailRef, getDPR, marquee, autoCenter, 
    stableRoomsRef, stableRoomIdRef, stableMarkersRef, firstExploredAtRef
}: AnimationProps) => {
    const requestRef = useRef<number | null>(null);
    const tickRef = useRef<(() => boolean) | null>(null);

    // Keep tick logic in a ref so the loop can access the latest version without restarting
    (tickRef as any).current = () => {
        const cvs = canvasRef.current;
        if (!cvs) return false;
        const ctx = cvs.getContext('2d', { alpha: false }); // Optimization
        if (!ctx) return false;

        const dpr = getDPR();
        const w = cvs.width / dpr;
        const h = cvs.height / dpr;

        let needsNextFrame = isDragging;

        // Safety check for camera zoom
        if (!camera.current.zoom || isNaN(camera.current.zoom)) camera.current.zoom = 1;
        if (camera.current.zoom < 0.01) camera.current.zoom = 0.01;

        // Auto-centering & Player Animation
        const activeRoomId = stableRoomIdRef.current;
        if (playerPosRef.current && activeRoomId && stableRoomsRef.current[activeRoomId]) {
            const target = stableRoomsRef.current[activeRoomId];
            const px = playerPosRef.current.x, py = playerPosRef.current.y;
            const targetX = target.x, targetY = target.y;

            const dist = Math.hypot(px - targetX, py - targetY);
            if (dist > 0.001) {
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
            let trailChanged = false;
            playerTrailRef.current = playerTrailRef.current.filter(t => {
                if (t.alpha > 0.01) {
                    t.alpha *= 0.92;
                    trailChanged = true;
                    return true;
                }
                return false;
            });
            if (trailChanged) needsNextFrame = true;
        }

        const now = Date.now();
        // Optimization: Don't scan 50,000 rooms every frame!
        // We only scan if we suspect there MIGHT be an active animation.
        // Even better, keep a tracked array of active timestamps and clean them up.
        
        let hasActiveAnim = false;

        // Optimize discovery animation checks by just checking the _latest timestamp
        const latestExplored = firstExploredAtRef.current['_latest'] || 0;
        if (now - latestExplored < 800) hasActiveAnim = true;

        // Check markers/rooms. Since we don't have a _latest for them currently,
        // we'll rely on renderVersion to detect when items have been recently added.
        if (!(tickRef as any)._animTracker) (tickRef as any)._animTracker = { endTimes: [] };
        const tracker = (tickRef as any)._animTracker;
        if ((tickRef as any)._lastRenderVersion !== renderVersion) {
            (tickRef as any)._lastRenderVersion = renderVersion;
            tracker.endTimes.push(now + 800);
        }

        tracker.endTimes = tracker.endTimes.filter((time: number) => time > now);
        if (tracker.endTimes.length > 0) hasActiveAnim = true;

        if (hasActiveAnim) needsNextFrame = true;

        drawMap(ctx, dpr, w, h, marquee);
        return needsNextFrame;
    };

    useEffect(() => {
        let active = true;

        const animate = () => {
            if (!active) return;
            const needsNextFrame = tickRef.current?.() ?? false;
            if (needsNextFrame || isDragging) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                requestRef.current = null;
            }
        };

        // Always ensure a frame is drawn on manual triggers
        animate();

        return () => {
            active = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, [renderVersion, isDragging]);

    return { tick: tickRef.current };
};
