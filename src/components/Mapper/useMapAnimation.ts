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
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    preMoveRef?: React.MutableRefObject<{ dir: string, targetId: string, time: number } | null>;
    walkTargetId?: string | null;
    walkPath?: string[];
}

export const useMapAnimation = ({
    drawMap, rooms, markers, currentRoomId, isDragging, renderVersion,
    canvasRef, camera, playerPosRef, playerTrailRef, getDPR, marquee, autoCenter, 
    stableRoomsRef, stableRoomIdRef, stableMarkersRef, firstExploredAtRef, preloadedCoordsRef,
    preMoveRef, walkTargetId, walkPath
}: AnimationProps) => {
    const requestRef = useRef<number | null>(null);
    const tickRef = useRef<(() => boolean) | null>(null);

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const trackerRef = useRef<{ endTimes: number[] }>({ endTimes: [] });

    const lastFrameTimeRef = useRef<number>(0);
    const animationQueueRef = useRef<{ x: number, y: number, z: number }[]>([]);
    const lastProcessedRoomIdRef = useRef<string | null>(null);

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
        
        // Increase throttle to ~60fps (16ms) instead of 30fps (32ms)
        // Since we've optimized the rendering, we can afford more frames.
        if (deltaTime < 16) return true;
        
        // Calculate a normalized factor for lerping based on time (aiming for 60fps base)
        const frameScale = Math.min(2, deltaTime / 16.67);
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
        const preMove = preMoveRef?.current;
        const targetId = preMove ? preMove.targetId : activeRoomId;
        const roomsData = stableRoomsRef.current;

        // 1. Process Queue - if room changed, add to queue
        if (targetId && targetId !== lastProcessedRoomIdRef.current && roomsData) {
            let newTarget = roomsData[targetId];
            if (!newTarget) {
                const rawId = targetId.startsWith('m_') ? targetId.substring(2) : targetId;
                const pData = preloadedCoordsRef.current[rawId];
                if (pData) {
                    newTarget = { x: pData[0], y: pData[1], z: pData[2] || 0 };
                }
            }

            if (newTarget) {
                // If this is a real GMCP update (not a preMove) and it differs from what we processed last,
                // we might need to clear the queue if it was a prediction miss.
                const isRealMove = activeRoomId === targetId;
                if (isRealMove && lastProcessedRoomIdRef.current && lastProcessedRoomIdRef.current !== targetId) {
                    // Prediction miss or correction - clear pending predicted animations
                    animationQueueRef.current = [];
                }

                // If we have a walkPath, find intermediate steps
                if (walkPath && walkPath.length > 0) {
                    const lastIdx = walkPath.indexOf(lastProcessedRoomIdRef.current || '');
                    const currentIdx = walkPath.indexOf(targetId);
                    
                    if (lastIdx !== -1 && currentIdx !== -1 && currentIdx > lastIdx) {
                        // Intermediate rooms between last and current in the path
                        for (let i = lastIdx + 1; i <= currentIdx; i++) {
                            const stepId = walkPath[i];
                            let step = roomsData[stepId];
                            if (!step) {
                                const rawStepId = stepId.startsWith('m_') ? stepId.substring(2) : stepId;
                                const pStepData = preloadedCoordsRef.current[rawStepId];
                                if (pStepData) step = { x: pStepData[0], y: pStepData[1], z: pStepData[2] || 0 };
                            }
                            if (step) animationQueueRef.current.push({ x: step.x, y: step.y, z: step.z || 0 });
                        }
                    } else {
                        // Just push the target if path isn't helpful
                        animationQueueRef.current.push({ x: newTarget.x, y: newTarget.y, z: newTarget.z || 0 });
                    }
                } else {
                    animationQueueRef.current.push({ x: newTarget.x, y: newTarget.y, z: newTarget.z || 0 });
                }
                lastProcessedRoomIdRef.current = targetId;
            }
        }

        // 2. Animate Player toward the head of the queue
        if (playerPosRef.current && animationQueueRef.current.length > 0) {
            const target = animationQueueRef.current[0];
            const px = playerPosRef.current.x, py = playerPosRef.current.y;
            const targetX = target.x, targetY = target.y;

            const dx = targetX - px, dy = targetY - py;
            const distSq = dx * dx + dy * dy;

            // Teleportation Threshold: If distance > 20 rooms, snap immediately
            if (distSq > 400) {
                playerPosRef.current.x = targetX;
                playerPosRef.current.y = targetY;
                playerPosRef.current.z = target.z;
                animationQueueRef.current.shift();
                needsNextFrame = true;
            } else if (distSq > 0.0000001) {
                const lerpFactor = 1 - Math.pow(0.85, frameScale);
                playerPosRef.current.x += dx * lerpFactor;
                playerPosRef.current.y += dy * lerpFactor;
                playerPosRef.current.z = target.z; // Snap Z for clipping

                if (distSq > 0.001) {
                    playerTrailRef.current.push({
                        x: playerPosRef.current.x,
                        y: playerPosRef.current.y,
                        z: playerPosRef.current.z,
                        alpha: 0.8
                    });
                    if (playerTrailRef.current.length > 30) playerTrailRef.current.shift();
                }

                // Snap threshold: If we are very close, just finish the move
                if (distSq < 0.005) {
                    playerPosRef.current.x = targetX;
                    playerPosRef.current.y = targetY;
                    animationQueueRef.current.shift();
                }
                needsNextFrame = true;
            } else {
                animationQueueRef.current.shift();
                needsNextFrame = true;
            }
        }

        // 3. Fallback: if queue is empty but player is not at targetId
        if (targetId && animationQueueRef.current.length === 0 && playerPosRef.current && roomsData) {
            let target = roomsData[targetId];
            if (!target) {
                const rawId = targetId.startsWith('m_') ? targetId.substring(2) : targetId;
                const pData = preloadedCoordsRef.current[rawId];
                if (pData) {
                    target = { x: pData[0], y: pData[1], z: pData[2] || 0 };
                }
            }

            if (target) {
                const dx = target.x - playerPosRef.current.x;
                const dy = target.y - playerPosRef.current.y;
                const dsq = dx * dx + dy * dy;

                if (dsq > 400) {
                    // Teleport snap
                    playerPosRef.current.x = target.x;
                    playerPosRef.current.y = target.y;
                    playerPosRef.current.z = target.z || 0;
                    needsNextFrame = true;
                } else if (dsq > 0.001) {
                    const lerpFactor = 1 - Math.pow(0.88, frameScale);
                    playerPosRef.current.x += dx * lerpFactor;
                    playerPosRef.current.y += dy * lerpFactor;
                    needsNextFrame = true;
                }
            }
        }

        // Camera Centering logic (Allow auto-center even if dragging IF it's a joystick pulse)
        if ((autoCenter || walkTargetId) && playerPosRef.current && (!isDragging || isJoystickActiveRef.current)) {
            const zoom = camera.current.zoom || 1;
            const targetCamX = (playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2) - (w / (2 * zoom));
            const targetCamY = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));

            const cdx = targetCamX - camera.current.x;
            const cdy = targetCamY - camera.current.y;
            if (Math.abs(cdx) > 0.05 || Math.abs(cdy) > 0.05) {
                const camLerp = 1 - Math.pow(0.9, frameScale);
                camera.current.x += cdx * camLerp;
                camera.current.y += cdy * camLerp;
                needsNextFrame = true;
            } else {
                camera.current.x = targetCamX;
                camera.current.y = targetCamY;
            }
        }

        if (playerTrailRef.current.length > 0) {
            let trailChanged = false;
            // Use a more efficient decay constant
            const decay = Math.pow(0.93, frameScale);
            playerTrailRef.current = playerTrailRef.current.filter(t => {
                if (t.alpha > 0.05) {
                    t.alpha *= decay;
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
    }, [renderVersion, isDragging, drawMap, currentRoomId, rooms, preMoveRef, walkTargetId]);

    return { tick: tickRef.current };
};
