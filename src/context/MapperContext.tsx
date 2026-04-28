/**
 * @file MapperContext.tsx
 * @description Centralized state and logic for the MUME Mapper.
 * Ensures synchronization across all Mapper instances (HUD, Drawer).
 */

import React, { createContext, useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { useGame, useLog, useUI, useVitals } from './GameContext';
import { useMapData } from '../components/Mapper/hooks/useMapData';
import { useMapPersistence } from '../components/Mapper/hooks/useMapPersistence';
import { useMapActions } from '../components/Mapper/hooks/useMapActions';
import { useMapGmcphandlers } from '../components/Mapper/hooks/useMapGmcphandlers';
import { DIRS, getExitTargetId, getGateState } from '../components/Mapper/mapperUtils';
import { MapperPrediction, MapperRoom, MapperMarker } from '../components/Mapper/mapperTypes';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useModeStore } from '../stores/useModeStore';

interface MapperContextType {
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    markers: Record<string, MapperMarker>;
    setMarkers: React.Dispatch<React.SetStateAction<Record<string, MapperMarker>>>;
    currentRoomId: string | null;
    setCurrentRoomId: (id: string | null) => void;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    baseMapExitsRef: React.MutableRefObject<Record<string, any>>;
    unveilMap: boolean;
    setUnveilMap: React.Dispatch<React.SetStateAction<boolean>>;
    allowPersistence: boolean;
    setAllowPersistence: React.Dispatch<React.SetStateAction<boolean>>;
    handleResetAndSync: () => void;
    handleClearMap: (force?: boolean) => void;
    handleSyncLocation: (wx: number, wy: number) => void;
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleAddRoom: (wx: number, wy: number, z: number) => string;
    handleDeleteRoom: (id: string) => void;
    pushPendingMove: (dir: string) => void;
    handleMoveConfirmed: (e?: any) => void;
    handleMoveFailure: () => void;
    preMoveRef: React.MutableRefObject<{ dir: string, targetId: string, time: number } | null>;
    clientPredictionsRef: React.MutableRefObject<MapperPrediction[]>;
    spatialIndexRef: React.MutableRefObject<any>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    triggerRender: () => void;
    renderVersion: number;
    
    // UI State (Unified)
    selectedRoomIds: Set<string>;
    setSelectedRoomIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedMarkerId: string | null;
    setSelectedMarkerId: React.Dispatch<React.SetStateAction<string | null>>;
    autoCenter: boolean;
    setAutoCenter: React.Dispatch<React.SetStateAction<boolean>>;
    viewZ: number | null;
    setViewZ: React.Dispatch<React.SetStateAction<number | null>>;
    infoRoomId: string | null;
    setInfoRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    markersRef: React.MutableRefObject<Record<string, MapperMarker>>;
    exploredRef: React.MutableRefObject<Set<string>>;
    exploredVnums: Set<string>;
    exploredMarkers: Set<string>;
    setExploredMarkers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const MapperContext = createContext<MapperContextType | undefined>(undefined);

export const MapperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { characterName, executeCommand, showDebugEchoes, isSpectateMode } = useGame();
    const { addMessage } = useLog();
    const { deathRoomId, setDeathRoomId } = useVitals();

    // Stability: capture unstable context values in refs to prevent infinite re-renders 
    // of hooks that depend on them (like loadMasterMap).
    const addMessageRef = useRef(addMessage);
    const showDebugEchoesRef = useRef(showDebugEchoes);
    useEffect(() => { addMessageRef.current = addMessage; }, [addMessage]);
    useEffect(() => { showDebugEchoesRef.current = showDebugEchoes; }, [showDebugEchoes]);

    const isSpectateModeRef = useRef(isSpectateMode);
    useEffect(() => { isSpectateModeRef.current = isSpectateMode; }, [isSpectateMode]);

    const [renderVersion, setRenderVersion] = useState(0);
    const triggerRender = useCallback(() => {
        setRenderVersion(v => v + 1);
    }, []);

    // Core data state from useMapData
    const {
        rooms, setRooms, roomsRef,
        markers, setMarkers, markersRef,
        exploredVnums, setExploredVnums, exploredRef,
        exploredMarkers, setExploredMarkers,
        currentRoomId: dataCurrentRoomId, 
        setCurrentRoomId: dataSetCurrentRoomId, 
        currentRoomIdRef,
        spatialIndexRef, nameIndexRef, serverIdIndexRef, preloadedCoordsRef, baseMapExitsRef
    } = useMapData();

