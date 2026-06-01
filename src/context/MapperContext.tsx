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
import { DIRS, getExitTargetId, getGateState, checkRoomFilter, findClosestMatchingRoomPath } from '../components/Mapper/mapperUtils';
import { MapperPrediction, MapperRoom, MapperMarker, RegionLabel } from '../components/Mapper/mapperTypes';
import { useRegionLabels } from '../components/Mapper/hooks/useRegionLabels';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useModeStore } from '../stores/useModeStore';
import { useUIStore } from '../stores/useUIStore';
import { gmcpBus } from '../events/gmcpBus';
import { useAudioEffects } from '../hooks/useAudioSystem';

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
    loadImportedMapData: (data: Record<string, any>) => void;
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
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>;
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
    explored: Set<string>;
    exploredVnums: Set<string>;
    exploredMarkers: Set<string>;
    setExploredMarkers: React.Dispatch<React.SetStateAction<Set<string>>>;
    
    // Filtering & Navigation State
    activeMapFilter: string | null;
    setActiveMapFilter: React.Dispatch<React.SetStateAction<string | null>>;
    mapSearchQuery: string;
    setMapSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    closestRoomId: string | null;
    filterPathIds: string[];
    filterPathDistance: number;
    matchedRoomIds: Set<string>;

    // Region Labels (global, LOTR-style large text)
    regionLabels: Record<string, RegionLabel>;
    regionLabelsRef: React.MutableRefObject<Record<string, RegionLabel>>;
    addRegionLabel: (partial: Partial<RegionLabel> & { text: string; x: number; y: number; z: number }) => string;
    updateRegionLabel: (id: string, patch: Partial<RegionLabel>) => void;
    deleteRegionLabel: (id: string) => void;
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
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const setCurrentRoomId = useCallback((id: string | null) => {
        setCurrentRoomIdState(id);
        currentRoomIdRef.current = id;
        // Snap the player position synchronously so it stays in sync with the prediction
        // queue (which is reconciled synchronously in handleRoomInfo's clearPrediction).
        // Otherwise the rAF render loop can fire between this call and React's commit,
        // drawing the player at the previous room while the queue has already advanced —
        // visible as a 1-tile gap between the player and the nearest prediction panel.
        if (!id) {
            playerPosRef.current = null;
            return;
        }
        const room = roomsRef.current[id];
        let coords: { x: number, y: number, z: number } | null = null;
        if (room) {
            coords = { x: room.x, y: room.y, z: room.z || 0 };
        } else {
            const rawId = id.startsWith('m_') ? id.substring(2) : id;
            const pData = preloadedCoordsRef.current[rawId];
            if (pData) coords = { x: pData[0], y: pData[1], z: pData[2] || 0 };
        }
        if (!coords) return;
        if (!playerPosRef.current) playerPosRef.current = coords;
        else {
            playerPosRef.current.x = coords.x;
            playerPosRef.current.y = coords.y;
            playerPosRef.current.z = coords.z;
        }
    }, [currentRoomIdRef, roomsRef, preloadedCoordsRef]);

    // Unified UI State
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [autoCenter, setAutoCenter] = useState(true);
    const [viewZ, setViewZ] = useState<number | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);

    // Filtering & Navigation State
    const [activeMapFilter, setActiveMapFilter] = useState<string | null>(null);
    const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
    const [closestRoomId, setClosestRoomId] = useState<string | null>(null);
    const [filterPathIds, setFilterPathIds] = useState<string[]>([]);
    const [filterPathDistance, setFilterPathDistance] = useState<number>(0);
    const [matchedRoomIds, setMatchedRoomIds] = useState<Set<string>>(new Set());

    // Stable empty sentinels — avoid creating new Set()/[] on every inactive render
    const EMPTY_SET = useRef(new Set<string>()).current;
    const EMPTY_PATH = useRef<string[]>([]).current;

    // Region Labels (global, LOTR-style large text overlays)
    const {
        regionLabels, regionLabelsRef,
        addRegionLabel, updateRegionLabel, deleteRegionLabel
    } = useRegionLabels();

    // Map topology edit mode is the global Play/Edit map mode. In "play" the mapper only
    // TRACKS position against the preloaded base map and never fabricates rooms; in "edit"
    // unmatched room events may create new rooms/exits for manual mapping. (Same toggle
    // that already gates room dragging / marquee select in the canvas interactions.)
    const mapEditMode = useUIStore(s => s.mapMode) === 'edit';

    // Settings from Zustand
    const allowPersistence = useSettingsStore(s => s.allowMapPersistence);
    const setAllowPersistence = useSettingsStore(s => s.setAllowMapPersistence);
    const unveilMap = useSettingsStore(s => s.unveilMap);
    const setUnveilMap = useSettingsStore(s => s.setUnveilMap);

    const { activeView, isSpectating } = useModeStore();
    const treatMapAsExplored = isSpectating && activeView === 'target';

    const explored = useMemo(() => {
        const revealAll = treatMapAsExplored || unveilMap;
        if (revealAll) {
            return new Set(Object.keys(preloadedCoordsRef.current));
        }
        return exploredVnums;
    }, [treatMapAsExplored, unveilMap, exploredVnums]);

    // --- Debounced BFS pathfinding ---
    // When only currentRoomId changes (player moving), debounce the expensive
    // BFS so rapid room transitions don't each trigger a full 50K-iteration
    // graph search. Filter/query changes fire immediately.
    const bfsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastFilterKeyRef = useRef('');
    const filterPathIdsRef = useRef<string[]>([]);
    useEffect(() => { filterPathIdsRef.current = filterPathIds; }, [filterPathIds]);

    useEffect(() => {
        const preloaded = preloadedCoordsRef.current;
        const effectiveFilter = activeMapFilter || '';
        const effectiveQuery = (mapSearchQuery || '').trim().toLowerCase();
        const filterActive = !!(effectiveFilter || effectiveQuery);

        if (!filterActive) {
            if (bfsTimerRef.current) { clearTimeout(bfsTimerRef.current); bfsTimerRef.current = null; }
            lastFilterKeyRef.current = '';
            setMatchedRoomIds(EMPTY_SET);
            setClosestRoomId(null);
            setFilterPathIds(EMPTY_PATH);
            setFilterPathDistance(0);
            return;
        }

        // Determine if only the player position changed (same filter/query)
        const filterKey = `${effectiveFilter}|${effectiveQuery}`;
        const isFilterChange = filterKey !== lastFilterKeyRef.current;
        lastFilterKeyRef.current = filterKey;

        const runBfs = () => {
            const nextMatchedRoomIds = new Set<string>();
            // Custom/local rooms
            Object.keys(rooms).forEach(rid => {
                const rawId = rid.startsWith('m_') ? rid.substring(2) : rid;
                if (checkRoomFilter(rid, rooms[rid], preloaded[rawId], effectiveFilter, effectiveQuery)) {
                    nextMatchedRoomIds.add(rid);
                }
            });
            // Preloaded/explored rooms
            explored.forEach(vnum => {
                const rid = `m_${vnum}`;
                if (nextMatchedRoomIds.has(rid)) return;
                const pData = preloaded[vnum];
                if (!pData) return;
                if (checkRoomFilter(rid, rooms[rid], pData, effectiveFilter, effectiveQuery)) {
                    nextMatchedRoomIds.add(rid);
                }
            });

            const revealAll = !!(treatMapAsExplored || unveilMap);
            const closestPath = currentRoomId
                ? findClosestMatchingRoomPath(currentRoomId, rooms, preloaded, effectiveFilter, effectiveQuery, {
                    treatMapAsExplored: revealAll,
                    explored
                })
                : null;

            setMatchedRoomIds(nextMatchedRoomIds);
            setClosestRoomId(closestPath?.targetId || null);
            setFilterPathIds(closestPath?.pathIds || EMPTY_PATH);
            setFilterPathDistance(closestPath?.distance || 0);

            triggerRender();
        };

        // Clear any pending debounce
        if (bfsTimerRef.current) { clearTimeout(bfsTimerRef.current); bfsTimerRef.current = null; }

        const currentRawId = currentRoomId?.replace(/^m_/, '') || '';
        const currentIsOnPath = !!currentRawId && filterPathIdsRef.current.some(pathId => pathId.replace(/^m_/, '') === currentRawId);

        if (isFilterChange || currentIsOnPath) {
            // Filter/query changed — run immediately for responsive UI
            runBfs();
        } else {
            // Only currentRoomId changed (player moved) — debounce to avoid
            // running expensive BFS on every rapid room transition
            bfsTimerRef.current = setTimeout(runBfs, 150);
        }

        return () => {
            if (bfsTimerRef.current) { clearTimeout(bfsTimerRef.current); bfsTimerRef.current = null; }
        };
    // NOTE: renderVersion intentionally excluded — including it created a
    // feedback loop since this effect calls triggerRender() which increments it.
    }, [currentRoomId, activeMapFilter, mapSearchQuery, rooms, explored, treatMapAsExplored, unveilMap, triggerRender, EMPTY_SET, EMPTY_PATH]);

    // Refs
    const pendingMovesRef = useRef<{ dir: string, time: number, resolved?: boolean }[]>([]);
    const preMoveRef = useRef<{ dir: string, targetId: string, time: number } | null>(null);
    const clientPredictionsRef = useRef<MapperPrediction[]>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});
    const snoopedGroupSelfIdRef = useRef<string | null>(null);

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

            // --- Zone Name Propagation and Fallbacks ---
            // 1. Queue all rooms that have a valid, non-empty zone name
            const queue: string[] = [];
            for (const vnum in data) {
                const zone = data[vnum][9];
                if (zone && typeof zone === 'string' && zone.trim() !== '') {
                    queue.push(vnum);
                }
            }

            // 2. Propagate zone names along exit connections (BFS)
            let head = 0;
            while (head < queue.length) {
                const curr = queue[head++];
                const currZone = data[curr][9];
                const exits = data[curr][4];
                if (!exits) continue;
                for (const dir in exits) {
                    const exitObj = exits[dir];
                    const target = exitObj && exitObj.target ? String(exitObj.target) : null;
                    if (target && data[target]) {
                        const targetZone = data[target][9];
                        if (!targetZone || typeof targetZone !== 'string' || targetZone.trim() === '') {
                            data[target][9] = currZone;
                            queue.push(target);
                        }
                    }
                }
            }

            // 3. For any remaining empty zones, use 3D geographic proximity search (threshold 30 units)
            const knownRooms: { x: number; y: number; z: number; zone: string }[] = [];
            for (const vnum in data) {
                const r = data[vnum];
                if (r[9] && typeof r[9] === 'string' && r[9].trim() !== '') {
                    knownRooms.push({ x: r[0], y: r[1], z: r[2] || 0, zone: r[9] });
                }
            }

            for (const vnum in data) {
                const r = data[vnum];
                if (!r[9] || typeof r[9] !== 'string' || r[9].trim() === '') {
                    let minD = Infinity;
                    let bestZone = '';
                    const rx = r[0], ry = r[1], rz = r[2] || 0;
                    for (let i = 0; i < knownRooms.length; i++) {
                        const kr = knownRooms[i];
                        const dx = kr.x - rx;
                        const dy = kr.y - ry;
                        const dz = kr.z - rz;
                        const dist = dx * dx + dy * dy + dz * dz;
                        if (dist < minD) {
                            minD = dist;
                            bestZone = kr.zone;
                        }
                    }
                    if (minD < 900) {
                        r[9] = bestZone;
                    } else {
                        r[9] = 'Unknown Zone';
                    }
                }
            }

            preloadedCoordsRef.current = data;
            const index: Record<number, Record<string, string[]>> = {};
            const nIndex: Record<string, string[]> = {};
            const sIndex: Record<string, string> = {};
            const baseMapExits: Record<string, any> = {};

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
                baseMapExits[String(vnum)] = rData;
                
                const rServerId = rData[6];
                if (rServerId) {
                    baseMapExits[String(rServerId)] = rData;
                }
            }
            for (const vnum in data) {
                const rServerId = data[vnum][6];
                if (rServerId && String(rServerId) !== String(vnum)) {
                    sIndex[String(rServerId)] = vnum;
                }
            }
            spatialIndexRef.current = index; 
            nameIndexRef.current = nIndex; 
            serverIdIndexRef.current = sIndex;
            baseMapExitsRef.current = baseMapExits;

            try {
                const markerRes = await fetch('/mume_map_markers.json?v=' + Date.now());
                if (markerRes.ok) {
                    const bundledMarkers = await markerRes.json() as Record<string, MapperMarker>;
                    const markerIds = Object.keys(bundledMarkers);
                    if (markerIds.length > 0) {
                        setMarkers(prev => ({ ...bundledMarkers, ...prev }));
                        setExploredMarkers(prev => {
                            const next = new Set(prev);
                            markerIds.forEach(id => next.add(id));
                            return next;
                        });
                    }
                }
            } catch (markerErr) {
                console.warn("[Mapper] Could not load bundled map markers:", markerErr);
            }

            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[Mapper] Ardagmcp Base Map Loaded: ${Object.keys(data).length} rooms.`);
            }
            hasLoadedRef.current = true;
        } catch (err) { 
            console.warn("[Mapper] Could not load master map data:", err);
            hasStartedLoadingRef.current = false; // Allow retry if failed
        }
    }, [preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef, baseMapExitsRef, setMarkers, setExploredMarkers]);

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
    const { handleAddRoom, handleDeleteRoom, handleClearMap, handleSyncLocation, handleResetAndSync, loadImportedMapData } = useMapActions({
        rooms, setRooms, roomsRef, markers, setMarkers, markersRef, setExploredVnums, setExploredMarkers, setCurrentRoomId, currentRoomIdRef,
        preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef, baseMapExitsRef, addMessage, lastDetectedTerrainRef, loadMasterMap
    });

    useMapPersistence({
        characterName: characterName || null,
        rooms,
        setRooms,
        markers,
        setMarkers,
        exploredVnums,
        setExploredVnums,
        exploredMarkers,
        setExploredMarkers,
        currentRoomId,
        setCurrentRoomId,
        currentRoomIdRef,
        allowPersistence,
        unveilMap
    });

    // MMapper-style reconcile: each confirmed room arrival consumes one queued
    // direction from the head. The line itself is graph-walked from the confirmed
    // room at render time, so we only need to keep the queue length in sync with
    // how many sent moves are still in flight — no coordinate matching required.
    const clearPrediction = useCallback((_confirmedRoomId?: string | null) => {
        const queue = clientPredictionsRef.current;
        if (queue.length === 0) return;
        // pendingMovesRef is the authoritative count of moves SENT but not yet
        // confirmed: the room-info handler maintains it with full direction-matching
        // and stale-purging, and it is already updated by the time we run here. We
        // mirror its length instead of dequeuing per confirmed room id, because a
        // single physical move is often confirmed through TWO channels (GMCP room-info
        // AND XML/text dead-reckon) that report DIFFERENT room ids — an id-based dedup
        // can't catch that and double-dequeues, draining the line at 2x speed.
        // Confirmations consume the OLDEST moves first, so we keep the newest `target`
        // entries (the tail) — which is also exactly what the render walk needs, since
        // it re-anchors at the now-current room and follows the remaining dirs.
        const target = pendingMovesRef.current.length;
        if (queue.length <= target) return;
        clientPredictionsRef.current = queue.slice(queue.length - target);
        if (showDebugEchoesRef.current) {
            addMessageRef.current?.('system', `[MapperPredict] sync to pending=${target} (remaining ${clientPredictionsRef.current.length})`);
        }
        triggerRender();
    }, [triggerRender]);

    const onRoomInfoProcessed = useCallback((confirmedRoomId?: string | null) => {
        clearPrediction(confirmedRoomId);
    }, [clearPrediction]);

    const { playLoadFlagSound } = useAudioEffects();

    const [newlyExploredRoomId, setNewlyExploredRoomId] = useState<string | null>(null);
    const newlyExploredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFirstVisitLoadFlag = useCallback((roomId: string) => {
        // Synchronize sound trigger with the 100ms bouncy animation delay
        if (!unveilMap) {
            setTimeout(() => {
                playLoadFlagSound();
            }, 100);
        }
        setNewlyExploredRoomId(roomId);
        if (newlyExploredTimerRef.current) clearTimeout(newlyExploredTimerRef.current);
        newlyExploredTimerRef.current = setTimeout(() => setNewlyExploredRoomId(null), 2000);
    }, [playLoadFlagSound, unveilMap]);

    const masterHandlers = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, spatialIndexRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage,
        showDebugEchoes, nameIndexRef, serverIdIndexRef, firstExploredAtRef, triggerRender,
        onRoomInfoProcessed, onFirstVisitLoadFlag: handleFirstVisitLoadFlag, preMoveRef, deathRoomId, setDeathRoomId,
        clientPredictionsRef, baseMapExitsRef, characterName: characterName || null, executeCommand,
        activeView, mapEditMode
    });

    const pushPendingMove = useCallback((dir: string) => {
        masterHandlers.pushPendingMove(dir);
    }, [masterHandlers]);

    const handleMoveConfirmed = useCallback((e?: any) => {
        masterHandlers.handleMoveConfirmed(e);
    }, [masterHandlers]);

    const handleMoveFailure = useCallback(() => {
        pendingMovesRef.current.shift();
        // The failed move never happened — drop its queued direction from the head.
        const queue = clientPredictionsRef.current;
        clientPredictionsRef.current = queue.length > 0 ? queue.slice(1) : queue;
        if (clientPredictionsRef.current.length === 0) preMoveRef.current = null;
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
            // Resolve the immediate next room ONLY to seed the ghost-camera preMoveRef.
            // The prediction LINE stores no coords — it is graph-walked at render time.
            const wasQueueEmpty = clientPredictionsRef.current.length === 0;
            if (wasQueueEmpty) {
                const exA = room?.exits?.[dir] || wEx;
                const targetId = getExitTargetId(exA);
                if (targetId) {
                    const targetKey = String(targetId).replace(/^m_/, '');
                    const internalTargetId = serverIdIndexRef.current[targetKey] || targetKey;
                    const finalTargetId = String(internalTargetId).startsWith('m_') ? String(internalTargetId) : `m_${internalTargetId}`;
                    preMoveRef.current = { dir, targetId: finalTargetId, time: Date.now() };
                }
            }

            onPre({ detail: { dir } });
        };
        const onConfirm = (e: any) => handleMoveConfirmed(e);
        const onFail    = ()       => handleMoveFailure();
        // Append a sent move's direction to the prespammed-path queue (capped). The
        // line is rebuilt from the live map graph each frame, so we keep dirs only.
        const onPre     = (e: any) => {
            const { dir } = e.detail;
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[MapperPredict] queued ${dir} (depth ${clientPredictionsRef.current.length + 1})`);
            }
            clientPredictionsRef.current = [...clientPredictionsRef.current, { dir }].slice(-8);
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

    const applyActiveMapId = useCallback((mapid: string | number, isSnooped: boolean) => {
        const shouldApply = (isSnooped && activeView === 'target') || (!isSnooped && activeView === 'self');
        if (!shouldApply || mapid === undefined || mapid === null) return;

        const mapKey = String(mapid);
        const vnum = serverIdIndexRef.current?.[mapKey] || (preloadedCoordsRef.current[mapKey] ? mapKey : null);
        if (!vnum) return;

        const nextRoomId = `m_${vnum}`;
        if (currentRoomIdRef.current === nextRoomId) return;

        setCurrentRoomId(nextRoomId);
        triggerRender();
    }, [activeView, currentRoomIdRef, preloadedCoordsRef, serverIdIndexRef, setCurrentRoomId, triggerRender]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const onActiveMapId = (event: Event) => {
            const detail = (event as CustomEvent<{ mapid?: string | number; spectating?: boolean }>).detail;
            if (detail?.mapid === undefined || detail.mapid === null) return;
            applyActiveMapId(detail.mapid, !!detail.spectating);
        };

        window.addEventListener('mume-mapper-active-mapid', onActiveMapId);
        return () => window.removeEventListener('mume-mapper-active-mapid', onActiveMapId);
    }, [applyActiveMapId]);

    useEffect(() => {
        const getSelfMapId = (payload: any): string | number | null => {
            const members = Array.isArray(payload) ? payload : [payload];
            const self = members.find(member => {
                if (!member) return false;
                if (member.type === 'you') return true;
                return snoopedGroupSelfIdRef.current !== null &&
                    member.id !== undefined &&
                    String(member.id) === snoopedGroupSelfIdRef.current;
            });
            if (self?.id !== undefined && self?.id !== null) {
                snoopedGroupSelfIdRef.current = String(self.id);
            }
            return self?.mapid ?? self?.roomid ?? self?.room_id ?? self?.rid ?? self?.vnum ?? self?.map_id ?? self?.room ?? null;
        };

        const isSnooped = (payload: any) => !!(payload?.isSnooped || payload?.spectating);
        const handleGroupPayload = (payload: any) => {
            if (!isSnooped(payload)) return;
            const mapid = getSelfMapId(payload);
            if (mapid !== null && mapid !== undefined) applyActiveMapId(mapid, true);
        };

        const unsubs = [
            gmcpBus.on('Group.Set', handleGroupPayload),
            gmcpBus.on('Group.Add', handleGroupPayload),
            gmcpBus.on('Group.Update', handleGroupPayload)
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, [applyActiveMapId]);

    const value = useMemo(() => ({
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId, newlyExploredRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation, loadImportedMapData,
        handleRoomInfo: masterHandlers.handleRoomInfo,
        handleUpdateExits: masterHandlers.handleUpdateExits, 
        handleTerrain: masterHandlers.handleTerrain,
        handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, preMoveRef, clientPredictionsRef,
        playerPosRef,
        triggerRender, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, explored, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef,
        activeMapFilter, setActiveMapFilter, mapSearchQuery, setMapSearchQuery,
        regionLabels, regionLabelsRef, addRegionLabel, updateRegionLabel, deleteRegionLabel,
        closestRoomId, filterPathIds, filterPathDistance, matchedRoomIds
    }), [
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId, newlyExploredRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation, loadImportedMapData,
        masterHandlers, handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, explored, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef,
        activeMapFilter, setActiveMapFilter, mapSearchQuery, setMapSearchQuery,
        regionLabels, regionLabelsRef, addRegionLabel, updateRegionLabel, deleteRegionLabel,
        closestRoomId, filterPathIds, filterPathDistance, matchedRoomIds
    ]);

    // --- Proximity Reveal for Markers ---
    useEffect(() => {
        if (unveilMap) return;
        if (!currentRoomId) return;

        let px: number, py: number, pz: number;
        const r = rooms[currentRoomId];
        if (r) {
            px = r.x;
            py = r.y;
            pz = r.z || 0;
        } else {
            const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
            const pData = preloadedCoordsRef.current[rawId];
            if (pData) {
                px = pData[0];
                py = pData[1];
                pz = pData[2] || 0;
            } else {
                return;
            }
        }

        const discoveryRadius = 15; // Reveal when within 15 rooms
        const newlyDiscovered: string[] = [];

        Object.values(markers).forEach((marker: any) => {
            if (exploredMarkers.has(marker.id)) return;
            
            // Check Z level difference
            if (Math.abs((marker.z || 0) - pz) >= 1.0) return;

            // Calculate Euclidean distance
            const dx = marker.x - px;
            const dy = marker.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= discoveryRadius) {
                newlyDiscovered.push(marker.id);
            }
        });

        if (newlyDiscovered.length > 0) {
            setExploredMarkers(prev => {
                const next = new Set(prev);
                newlyDiscovered.forEach(id => next.add(id));
                return next;
            });
            triggerRender();
        }
    }, [currentRoomId, rooms, markers, exploredMarkers, setExploredMarkers, unveilMap, preloadedCoordsRef, triggerRender]);

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
