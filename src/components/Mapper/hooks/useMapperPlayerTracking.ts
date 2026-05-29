import { useLayoutEffect, useCallback, MutableRefObject } from 'react';
import { GRID_SIZE } from '../mapperUtils';

export const useMapperPlayerTracking = (
    currentRoomId: string | null,
    rooms: Record<string, any>,
    autoCenter: boolean,
    setAutoCenter: (autoCenter: boolean) => void,
    cameraRef: MutableRefObject<{ x: number, y: number, zoom: number }>,
    canvasRef: React.RefObject<HTMLCanvasElement>,
    playerPosRef: MutableRefObject<{ x: number, y: number, z: number } | null>,
    playerTrailRef: MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>,
    lastRoomIdRef: MutableRefObject<string | null>,
    triggerRender: () => void,
    setViewZ: (z: number | null) => void,
    preloadedCoordsRef: MutableRefObject<Record<string, any>>
) => {
    // Handle Player Position & Trail
    // useLayoutEffect runs synchronously after React commit, before the next rAF/paint.
    // This is required so playerPosRef is updated before the next canvas draw — otherwise
    // the prediction queue (reconciled synchronously in handleRoomInfo) can race ahead of
    // the visible player, leaving a gap between the player and the first prediction tile.
    useLayoutEffect(() => {
        let r = currentRoomId ? rooms[currentRoomId] : null;
        if (!r && currentRoomId) {
            const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
            const pData = preloadedCoordsRef.current[rawId];
            if (pData) {
                r = { x: pData[0], y: pData[1], z: pData[2] || 0 };
            }
        }

        if (currentRoomId && r) {
            const hasChanged = currentRoomId !== lastRoomIdRef.current;

            if (hasChanged && playerPosRef.current) {
                // Add old position to trail
                playerTrailRef.current.push({
                    x: playerPosRef.current.x,
                    y: playerPosRef.current.y,
                    z: playerPosRef.current.z,
                    alpha: 1.0,
                });
                if (playerTrailRef.current.length > 40) playerTrailRef.current.shift();
            }

            // Always snap to the confirmed room position immediately
            if (!playerPosRef.current) {
                playerPosRef.current = { x: r.x, y: r.y, z: r.z || 0 };
            } else {
                playerPosRef.current.x = r.x;
                playerPosRef.current.y = r.y;
                playerPosRef.current.z = r.z || 0;
            }

            // Whenever the room changes, enable auto-center so the animation loop
            // in useMapAnimation.ts can glide the camera smoothly to the new target.
            if (hasChanged) {
                const isInitialLogin = lastRoomIdRef.current === null;
                lastRoomIdRef.current = currentRoomId;
                setAutoCenter(true);
                setViewZ(null);

                const cvs = canvasRef.current;
                let w = cvs ? (cvs.clientWidth || cvs.parentElement?.clientWidth || 400) : 400;
                let h = cvs ? (cvs.clientHeight || cvs.parentElement?.clientHeight || 400) : 400;

                if (isInitialLogin) {
                    const startZoom = 0.12; // Far zoomed out for orientation
                    const finalZoom = cameraRef.current.zoom || 1.0;

                    // Instantly snap camera position to zoomed-out state
                    cameraRef.current.zoom = startZoom;
                    cameraRef.current.x = (r.x * GRID_SIZE + GRID_SIZE / 2) - w / (2 * startZoom);
                    cameraRef.current.y = (r.y * GRID_SIZE + GRID_SIZE / 2) - h / (2 * startZoom);

                    // Set anchor to canvas center so the zoom-in keeps the player centered
                    (cameraRef.current as any).zoomAnchorX = w / 2;
                    (cameraRef.current as any).zoomAnchorY = h / 2;

                    // Setup the zoom transition parameters for the animation loop
                    (cameraRef.current as any).zoomTransition = {
                        startTime: Date.now(),
                        duration: 2500, // 2.5s total animation duration
                        startZoom: startZoom,
                        endZoom: finalZoom
                    };
                } else {
                    // Snap camera for large jumps (teleport, reconnect).
                    // Adjacent room steps are <= ~70 units; anything beyond 4 rooms snaps.
                    const zoom = cameraRef.current.zoom || 1;
                    const targetX = (r.x * GRID_SIZE + GRID_SIZE / 2) - w / (2 * zoom);
                    const targetY = (r.y * GRID_SIZE + GRID_SIZE / 2) - h / (2 * zoom);
                    const dist = Math.hypot(targetX - cameraRef.current.x, targetY - cameraRef.current.y);
                    if (dist > GRID_SIZE * 4) {
                        cameraRef.current.x = targetX;
                        cameraRef.current.y = targetY;
                    }
                }
            }

            // Always allow triggerRender to fire, otherwise stationary map updates
            // (e.g. an NPC entering the room changing mob flags) won't redraw.
            triggerRender();

        } else if (!currentRoomId) {
            lastRoomIdRef.current = null;
            playerPosRef.current = null;
            playerTrailRef.current = [];
            triggerRender();
        }
    }, [currentRoomId, rooms, autoCenter, cameraRef, triggerRender]);

    const handleCenterOnPlayer = useCallback(() => {
        setAutoCenter(true);
        setViewZ(null);
        triggerRender();
    }, [triggerRender, setViewZ, setAutoCenter]);

    return { handleCenterOnPlayer };
};
