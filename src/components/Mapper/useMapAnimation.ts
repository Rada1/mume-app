import { useEffect, useRef, useCallback } from 'react';
import { GRID_SIZE } from './mapperUtils';

interface AnimationProps {
    drawMap: (ctx: CanvasRenderingContext2D, dpr: number, w: number, h: number, marquee: any) => void;
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    isDragging: boolean;
    isDraggingRef?: React.RefObject<boolean>;
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
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    preMoveRef?: React.MutableRefObject<{ dir: string, targetId: string, time: number } | null>;
    walkTargetId?: string | null;
    walkPath?: string[];
    activeMapFilter?: string | null;
    combatAnimationActive?: boolean;
}

export const useMapAnimation = ({
    drawMap, rooms, markers, currentRoomId, isDragging, renderVersion,
    canvasRef, camera, playerPosRef, playerTrailRef, getDPR, marquee, autoCenter, 
    stableRoomsRef, stableRoomIdRef, stableMarkersRef, firstExploredAtRef, preloadedCoordsRef,
    preMoveRef, walkTargetId, walkPath, isDraggingRef, activeMapFilter, combatAnimationActive
}: AnimationProps) => {
    const requestRef = useRef<number | null>(null);
    const tickRef = useRef<(() => boolean) | null>(null);

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const trackerRef = useRef<{ endTimes: number[] }>({ endTimes: [] });

    const lastFrameTimeRef = useRef<number>(0);

    const isJoystickActiveRef = useRef(false);
    const joystickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const onPushMove = () => {
            isJoystickActiveRef.current = true;
            if (joystickTimeoutRef.current) clearTimeout(joystickTimeoutRef.current);
            joystickTimeoutRef.current = setTimeout(() => {
                isJoystickActiveRef.current = false;
            }, 1100);
        };
        window.addEventListener('mume-mapper-push-move', onPushMove);
        return () => {
            window.removeEventListener('mume-mapper-push-move', onPushMove);
            if (joystickTimeoutRef.current) clearTimeout(joystickTimeoutRef.current);
        };
    }, []);

    // Keep tick logic in a ref so the loop can access the latest version without restarting
    (tickRef as any).current = () => {
        const cvs = canvasRef.current;
        if (!cvs) return false;
        
        const now = performance.now();
        const deltaTime = now - lastFrameTimeRef.current;
        
        // Filter/path pulses are cosmetic, so 30fps is plenty and much lighter
        // when a broad filter matches many rooms.
        const frameBudget = activeMapFilter || combatAnimationActive ? 33 : 16;
        if (deltaTime < frameBudget) return true;
        
        // Calculate a normalized factor for lerping based on time (aiming for 60fps base)
        const frameScale = Math.min(2, deltaTime / 16.67);
        lastFrameTimeRef.current = now;

        if (!ctxRef.current) {
            ctxRef.current = cvs.getContext('2d', { alpha: true });
        }
        const ctx = ctxRef.current;
        if (!ctx) return false;

        const dpr = getDPR();
        const w = cvs.width / dpr;
        const h = cvs.height / dpr;

        const effectiveIsDragging = isDragging || isDraggingRef?.current;
        let needsNextFrame = effectiveIsDragging;

        // Player position is snapped immediately in useMapperPlayerTracking — no queue/lerp needed here.
        // Camera centering still lerps smoothly toward playerPosRef.current.

        // Camera Centering logic (Allow auto-center even if dragging IF it's a joystick pulse)
        if ((autoCenter || walkTargetId) && playerPosRef.current && (!effectiveIsDragging || isJoystickActiveRef.current)) {
            // Log once when auto-centering is active if it wasn't before
            if (!(tickRef as any)._autoCenterActive) {
                (tickRef as any)._autoCenterActive = true;
            }
            const zoom = camera.current.zoom || 1;
            const targetCamX = (playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2) - (w / (2 * zoom));
            const targetCamY = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));

            const cdx = targetCamX - camera.current.x;
            const cdy = targetCamY - camera.current.y;
            if (Math.abs(cdx) > 0.05 || Math.abs(cdy) > 0.05) {
                // Camera tracks faster during joystick spam so the view never lags
                const camBase = isJoystickActiveRef.current ? 0.65 : 0.9;
                const camLerp = 1 - Math.pow(camBase, frameScale);
                camera.current.x += cdx * camLerp;
                camera.current.y += cdy * camLerp;
                needsNextFrame = true;
            } else {
                camera.current.x = targetCamX;
                camera.current.y = targetCamY;
            }
        } else {
            if ((tickRef as any)._autoCenterActive) {
                (tickRef as any)._autoCenterActive = false;
            }
        }

        // Trail: remove entries that have faded out (> 450ms old)
        const TRAIL_DURATION = 450;
        if (playerTrailRef.current.length > 0) {
            const wallNow = Date.now();
            playerTrailRef.current = playerTrailRef.current.filter(
                (t: any) => wallNow - (t.startTime ?? 0) < TRAIL_DURATION
            );
            if (playerTrailRef.current.length > 0) needsNextFrame = true;
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
        if (activeMapFilter || combatAnimationActive || currentRoomId) needsNextFrame = true;

        drawMap(ctx, dpr, w, h, marquee);
        return needsNextFrame;
    };

    const isDraggingValRef = useRef(isDragging);
    isDraggingValRef.current = isDragging;

    const triggerAnimation = useCallback(() => {
        if (requestRef.current !== null) return;
        
        const animate = () => {
            const needsNextFrame = tickRef.current?.() ?? false;
            const effectiveIsDragging = isDraggingValRef.current || isDraggingRef?.current;
            if (needsNextFrame || effectiveIsDragging) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                requestRef.current = null;
            }
        };
        
        lastFrameTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animate);
    }, [isDraggingRef]);

    useEffect(() => {
        ctxRef.current = null; // Reset context when dimensions or render dependencies change
        triggerAnimation();
    }, [triggerAnimation, drawMap, renderVersion, currentRoomId, walkTargetId, activeMapFilter, combatAnimationActive]);

    useEffect(() => {
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, []);

    return { tick: tickRef.current };
};
