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
                // Add old position to trail
                playerTrailRef.current.push({
                    x: playerPosRef.current.x,
                    y: playerPosRef.current.y,
                    z: playerPosRef.current.z,
                    alpha: 1.0
                });
                if (playerTrailRef.current.length > 15) playerTrailRef.current.shift();
            }
            
            // Always update current position
            playerPosRef.current = { x: r.x, y: r.y, z: r.z || 0 };

            // Whenever the room changes, enable auto-center so the animation loop
            // in useMapAnimation.ts can glide the camera smoothly to the new target.
            if (currentRoomId !== lastRoomIdRef.current) {
                lastRoomIdRef.current = currentRoomId;
                setAutoCenter(true);
            }

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
        triggerRender();
    }, [triggerRender]);

    return { handleCenterOnPlayer };
};