import { MapperRoom } from '../mapperTypes';
import { useRoomInfoHandler } from './useRoomInfoHandler';
import { useUpdateExitsHandler } from './useUpdateExitsHandler';
import { useTerrainHandler } from './useTerrainHandler';

interface UseMapGmcphandlersProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    pendingMovesRef: React.MutableRefObject<{ dir: string; time: number }[]>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>;
    nameIndexRef: React.MutableRefObject<Record<string, string[]>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    discoverySourceRef: React.MutableRefObject<string | null>;
    exploredRef: React.MutableRefObject<Set<string>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    addMessage?: (type: string, msg: string) => void;
    showDebugEchoes?: boolean;
}

export const useMapGmcphandlers = (props: UseMapGmcphandlersProps) => {

    const { handleRoomInfo } = useRoomInfoHandler(props);
    const { handleUpdateExits } = useUpdateExitsHandler(props);
    const { handleTerrain } = useTerrainHandler(props);

    return { handleRoomInfo, handleUpdateExits, handleTerrain };
};