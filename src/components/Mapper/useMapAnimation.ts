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

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const trackerRef = useRef<{ endTimes: number[] }>({ endTimes: [] });

    const lastFrameTimeRef = useRef<number>(0);

    // Keep tick logic in a ref so the loop can access the latest version without restarting
    (tickRef as any).current = () => {
        const cvs = canvasRef.current;
        if (!cvs) return false;
        
        const now = performance.now();
        // Render Throttle: Cap mapper rendering to ~30fps during animations/movement
        // This is crucial because heavy combat/walking streams text and drawing thousands
        // of rooms at 60fps+ steals CPU cycles from the React MessageLog render loop,
        // causing perceived input lag and choppy text logs.
        if (now - lastFrameTimeRef.current < 32) return true;
        lastFrameTimeRef.current = now;

        if (!ctxRef.current) {
            ctxRef.current = cvs.getContext('2d', { alpha: false, desynchronized: true });
        }
        const ctx = ctxRef.current;
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

            const dx = targetX - px, dy = targetY - py;
            const distSq = dx * dx + dy * dy;
            if (distSq > 0.0000001) {
                const lerpFactor = 0.12; // Smoother player glide
                playerPosRef.current.x += dx * lerpFactor;
                playerPosRef.current.y += dy * lerpFactor;
                
                // Push trail dots during glide for smoothness
                if (distSq > 0.001) {
                    playerTrailRef.current.push({
                        x: playerPosRef.current.x,
                        y: playerPosRef.current.y,
                        z: playerPosRef.current.z,
                        alpha: 0.8
                    });
                    if (playerTrailRef.current.length > 40) playerTrailRef.current.shift();
                }

                // Snap if very close to prevent micro-frames
                if (distSq < 0.00001) {
                   playerPosRef.current.x = targetX;
                   playerPosRef.current.y = targetY;
                } else {
                   needsNextFrame = true;
                }
            }

            if (autoCenter && !isDragging) {
                const zoom = camera.current.zoom || 1;
                const targetCamX = (playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2) - (w / (2 * zoom));
                const targetCamY = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));

                const cdx = targetCamX - camera.current.x;
                const cdy = targetCamY - camera.current.y;
                if (Math.abs(cdx) > 0.05 || Math.abs(cdy) > 0.05) {
                    const camLerp = 0.1; // Smoother camera glide
                    camera.current.x += cdx * camLerp;
                    camera.current.y += cdy * camLerp;
                    needsNextFrame = true;
                } else {
                    camera.current.x = targetCamX;
                    camera.current.y = targetCamY;
                }
            }
        }

        if (playerTrailRef.current.length > 0) {
            let trailChanged = false;
            playerTrailRef.current = playerTrailRef.current.filter(t => {
                if (t.alpha > 0.01) {
                    t.alpha *= 0.93; // Slower trail decay for better persistence
                    trailChanged = true;
                    return true;
                }
                return false;
            });
            if (trailChanged) needsNextFrame = true;
        }

        const wallTime = Date.now();
        const latestExplored = firstExploredAtRef.current['_latest'] || 0;
        if (wallTime - latestExplored < 500) needsNextFrame = true;

        if ((tickRef as any)._lastRenderVersion !== renderVersion) {
            (tickRef as any)._lastRenderVersion = renderVersion;
            trackerRef.current.endTimes.push(wallTime + 1500);
        }

        trackerRef.current.endTimes = trackerRef.current.endTimes.filter((time: number) => time > wallTime);
        if (trackerRef.current.endTimes.length > 0) needsNextFrame = true;

        drawMap(ctx, dpr, w, h, marquee);
        return needsNextFrame;
    };

    useEffect(() => {
        // Reset context if canvas dimensions or properties change (triggering useEffect)
        ctxRef.current = null;
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

        animate();

        return () => {
            active = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, [renderVersion, isDragging, drawMap, currentRoomId, rooms]);

    return { tick: tickRef.current };
};
