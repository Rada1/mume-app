import { useCallback } from 'react';
import { MapperRoom, MapperMarker } from '../mapperTypes';
import { GRID_SIZE } from '../mapperUtils';

interface UseMapHitTestProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    markersRef: React.MutableRefObject<Record<string, MapperMarker>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    cameraRef: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    viewZ: number | null;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>;
}

export const useMapHitTest = ({
    roomsRef, markersRef, currentRoomIdRef, cameraRef, canvasRef, viewZ, spatialIndexRef, preloadedCoordsRef
}: UseMapHitTestProps) => {

    const screenToWorld = useCallback((sx: number, sy: number) => {
        const cvs = canvasRef.current;
        if (!cvs) return { x: 0, y: 0 };
        return {
            x: (sx / cameraRef.current.zoom) + cameraRef.current.x,
            y: (sy / cameraRef.current.zoom) + cameraRef.current.y
        };
    }, [canvasRef, cameraRef]);

    const getRoomAt = useCallback((wx: number, wy: number, strictZ = false) => {
        const roomsToSearch = roomsRef.current;
        const currentZ = viewZ !== null ? viewZ : (currentRoomIdRef.current ? (roomsToSearch[currentRoomIdRef.current]?.z || 0) : 0);
        const margin = 2;
        let foundRoom: string | null = null;
        let bestDist = Infinity;

        // 1. Search Local State first
        for (const key in roomsToSearch) {
            const r = roomsToSearch[key];
            const rx = r.x * GRID_SIZE, ry = r.y * GRID_SIZE;
            if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                const rz = r.z || 0;
                if (rz === currentZ) return r.id;
                if (!strictZ) {
                    const dist = Math.abs(rz - currentZ);
                    if (dist < bestDist) { bestDist = dist; foundRoom = r.id; }
                }
            }
        }

        // 2. Search Master Map if nothing in local
        if (spatialIndexRef.current && preloadedCoordsRef.current) {
            const floor = Math.round(currentZ);
            const floorBuckets = spatialIndexRef.current[floor];
            if (floorBuckets) {
                const bx = Math.floor(wx / GRID_SIZE / 5);
                const by = Math.floor(wy / GRID_SIZE / 5);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const vnums = floorBuckets[`${bx + dx},${by + dy}`];
                        if (vnums) {
                            for (const vnum of vnums) {
                                const [rx_g, ry_g] = preloadedCoordsRef.current[vnum];
                                const rx = rx_g * GRID_SIZE, ry = ry_g * GRID_SIZE;
                                if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                                    return `m_${vnum}`;
                                }
                            }
                        }
                    }
                }
            }
        }
        return foundRoom;
    }, [viewZ, preloadedCoordsRef, spatialIndexRef, roomsRef, currentRoomIdRef]);

    const getMarkerAt = useCallback((wx: number, wy: number) => {
        const markersToSearch = markersRef.current;
        const roomsToSearch = roomsRef.current;
        const currentZ = currentRoomIdRef.current ? (roomsToSearch[currentRoomIdRef.current]?.z || 0) : 0;
        const z = cameraRef.current.zoom;
        for (const key in markersToSearch) {
            const m = markersToSearch[key];
            if ((m.z || 0) !== currentZ) continue;
            const dx = m.x * GRID_SIZE - wx;
            const dy = m.y * GRID_SIZE - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (20 / z)) return key;
        }
        return null;
    }, [cameraRef, currentRoomIdRef, markersRef, roomsRef]);

    return { screenToWorld, getRoomAt, getMarkerAt };
};
