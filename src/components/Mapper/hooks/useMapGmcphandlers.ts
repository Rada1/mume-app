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
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    nameIndexRef: React.MutableRefObject<Record<string, string[]>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    discoverySourceRef: React.MutableRefObject<string | null>;
    exploredRef: React.MutableRefObject<Set<string>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    triggerRender?: () => void;
    onRoomInfoProcessed?: () => void;
    addMessage?: (type: string, msg: string) => void;
    showDebugEchoes?: boolean;
}

export const useMapGmcphandlers = (props: UseMapGmcphandlersProps) => {

    const { handleRoomInfo } = useRoomInfoHandler({
        roomsRef: props.roomsRef,
        setRooms: props.setRooms,
        currentRoomIdRef: props.currentRoomIdRef,
        setCurrentRoomId: props.setCurrentRoomId,
        pendingMovesRef: props.pendingMovesRef,
        preloadedCoordsRef: props.preloadedCoordsRef,
        nameIndexRef: props.nameIndexRef,
        serverIdIndexRef: props.serverIdIndexRef,
        discoverySourceRef: props.discoverySourceRef,
        exploredRef: props.exploredRef,
        setExploredVnums: props.setExploredVnums,
        lastDetectedTerrainRef: props.lastDetectedTerrainRef,
        firstExploredAtRef: props.firstExploredAtRef,
        triggerRender: props.triggerRender,
        onRoomInfoProcessed: props.onRoomInfoProcessed,
        addMessage: props.addMessage,
        showDebugEchoes: props.showDebugEchoes
    });

    const { handleUpdateExits } = useUpdateExitsHandler({
        setRooms: props.setRooms,
        currentRoomIdRef: props.currentRoomIdRef,
        preloadedCoordsRef: props.preloadedCoordsRef
    });

    const { handleTerrain } = useTerrainHandler({
        setRooms: props.setRooms,
        currentRoomIdRef: props.currentRoomIdRef,
        lastDetectedTerrainRef: props.lastDetectedTerrainRef
    });

    return { handleRoomInfo, handleUpdateExits, handleTerrain };
};