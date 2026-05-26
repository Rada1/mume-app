import { useRef } from 'react';
import { MapperPrediction, MapperRoom } from '../mapperTypes';
import { useRoomInfoHandler } from './useRoomInfoHandler';
import { useUpdateExitsHandler } from './useUpdateExitsHandler';
import { useTerrainHandler } from './useTerrainHandler';
import { DIRS, getExitTargetId } from '../mapperUtils';

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
    const lastXmlMovementRef = useRef<{ dir: string | null; time: number } | null>(null);

    const pushPendingMove = (dir: string) => {
        props.pendingMovesRef.current.push({ dir, time: Date.now() });
    };

    const handleMoveConfirmed = (e?: any) => {
        const isDark = e?.detail?.isDark;
        const xmlDir = typeof e?.detail?.dir === 'string' ? e.detail.dir : null;
        const isXmlMovement = e?.detail?.source === 'xml';
        const pending = props.pendingMovesRef.current;
        const now = Date.now();

        if (!isXmlMovement && !xmlDir && lastXmlMovementRef.current && now - lastXmlMovementRef.current.time < 350) {
            return;
        }
        if (isXmlMovement) {
            lastXmlMovementRef.current = { dir: xmlDir, time: now };
        }

        const pendingIndex = xmlDir ? pending.findIndex(move => move.dir === xmlDir) : 0;
        const nextMove = pending[pendingIndex >= 0 ? pendingIndex : 0];
        const confirmedDir = xmlDir || nextMove?.dir || null;

        let resolvedTargetId: string | null = null;

        if ((isDark || isXmlMovement) && confirmedDir) {
            const currentId = props.currentRoomIdRef.current;
            if (currentId) {
                const currentRoom = props.roomsRef.current[currentId];
                let targetId: string | null = null;

                // 1. Try to find in memory exits
                const liveExit = currentRoom?.exits?.[confirmedDir];
                const liveTarget = getExitTargetId(liveExit);
                if (liveTarget) {
                    targetId = liveTarget.startsWith('m_') ? liveTarget : `m_${liveTarget}`;
                }

                // 2. Fallback to ArdaMap preloaded exits
                if (!targetId && currentId.startsWith('m_')) {
                    const prevVnum = currentId.substring(2);
                    const ardaData = props.preloadedCoordsRef.current[prevVnum];
                    if (ardaData && ardaData[4]) {
                        const targetVnum = getExitTargetId(ardaData[4][confirmedDir]);
                        if (targetVnum) {
                            targetId = `m_${targetVnum}`;
                        }
                    }
                }

                // 3. Last resort: snap to an already-known room at the predicted coordinates.
                if (!targetId && currentRoom && DIRS[confirmedDir]) {
                    const d = DIRS[confirmedDir];
                    const nx = Math.round(currentRoom.x + (d.dx || 0));
                    const ny = Math.round(currentRoom.y + (d.dy || 0));
                    const nz = Math.round((currentRoom.z || 0) + (d.dz || 0));

                    const localMatch = Object.values(props.roomsRef.current).find(room =>
                        Math.round(room.x) === nx &&
                        Math.round(room.y) === ny &&
                        Math.abs(Math.round(room.z || 0) - nz) < 0.5 &&
                        room.zone === currentRoom.zone
                    );
                    if (localMatch) {
                        targetId = localMatch.id;
                    } else {
                        const preloadedMatchVnum = Object.keys(props.preloadedCoordsRef.current).find(vnum => {
                            const p = props.preloadedCoordsRef.current[vnum];
                            return Math.round(p[0]) === nx &&
                                Math.round(p[1]) === ny &&
                                Math.abs(Math.round(p[2] || 0) - nz) < 0.5 &&
                                (!currentRoom.zone || p[9] === currentRoom.zone);
                        });
                        if (preloadedMatchVnum) targetId = `m_${preloadedMatchVnum}`;
                    }
                }

                if (targetId) {
                    if (props.showDebugEchoes) {
                        const source = isXmlMovement ? 'XML' : 'dark text';
                        props.addMessage?.('system', `[Mapper] ${source} dead-reckoned move ${confirmedDir} to ${targetId}`);
                    }
                    props.setCurrentRoomId(targetId);
                    resolvedTargetId = targetId;
                }
            }
        }

        if (pendingIndex > 0) props.pendingMovesRef.current.splice(0, pendingIndex + 1);
        else if (pending.length > 0) props.pendingMovesRef.current.shift();

        // Pass the dead-reckoned targetId (if any) — NOT currentRoomIdRef.current, which is
        // stale here because setCurrentRoomId above is async and the ref hasn't synced yet.
        // For non-dead-reckoned events (plain text room-name match), pass null so the reconciler
        // leaves the queue alone; the authoritative GMCP handleRoomInfo will reconcile properly.
        if (props.onRoomInfoProcessed) props.onRoomInfoProcessed(resolvedTargetId);
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
