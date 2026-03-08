import { useEffect, useCallback, MutableRefObject } from 'react';

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
    triggerRender: () => void
) => {
    // Handle Player Position & Trail
    useEffect(() => {
        if (currentRoomId && rooms[currentRoomId]) {
            const r = rooms[currentRoomId];
            if (playerPosRef.current) {
                playerTrailRef.current.push({
                    x: playerPosRef.current.x,
                    y: playerPosRef.current.y,
                    z: playerPosRef.current.z,
                    alpha: 1.0
                });
                if (playerTrailRef.current.length > 15) playerTrailRef.current.shift();
            }
            if (!playerPosRef.current) {
                playerPosRef.current = { x: r.x, y: r.y, z: r.z || 0 };
            }

            // Whenever the room changes, re-center the map to follow the player
            if (currentRoomId !== lastRoomIdRef.current) {
                lastRoomIdRef.current = currentRoomId;
                if (canvasRef.current && playerPosRef.current) {
                    const cvs = canvasRef.current;
                    const dpr = window.devicePixelRatio || 1;
                    const w = cvs.width / dpr;
                    const h = cvs.height / dpr;
                    const zoom = cameraRef.current.zoom || 1;

                    cameraRef.current.x = (playerPosRef.current.x * 50 + 25) - (w / (2 * zoom));
                    cameraRef.current.y = (playerPosRef.current.y * 50 + 25) - (h / (2 * zoom));
                    setAutoCenter(true);
                }
            }

            triggerRender();
        } else if (!currentRoomId) {
            lastRoomIdRef.current = null;
            playerPosRef.current = null;
            playerTrailRef.current = [];
            triggerRender();
        }
    }, [currentRoomId, rooms, autoCenter, cameraRef, triggerRender]);

    // Cleanup trail over time
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerTrailRef.current.length > 0) {
                playerTrailRef.current = playerTrailRef.current
                    .map(t => ({ ...t, alpha: t.alpha - 0.05 }))
                    .filter(t => t.alpha > 0);
                triggerRender();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [triggerRender]);

    const handleCenterOnPlayer = useCallback(() => {
        if (playerPosRef.current && canvasRef.current) {
            const cvs = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            const w = cvs.width / dpr;
            const h = cvs.height / dpr;
            const zoom = cameraRef.current.zoom || 1;

            cameraRef.current.x = (playerPosRef.current.x * 50 + 25) - (w / (2 * zoom));
            cameraRef.current.y = (playerPosRef.current.y * 50 + 25) - (h / (2 * zoom));
            setAutoCenter(true);
            triggerRender();
        }
    }, [cameraRef, triggerRender]);

    return { handleCenterOnPlayer };
};