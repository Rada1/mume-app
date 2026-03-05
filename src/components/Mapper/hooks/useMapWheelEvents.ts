import { useCallback } from 'react';
import { MapperRoom } from '../mapperTypes';

interface UseMapWheelEventsProps {
    cameraRef: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    setViewZ: React.Dispatch<React.SetStateAction<number | null>>;
    setAutoCenter: (auto: boolean) => void;
    triggerRender: () => void;
}

export const useMapWheelEvents = ({
    cameraRef, roomsRef, currentRoomIdRef, canvasRef, setViewZ, setAutoCenter, triggerRender
}: UseMapWheelEventsProps) => {

    const onWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const cvs = canvasRef.current;
        if (!cvs) return;

        if (e.ctrlKey) {
            const dir = e.deltaY > 0 ? -1 : 1;
            setViewZ(prev => {
                const currentZ = currentRoomIdRef.current ? (roomsRef.current[currentRoomIdRef.current]?.z || 0) : 0;
                return (prev !== null ? prev : currentZ) + dir;
            });
            setAutoCenter(false);
            triggerRender();
            return;
        }
        const rect = cvs.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const cam = cameraRef.current, oldZoom = cam.zoom;
        const factor = Math.pow(1.05, -e.deltaY / 120);
        const newZoom = Math.max(0.01, Math.min(oldZoom * factor, 5));
        if (Math.abs(newZoom - oldZoom) < 0.001) return;
        const wx = (mx / oldZoom) + cam.x, wy = (my / oldZoom) + cam.y;
        cam.x = wx - (mx / newZoom); cam.y = wy - (my / newZoom); cam.zoom = newZoom;
        setAutoCenter(false);
        triggerRender();
    }, [cameraRef, roomsRef, currentRoomIdRef, canvasRef, setViewZ, setAutoCenter, triggerRender]);

    return { onWheel };
};
