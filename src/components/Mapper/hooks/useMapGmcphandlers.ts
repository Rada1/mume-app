import { MapperPrediction, MapperRoom } from '../mapperTypes';
import { useRoomInfoHandler } from './useRoomInfoHandler';
import { useUpdateExitsHandler } from './useUpdateExitsHandler';
import { useTerrainHandler } from './useTerrainHandler';
import { getExitTargetId } from '../mapperUtils';

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
    onRoomInfoProcessed?: (confirmedRoomId?: string | null) => void;
    onFirstVisitLoadFlag?: (roomId: string) => void;
    addMessage?: (type: string, msg: string) => void;
    showDebugEchoes?: boolean;
    preMoveRef?: React.MutableRefObject<{ dir: string; targetId: string; time: number } | null>;
    deathRoomId?: string | null;
    setDeathRoomId?: (val: string | null) => void;
    baseMapExitsRef?: React.MutableRefObject<Record<string, any>>;
    clientPredictionsRef?: React.MutableRefObject<MapperPrediction[]>;
    characterName: string | null;
    executeCommand?: (cmd: string, silent?: boolean) => void;
    activeView: string;
}

export const useMapGmcphandlers = (props: UseMapGmcphandlersProps) => {

    const pushPendingMove = (dir: string) => {
        props.pendingMovesRef.current.push({ dir, time: Date.now() });
    };

    const handleMoveConfirmed = (e?: any) => {
        const isDark = e?.detail?.isDark;
        const pending = props.pendingMovesRef.current;
        if (isDark && pending.length > 0) {
            const nextMove = pending[0];
            const currentId = props.currentRoomIdRef.current;
            if (currentId) {
                const currentRoom = props.roomsRef.current[currentId];
                let targetId: string | null = null;
                
                // 1. Try to find in memory exits
                if (currentRoom?.exits?.[nextMove.dir]) {
                    const targetVnum = currentRoom.exits[nextMove.dir].gmcpDestId;
                    if (targetVnum) {
                        targetId = `m_${targetVnum}`;
                    }
                }
                
                // 2. Fallback to ArdaMap preloaded exits
                if (!targetId && currentId.startsWith('m_')) {
                    const prevVnum = currentId.substring(2);
                    const ardaData = props.preloadedCoordsRef.current[prevVnum];
                    if (ardaData && ardaData[4]) {
                        const targetVnum = getExitTargetId(ardaData[4][nextMove.dir]);
                        if (targetVnum) {
                            targetId = `m_${targetVnum}`;
                        }
                    }
                }

                if (targetId) {
                    if (props.showDebugEchoes) {
                        props.addMessage?.('system', `[Mapper] Blind dead-reckoned move ${nextMove.dir} to ${targetId}`);
                    }
                    props.setCurrentRoomId(targetId);
                }
            }
        }

        props.pendingMovesRef.current.shift();
        if (props.onRoomInfoProcessed) props.onRoomInfoProcessed();
        else {
            if (props.preMoveRef) props.preMoveRef.current = null;
            if (props.clientPredictionsRef) props.clientPredictionsRef.current = [];
        }
        props.triggerRender?.();
    };

    const { handleRoomInfo } = useRoomInfoHandler({
        roomsRef: props.roomsRef,
        setRooms: props.setRooms,
        currentRoomIdRef: props.currentRoomIdRef,
        setCurrentRoomId: props.setCurrentRoomId,
        pendingMovesRef: props.pendingMovesRef,
        preloadedCoordsRef: props.preloadedCoordsRef,
        baseMapExitsRef: props.baseMapExitsRef,
        nameIndexRef: props.nameIndexRef,
        serverIdIndexRef: props.serverIdIndexRef,
        discoverySourceRef: props.discoverySourceRef,
        exploredRef: props.exploredRef,
        setExploredVnums: props.setExploredVnums,
        lastDetectedTerrainRef: props.lastDetectedTerrainRef,
        firstExploredAtRef: props.firstExploredAtRef,
        triggerRender: props.triggerRender,
        onRoomInfoProcessed: props.onRoomInfoProcessed,
        onFirstVisitLoadFlag: props.onFirstVisitLoadFlag,
        addMessage: props.addMessage,
        showDebugEchoes: props.showDebugEchoes,
        preMoveRef: props.preMoveRef,
        deathRoomId: props.deathRoomId,
        setDeathRoomId: props.setDeathRoomId,
        activeView: props.activeView
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

    return { handleRoomInfo, handleUpdateExits, handleTerrain, pushPendingMove, handleMoveConfirmed };
};
