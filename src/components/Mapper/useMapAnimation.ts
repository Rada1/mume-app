/**
 * @file useMapAnimation.ts
 * @description Drives finite mapper canvas animation bursts for movement and live overlays.
 */

import { useEffect, useRef, useCallback } from 'react';
import { GRID_SIZE } from './mapperUtils';
import { perfMonitor } from '../../utils/perfMonitor';

const PLAYER_PULSE_FRAME_MS = 33;
const MOBILE_PLAYER_PULSE_FRAME_MS = 50;
// When the ONLY thing animating is the perpetual player-beacon/room-glow breath
// (sine period ~2.6s), the whole-map canvas does NOT need 20–30fps. Redraw it far
// less often — the slow glow still reads smoothly, and idle CPU/GPU drops sharply.
const IDLE_PULSE_FRAME_MS = 80;
const MOBILE_IDLE_PULSE_FRAME_MS = 120;
const WAKE_ANIMATION_MS = 1500;
const EXPLORATION_WAKE_MS = 850;

interface AnimationProps {
    drawMap: (ctx: CanvasRenderingContext2D, dpr: number, w: number, h: number, marquee: any, isDragging?: boolean) => void;
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
    mapSearchQuery?: string;
    entitiesRef: React.MutableRefObject<any>;
    isMobile?: boolean;
    isLandscape?: boolean;
    filterFitRef?: { current: { zoom: number, camX: number, camY: number } | null };
}

