import { useCallback } from 'react';
import { MapperRoom } from '../mapperTypes';
import { normalizeTerrain } from '../mapperUtils';

interface TerrainHandlerProps {
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
}

export const useTerrainHandler = ({ setRooms, currentRoomIdRef, lastDetectedTerrainRef }: TerrainHandlerProps) => {
    const handleTerrain = useCallback((t: string) => {
        const terrain = normalizeTerrain(t);
        lastDetectedTerrainRef.current = terrain;
        if (currentRoomIdRef.current) {
            const activeId = currentRoomIdRef.current;
            setRooms(prev => (prev[activeId] && prev[activeId].terrain !== terrain) ? { ...prev, [activeId]: { ...prev[activeId], terrain } } : prev);
        }
    }, [currentRoomIdRef, setRooms, lastDetectedTerrainRef]);

    return { handleTerrain };
};