    // High-performance state/ref sync for character position
    const [currentRoomId, setCurrentRoomIdState] = useState<string | null>(null);
    const setCurrentRoomId = useCallback((id: string | null) => {
        setCurrentRoomIdState(id);
        currentRoomIdRef.current = id;
    }, [currentRoomIdRef]);

    // Unified UI State
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [autoCenter, setAutoCenter] = useState(true);
    const [viewZ, setViewZ] = useState<number | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);

    // Settings from Zustand
    const allowPersistence = useSettingsStore(s => s.allowMapPersistence);
    const setAllowPersistence = useSettingsStore(s => s.setAllowMapPersistence);
    const unveilMap = useSettingsStore(s => s.unveilMap);
    const setUnveilMap = useSettingsStore(s => s.setUnveilMap);

    // Refs
    const pendingMovesRef = useRef<{ dir: string, time: number, resolved?: boolean }[]>([]);
    const preMoveRef = useRef<{ dir: string, targetId: string, time: number } | null>(null);
    const clientPredictionsRef = useRef<MapperPrediction[]>([]);
    const predictionSeqRef = useRef(0);
    const predictionClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});

    // Master Map Loading
    const hasLoadedRef = useRef(false);
    const hasStartedLoadingRef = useRef(false);
    const loadMasterMap = useCallback(async (force = false) => {
        if ((hasLoadedRef.current || hasStartedLoadingRef.current) && !force) return;
        hasStartedLoadingRef.current = true;

        try {
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', 'Loading Master Map Data...');
            }

            // 1. Load basic room coordinates (JSON)
            // Use underscores exactly as they appear in the public/ directory.
            const res = await fetch('/mume_map_data.json?v=' + Date.now());
            if (!res.ok) throw new Error('No preloaded map data');
            const data = await res.json();
            preloadedCoordsRef.current = data;
            const index: Record<number, Record<string, string[]>> = {};
            const nIndex: Record<string, string[]> = {};
            const sIndex: Record<string, string> = {};
            for (const vnum in data) {
                const rData = data[vnum], [x, y, z] = rData;
                const rName = rData[5];
                const floor = Math.round(z);
                if (!index[floor]) index[floor] = {};
                const bucketX = Math.floor(x / 5), bucketY = Math.floor(y / 5), key = `${bucketX},${bucketY}`;
                if (!index[floor][key]) index[floor][key] = [];
                index[floor][key].push(vnum);
                
                if (rName && typeof rName === 'string') { 
                    if (!nIndex[rName]) nIndex[rName] = []; 
                    nIndex[rName].push(vnum); 
                }
                sIndex[String(vnum)] = vnum;
            }
            for (const vnum in data) {
                const rServerId = data[vnum][6];
                if (rServerId && String(rServerId) !== String(vnum)) {
                    sIndex[String(rServerId)] = vnum;
                }
            }
            spatialIndexRef.current = index; nameIndexRef.current = nIndex; serverIdIndexRef.current = sIndex;
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[Mapper] Ardagmcp Base Map Loaded: ${Object.keys(data).length} rooms.`);
            }
            hasLoadedRef.current = true;
        } catch (err) { 
            console.warn("[Mapper] Could not load master map data:", err);
            hasStartedLoadingRef.current = false; // Allow retry if failed
        }
    }, [preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef]);

    useEffect(() => { loadMasterMap(); }, [loadMasterMap]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const debugWindow = window as Window & {
            __mumeMapperDebug?: () => Record<string, unknown>;
        };

        debugWindow.__mumeMapperDebug = () => {
            const currentId = currentRoomIdRef.current;
            const rawId = currentId?.replace(/^m_/, '') || null;
            return {
                currentId,
                rawId,
                room: currentId ? roomsRef.current[currentId] || roomsRef.current[`m_${currentId}`] || null : null,
                preloadedRoom: rawId ? preloadedCoordsRef.current[rawId] || null : null,
                preMove: preMoveRef.current,
                predictions: clientPredictionsRef.current,
                pendingMoves: pendingMovesRef.current,
                serverMatch: rawId ? serverIdIndexRef.current[rawId] || null : null,
                mapLoaded: hasLoadedRef.current,
                preloadedCount: Object.keys(preloadedCoordsRef.current).length
            };
        };

        return () => {
            delete debugWindow.__mumeMapperDebug;
        };
    }, [clientPredictionsRef, currentRoomIdRef, preloadedCoordsRef, roomsRef, serverIdIndexRef]);

    // Actions
    const { handleAddRoom, handleDeleteRoom, handleClearMap, handleSyncLocation, handleResetAndSync } = useMapActions({
        rooms, setRooms, roomsRef, markers, setMarkers, markersRef, setExploredVnums, setExploredMarkers, setCurrentRoomId, currentRoomIdRef,
        preloadedCoordsRef, spatialIndexRef, baseMapExitsRef, addMessage, lastDetectedTerrainRef, loadMasterMap
    });

    const clearPrediction = useCallback((seq?: number) => {
        if (seq !== undefined && clientPredictionsRef.current[0]?.seq !== seq) return;
        preMoveRef.current = null;
        if (clientPredictionsRef.current.length > 0) {
            clientPredictionsRef.current = clientPredictionsRef.current.slice(1);
            triggerRender();
        }
    }, [triggerRender]);

    const onRoomInfoProcessed = useCallback(() => {
        const prediction = clientPredictionsRef.current[0];
        if (!prediction) {
            preMoveRef.current = null;
            return;
        }

        const remainingMs = Math.max(0, 450 - (Date.now() - prediction.createdAt));
        if (predictionClearTimerRef.current) clearTimeout(predictionClearTimerRef.current);

        if (remainingMs > 0) {
            const seq = prediction.seq;
            predictionClearTimerRef.current = setTimeout(() => {
                predictionClearTimerRef.current = null;
                clearPrediction(seq);
            }, remainingMs);
            return;
        }

        clearPrediction(prediction.seq);
    }, [clearPrediction]);

    const { activeView } = useModeStore();

    const masterHandlers = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage,
        showDebugEchoes, nameIndexRef, serverIdIndexRef, firstExploredAtRef, triggerRender,
        onRoomInfoProcessed, preMoveRef, deathRoomId, setDeathRoomId,
        clientPredictionsRef, baseMapExitsRef, characterName: characterName || null, executeCommand,
        activeView
    });

    const pushPendingMove = useCallback((dir: string) => {
        masterHandlers.pushPendingMove(dir);
    }, [masterHandlers]);

    const handleMoveConfirmed = useCallback((e?: any) => {
        masterHandlers.handleMoveConfirmed(e);
    }, [masterHandlers]);

    const handleMoveFailure = useCallback(() => {
        pendingMovesRef.current.shift();
        preMoveRef.current = null;
        if (predictionClearTimerRef.current) {
            clearTimeout(predictionClearTimerRef.current);
            predictionClearTimerRef.current = null;
        }
        clientPredictionsRef.current = [];
        triggerRender();
    }, [triggerRender]);

    // Global Event Listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const onInfo    = (e: any) => masterHandlers.handleRoomInfo(e.detail);
        const onExits   = (e: any) => masterHandlers.handleUpdateExits(e.detail);
        const onTerrain = (e: any) => masterHandlers.handleTerrain(e.detail);
        const onPush    = (e: any) => {
            const dir = e.detail;
            pushPendingMove(dir);

            const currentRoomId = currentRoomIdRef.current;
            const rooms = roomsRef.current;
            const preloaded = preloadedCoordsRef.current;
            if (!currentRoomId || !rooms || !preloaded) return;

            const room = rooms[currentRoomId] || rooms[`m_${currentRoomId}`];
            const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
            const wEx = preloaded[rawId]?.[4]?.[dir];
            const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, dir, rooms, preloaded);
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[MapperPredict] push ${dir}: room=${currentRoomId} exit=${hasExit ? 'yes' : 'no'} door=${hasDoor ? (isClosed ? 'closed' : 'open') : 'no'}`);
            }
            if (!hasExit || (hasDoor && isClosed)) return;

            const exA = room?.exits?.[dir] || wEx;
            const targetId = getExitTargetId(exA);
            if (!targetId) return;

            const targetKey = String(targetId).replace(/^m_/, '');
            const internalTargetId = serverIdIndexRef.current[targetKey] || targetKey;
            const finalTargetId = String(internalTargetId).startsWith('m_') ? String(internalTargetId) : `m_${internalTargetId}`;
            onPre({ detail: { dir, targetId: finalTargetId } });
        };
        const onConfirm = (e: any) => handleMoveConfirmed(e);
        const onFail    = ()       => handleMoveFailure();
        const onPre     = (e: any) => {
            const { dir, targetId } = e.detail;
            const createdAt = Date.now();
            const seq = predictionSeqRef.current + 1;
            predictionSeqRef.current = seq;
            if (predictionClearTimerRef.current) {
                clearTimeout(predictionClearTimerRef.current);
                predictionClearTimerRef.current = null;
            }
            preMoveRef.current = { dir, targetId, time: createdAt };
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[MapperPredict] received ${dir} -> ${targetId}`);
            }

            // Populate clientPredictionsRef with target room coords for the dotted-line preview
            const targetRoom = roomsRef.current[targetId];
            if (targetRoom) {
                clientPredictionsRef.current = [{ toId: targetId, toX: targetRoom.x, toY: targetRoom.y, toZ: targetRoom.z, createdAt, seq }];
                if (showDebugEchoesRef.current) {
                    addMessageRef.current?.('system', `[MapperPredict] stored live coords ${targetRoom.x},${targetRoom.y},${targetRoom.z || 0}`);
                }
            } else {
                const rawVnum = targetId.startsWith('m_') ? targetId.substring(2) : targetId;
                const coords = preloadedCoordsRef.current[rawVnum];
                if (coords) {
                    clientPredictionsRef.current = [{ toId: targetId, toX: coords[0], toY: coords[1], toZ: coords[2], createdAt, seq }];
                    if (showDebugEchoesRef.current) {
                        addMessageRef.current?.('system', `[MapperPredict] stored map coords ${coords[0]},${coords[1]},${coords[2] || 0}`);
                    }
                } else if (showDebugEchoesRef.current) {
                    addMessageRef.current?.('system', `[MapperPredict] no coords for ${targetId}`);
                }
            }

            triggerRender();
        };

        window.addEventListener('mume-gmcp-room-info', onInfo);
        window.addEventListener('mume-gmcp-room-exits', onExits);
        window.addEventListener('mume-gmcp-terrain', onTerrain);
        window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-move-confirmed', onConfirm);
        window.addEventListener('mume-mapper-move-failed', onFail);
        window.addEventListener('mume-mapper-push-pre-move', onPre);

        return () => {
            window.removeEventListener('mume-gmcp-room-info', onInfo);
            window.removeEventListener('mume-gmcp-room-exits', onExits);
            window.removeEventListener('mume-gmcp-terrain', onTerrain);
            window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-move-confirmed', onConfirm);
            window.removeEventListener('mume-mapper-move-failed', onFail);
            window.removeEventListener('mume-mapper-push-pre-move', onPre);
        };
    }, [masterHandlers, pushPendingMove, handleMoveConfirmed, handleMoveFailure, triggerRender]);

    useEffect(() => () => {
        if (predictionClearTimerRef.current) clearTimeout(predictionClearTimerRef.current);
    }, []);

    const value = useMemo(() => ({
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation,
        handleRoomInfo: masterHandlers.handleRoomInfo, 
        handleUpdateExits: masterHandlers.handleUpdateExits, 
        handleTerrain: masterHandlers.handleTerrain,
        handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, preMoveRef, clientPredictionsRef,
        triggerRender, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef
    }), [
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation,
        masterHandlers, handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef
    ]);

    // --- Sync with Active Session ---
    // When the active view switches (Me -> Target), the mapper needs to snap to the
    // room currently being seen by the active session.
    const { roomNum, spectateRoomNum } = useGame();

    useEffect(() => {
        const activeRoomNum = activeView === 'target' ? spectateRoomNum : roomNum;
        if (activeRoomNum && activeRoomNum !== 0) {
            const vnum = serverIdIndexRef.current?.[String(activeRoomNum)];
            if (vnum) {
                setCurrentRoomId(`m_${vnum}`); // This now updates both state and ref
            }
        }
    }, [roomNum, spectateRoomNum, activeView, setCurrentRoomId]);
    return <MapperContext.Provider value={value}>{children}</MapperContext.Provider>;
};

export const useMapper = () => {
    const context = useContext(MapperContext);
    if (context === undefined) {
        throw new Error('useMapper must be used within a MapperProvider');
    }
    return context;
};
