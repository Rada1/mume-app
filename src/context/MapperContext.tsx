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
import { DIRS } from '../components/Mapper/mapperUtils';
import { MapperRoom, MapperMarker } from '../components/Mapper/mapperTypes';
import { useSettingsStore } from '../stores/useSettingsStore';

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
    clientPredictionsRef: React.MutableRefObject<Array<{ toId: string, toX: number, toY: number, toZ: number }>>;
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
        currentRoomId, setCurrentRoomId, currentRoomIdRef,
        spatialIndexRef, nameIndexRef, serverIdIndexRef, preloadedCoordsRef, baseMapExitsRef
    } = useMapData();

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
    const clientPredictionsRef = useRef<Array<{ toId: string, toX: number, toY: number, toZ: number }>>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});

    // Master Map Loading
    const hasLoadedRef = useRef(false);
    const loadMasterMap = useCallback(async (force = false) => {
        if (hasLoadedRef.current && !force) return;
        try {
            // 1. Load basic room coordinates (JSON)
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
            if (showDebugEchoes) addMessage?.('system', `[Mapper] Ardagmcp Base Map Loaded: ${Object.keys(data).length} rooms.`);
            hasLoadedRef.current = true;
        } catch (err) { console.warn("[Mapper] Could not load master map data:", err); }
    }, [addMessage, showDebugEchoes, preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef]);

    useEffect(() => { loadMasterMap(); }, [loadMasterMap]);

    // Actions
    const { handleAddRoom, handleDeleteRoom, handleClearMap, handleSyncLocation, handleResetAndSync } = useMapActions({
        rooms, setRooms, roomsRef, markers, setMarkers, markersRef, setExploredVnums, setExploredMarkers, setCurrentRoomId, currentRoomIdRef,
        preloadedCoordsRef, spatialIndexRef, baseMapExitsRef, addMessage, lastDetectedTerrainRef, loadMasterMap
    });

    const onRoomInfoProcessed = useCallback(() => {
        preMoveRef.current = null;
        if (clientPredictionsRef.current.length > 0) {
            clientPredictionsRef.current = clientPredictionsRef.current.slice(1);
            triggerRender();
        }
    }, [triggerRender]);

    const masterHandlers = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage,
        showDebugEchoes, nameIndexRef, serverIdIndexRef, firstExploredAtRef, triggerRender,
        onRoomInfoProcessed, preMoveRef, deathRoomId, setDeathRoomId,
        clientPredictionsRef, baseMapExitsRef, characterName: characterName || null, executeCommand
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
        clientPredictionsRef.current = [];
        triggerRender();
    }, [triggerRender]);

    // Global Event Listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const onInfo    = (e: any) => masterHandlers.handleRoomInfo(e.detail);
        const onExits   = (e: any) => masterHandlers.handleUpdateExits(e.detail);
        const onTerrain = (e: any) => masterHandlers.handleTerrain(e.detail);
        const onPush    = (e: any) => pushPendingMove(e.detail);
        const onConfirm = (e: any) => handleMoveConfirmed(e);
        const onFail    = ()       => handleMoveFailure();
        const onPre     = (e: any) => { 
            preMoveRef.current = { dir: e.detail.dir, targetId: e.detail.targetId, time: Date.now() }; 
            triggerRender(); 
        };

        window.addEventListener('mume-gmcp-room-info', onInfo);
        window.addEventListener('mume-gmcp-room-exits', onExits);
        window.addEventListener('mume-gmcp-terrain', onTerrain);
        window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-move-confirmed', onConfirm);
        window.addEventListener('mume-mapper-move-failed', onFail);
        window.addEventListener('mume-mapper-pre-move', onPre);

        return () => {
            window.removeEventListener('mume-gmcp-room-info', onInfo);
            window.removeEventListener('mume-gmcp-room-exits', onExits);
            window.removeEventListener('mume-gmcp-terrain', onTerrain);
            window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-move-confirmed', onConfirm);
            window.removeEventListener('mume-mapper-move-failed', onFail);
            window.removeEventListener('mume-mapper-pre-move', onPre);
        };
    }, [masterHandlers, pushPendingMove, handleMoveConfirmed, handleMoveFailure, triggerRender]);

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

    return <MapperContext.Provider value={value}>{children}</MapperContext.Provider>;
};

export const useMapper = () => {
    const context = useContext(MapperContext);
    if (context === undefined) {
        throw new Error('useMapper must be used within a MapperProvider');
    }
    return context;
};