export const useMapAnimation = ({
    drawMap, rooms, markers, currentRoomId, isDragging, renderVersion,
    canvasRef, camera, playerPosRef, playerTrailRef, getDPR, marquee, autoCenter,
    stableRoomsRef, stableRoomIdRef, stableMarkersRef, firstExploredAtRef, preloadedCoordsRef,
    preMoveRef, walkTargetId, walkPath, isDraggingRef, activeMapFilter, mapSearchQuery,
    entitiesRef, isMobile, isLandscape, filterFitRef
}: AnimationProps) => {
    const requestRef = useRef<number | null>(null);
    const tickRef = useRef<(() => boolean) | null>(null);
    const preFilterZoomRef = useRef<number | null>(null);
    const wasFilterActiveRef = useRef(false);
    const fitConvergedRef = useRef(false);
    const lastFilterKeyRef = useRef<string>('');
    const lastPlayerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const wakeUntilRef = useRef(0);
    // True when the previous frame had nothing animating except the perpetual breath,
    // so the next frame can be scheduled on the slow idle-pulse cadence.
    const pulseOnlyRef = useRef(false);

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
        
        const { opponentId, opponentName, roomChars } = entitiesRef.current;
        const combatAnimationActive = !!(opponentId || opponentName || (roomChars && Object.values(roomChars).some((char: any) => {
            const fighting = char.fighting == null ? '' : String(char.fighting);
            return fighting !== '' && fighting.toLowerCase() !== 'you' && fighting !== 'Someone';
        })));
        const effectiveIsDragging = isDragging || isDraggingRef?.current;
        const hasLiveOverlayAnimation = !!(activeMapFilter || mapSearchQuery?.trim() || combatAnimationActive || walkTargetId);
        const idleFrameBudget = isMobile ? MOBILE_PLAYER_PULSE_FRAME_MS : PLAYER_PULSE_FRAME_MS;
        const idlePulseBudget = isMobile ? MOBILE_IDLE_PULSE_FRAME_MS : IDLE_PULSE_FRAME_MS;
        // If the prior frame was breath-only, throttle hard. Active interaction (drag/overlay/
        // joystick) always gets 16ms; transient camera/trail/wake animation gets the normal
        // idle budget. The slow cadence only applies to a fully-idle, perpetually-breathing map.
        const frameBudget = effectiveIsDragging || hasLiveOverlayAnimation || isJoystickActiveRef.current
            ? 16
            : (pulseOnlyRef.current ? idlePulseBudget : idleFrameBudget);
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

        // Start false: real animations (camera, trails, wake, filter, combat) set this to true
        // below as needed. If nothing does, the keep-alive at the end of tick re-enables it on
        // a slow cadence purely to keep the player-beacon/room-glow breath alive — without
        // forcing a full-map redraw 20–30×/sec while standing still.
        let needsNextFrame = false;

        // Player position is snapped immediately in useMapperPlayerTracking — no queue/lerp needed here.
        // Camera centering still lerps smoothly toward playerPosRef.current.

        // Filter fit: zoom out to show both player and nearest match
        const filterFit = filterFitRef?.current;
        const isFilterFitActive = !!filterFit;

        const currentFilterKey = `${activeMapFilter || ''}|${(mapSearchQuery || '').trim().toLowerCase()}`;
        const filterKeyChanged = lastFilterKeyRef.current !== currentFilterKey;

        if (filterKeyChanged) {
            lastFilterKeyRef.current = currentFilterKey;
            if (isFilterFitActive) {
                if (!wasFilterActiveRef.current) {
                    preFilterZoomRef.current = camera.current.zoom;
                    wasFilterActiveRef.current = true;
                }
                fitConvergedRef.current = false;
                lastPlayerPosRef.current = playerPosRef.current ? { ...playerPosRef.current } : null;
            }
        }

        const playerMoved = playerPosRef.current && lastPlayerPosRef.current && (
            playerPosRef.current.x !== lastPlayerPosRef.current.x ||
            playerPosRef.current.y !== lastPlayerPosRef.current.y ||
            playerPosRef.current.z !== lastPlayerPosRef.current.z
        );

        if (playerMoved) {
            fitConvergedRef.current = true; // stop filter fit animation
            lastPlayerPosRef.current = null; // stop blocking autocenter
        }

        if (!isFilterFitActive && wasFilterActiveRef.current) {
            wasFilterActiveRef.current = false;
            fitConvergedRef.current = false;
            lastPlayerPosRef.current = null;
        }

        // One-shot zoom-to-fit: runs until converged or user drags, then stops.
        // After convergence the user can freely pan/zoom without the camera fighting back.
        if (filterFit && !fitConvergedRef.current) {
            if (effectiveIsDragging) {
                // User grabbed the map before convergence: abandon fit immediately
                fitConvergedRef.current = true;
            } else {
                const dz = filterFit.zoom - camera.current.zoom;
                const cdx = filterFit.camX - camera.current.x;
                const cdy = filterFit.camY - camera.current.y;
                if (Math.abs(dz) > 0.001 || Math.abs(cdx) > 0.5 || Math.abs(cdy) > 0.5) {
                    camera.current.zoom += dz * (1 - Math.pow(0.93, frameScale));
                    camera.current.x += cdx * (1 - Math.pow(0.9, frameScale));
                    camera.current.y += cdy * (1 - Math.pow(0.9, frameScale));
                    needsNextFrame = true;
                } else {
                    // Snap to exact target and mark done
                    camera.current.zoom = filterFit.zoom;
                    camera.current.x = filterFit.camX;
                    camera.current.y = filterFit.camY;
                    fitConvergedRef.current = true;
                }
            }
        } else {
            const cam = camera.current as any;
            if (effectiveIsDragging && cam.zoomTransition) {
                delete cam.zoomTransition;
            }

            if (cam.zoomTransition) {
                const elapsed = Date.now() - cam.zoomTransition.startTime;
                const progress = Math.min(1, elapsed / cam.zoomTransition.duration);
                
                // Smooth power curve (progress^6): starts extremely slow and accelerates continuously to zoom in rapidly at the end
                const t = Math.pow(progress, 6);

                const oldZoom = cam.zoom;
                cam.zoom = cam.zoomTransition.startZoom + (cam.zoomTransition.endZoom - cam.zoomTransition.startZoom) * t;
                const newZoom = cam.zoom;

                const mx = cam.zoomAnchorX || 0;
                const my = cam.zoomAnchorY || 0;
                cam.x += (mx / oldZoom) - (mx / newZoom);
                cam.y += (my / oldZoom) - (my / newZoom);

                if (progress >= 1) {
                    cam.targetZoom = cam.zoomTransition.endZoom;
                    delete cam.zoomTransition;
                }
                needsNextFrame = true;
            } else if (cam.targetZoom !== undefined && Math.abs(cam.targetZoom - cam.zoom) > 0.001) {
                const oldZoom = cam.zoom;
                const zoomLerp = 1 - Math.pow(0.82, frameScale);
                cam.zoom += (cam.targetZoom - cam.zoom) * zoomLerp;
                const newZoom = cam.zoom;
                
                const mx = cam.zoomAnchorX || 0;
                const my = cam.zoomAnchorY || 0;
                cam.x += (mx / oldZoom) - (mx / newZoom);
                cam.y += (my / oldZoom) - (my / newZoom);
                
                needsNextFrame = true;
            } else if (cam.targetZoom !== undefined && cam.zoom !== cam.targetZoom) {
                const oldZoom = cam.zoom;
                cam.zoom = cam.targetZoom;
                const newZoom = cam.zoom;
                const mx = cam.zoomAnchorX || 0;
                const my = cam.zoomAnchorY || 0;
                cam.x += (mx / oldZoom) - (mx / newZoom);
                cam.y += (my / oldZoom) - (my / newZoom);
            }

            // Restore pre-filter zoom when filter is cleared
            if (!isFilterFitActive && preFilterZoomRef.current !== null) {
                const savedZoom = preFilterZoomRef.current;
                const dz = savedZoom - camera.current.zoom;
                if (Math.abs(dz) > 0.001) {
                    camera.current.zoom += dz * (1 - Math.pow(0.93, frameScale));
                    needsNextFrame = true;
                } else {
                    camera.current.zoom = savedZoom;
                    preFilterZoomRef.current = null;
                }
            }

            // Camera Centering logic (Allow auto-center even if dragging IF it's a joystick pulse)
            const shouldBlockAutoCenter = (isFilterFitActive && lastPlayerPosRef.current !== null) || !!cam.zoomTransition;
            if (!shouldBlockAutoCenter && (autoCenter || walkTargetId) && playerPosRef.current && (!effectiveIsDragging || isJoystickActiveRef.current)) {
                if (!(tickRef as any)._autoCenterActive) {
                    (tickRef as any)._autoCenterActive = true;
                }
                const zoom = camera.current.zoom || 1;
                const targetCamX = (playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2) - (w / (2 * zoom));
                let targetCamY = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));

                if (isMobile && !isLandscape) {
                    const tacticalClearance = 32;
                    targetCamY -= (tacticalClearance / 2) / zoom;
                }

                const cdx = targetCamX - camera.current.x;
                const cdy = targetCamY - camera.current.y;
                if (Math.abs(cdx) > 0.05 || Math.abs(cdy) > 0.05) {
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
        if (wallTime - latestExplored < EXPLORATION_WAKE_MS) needsNextFrame = true;

        const wakeKey = [
            renderVersion,
            currentRoomId || '',
            walkTargetId || '',
            activeMapFilter || '',
            combatAnimationActive ? 'combat' : '',
            marquee ? 'marquee' : ''
        ].join('|');

        if ((tickRef as any)._lastWakeKey !== wakeKey) {
            (tickRef as any)._lastWakeKey = wakeKey;
            wakeUntilRef.current = Math.max(wakeUntilRef.current, wallTime + WAKE_ANIMATION_MS);
        }

        if ((tickRef as any)._lastRenderVersion !== renderVersion) {
            (tickRef as any)._lastRenderVersion = renderVersion;
            wakeUntilRef.current = Math.max(wakeUntilRef.current, wallTime + WAKE_ANIMATION_MS);
        }

        if (wakeUntilRef.current > wallTime) {
            needsNextFrame = true;
        } else {
            wakeUntilRef.current = 0;
        }

        const container = cvs.closest('.mapper-container') as HTMLElement | null;
        if (container) {
            const FACTOR = 0.035;
            container.style.setProperty('--parallax-x', `${-camera.current.x * FACTOR}px`);
            container.style.setProperty('--parallax-y', `${-camera.current.y * FACTOR}px`);
            container.style.setProperty('--parallax-scale', `${1 + (camera.current.zoom - 1) * 0.05}`);
        }

        // Breath keep-alive: if no real animation requested another frame, keep the loop alive
        // solely for the perpetual beacon/room-glow breath — but flag it so the next frame is
        // scheduled on the slow idle-pulse cadence instead of the full idle frame rate.
        if (needsNextFrame) {
            pulseOnlyRef.current = false;
        } else {
            pulseOnlyRef.current = true;
            needsNextFrame = true;
        }

        const drawStart = performance.now();
        drawMap(ctx, dpr, w, h, marquee, effectiveIsDragging);
        perfMonitor.recordFrame(performance.now() - drawStart);
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
        const wake = () => triggerAnimation();
        window.addEventListener('mume-mapper-camera-change', wake);
        window.addEventListener('mume-mapper-wake', wake);
        return () => {
            window.removeEventListener('mume-mapper-camera-change', wake);
            window.removeEventListener('mume-mapper-wake', wake);
        };
    }, [triggerAnimation]);

    useEffect(() => {
        ctxRef.current = null; // Reset context when dimensions or render dependencies change
        triggerAnimation();
    // NOTE: currentRoomId intentionally excluded — room changes are handled by
    // the wake key system (wakeUntilRef) without needing to restart the loop.
    }, [triggerAnimation, drawMap, renderVersion, walkTargetId, activeMapFilter]);

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
