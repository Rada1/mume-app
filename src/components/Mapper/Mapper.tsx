/**
 * @file Mapper.tsx
 * @description Renders the MUME Mapper.
 * Consumes the shared MapperContext to ensure synchronization across instances.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback, forwardRef } from 'react';
import { Eye, X } from 'lucide-react';
import { useGame, useLog, useVitals, useUI } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useModeStore } from '../../stores/useModeStore';
import { useCharacterPanelStore } from '../../stores/useCharacterPanelStore';
import { useMapper } from '../../context/useMapper';
import { MapCanvas } from './MapCanvas';
import { MapFilterBar } from './MapFilterBar';
import { MapperContextMenu } from './MapperContextMenu';
import { RoomInfoCard } from './RoomInfoCard';
import { useMapperInteractions } from './useMapperInteractions';
import { useMapperController } from './useMapperController';
import { useSmartWalk } from './hooks/useSmartWalk';
import { useMapperPlayerTracking } from './hooks/useMapperPlayerTracking';
import { DpadCluster } from './DpadCluster';
import { DEFAULT_MOBILE_MAP_ZOOM, GRID_SIZE } from './mapperUtils';
import { useMapperTracing } from './hooks/useMapperTracing';
import { TracingHUD } from './TracingHUD';
import { MapSwipeWheelOverlay } from './MapSwipeWheelOverlay';
import { MapDoorTapFeedback } from './MapDoorTapFeedback';
import './Mapper.css';

interface MapperProps {
    isMinimized?: boolean;
    setIsMinimized?: (min: boolean) => void;
    characterName?: string;
    isMobile?: boolean;
    isExpanded?: boolean;
    isDesignMode?: boolean;
    heldButton?: any;
    setHeldButton?: (val: any) => void;
    heldButtonRef?: React.MutableRefObject<any>;
    setCommandPreview?: (val: string | null) => void;
}

export interface MapperHandle {
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleResetAndSync: () => void;
}

export const Mapper = forwardRef<MapperHandle, MapperProps>((props, ref) => {
    const { isMinimized: isMinimizedProp, characterName, isMobile: isMobileProp, isExpanded, heldButton, heldButtonRef, setHeldButton, setCommandPreview } = props;
    const effectiveIsMinimized = isMinimizedProp ?? (isExpanded !== undefined ? !isExpanded : false);
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const setIsDraggingWithRef = useCallback((val: boolean) => {
        isDraggingRef.current = val;
        setIsDragging(val);
    }, []);
    const [isMobile] = useState(() => isMobileProp ?? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wallBumpAnimationRef = useRef<Animation | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: isMobile ? DEFAULT_MOBILE_MAP_ZOOM : 1 });
    const cardRef = useRef<HTMLDivElement>(null);
    const isPerformanceMode = useSettingsStore(state => state.isPerformanceMode || state.isClassicMode);
    const isCharacterPanelMinimized = useCharacterPanelStore(state => state.isMinimized);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number, startTime?: number }[]>([]);
    const lastRoomIdRef = useRef<string | null>(null);

    const {
        triggerHaptic, executeCommand, btn, joystick, playClickSound,
        setIsTrackpadModifierActive, roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, isFoggy, isImmersionMode,
        selectedObjectIds, inCombat, viewport, roomZone,
        roomName, roomExits, currentTerrain, weather, characterName: gameCharacterName, isRiding
    } = useGame();
    const { isLandscape } = viewport;
    const { target, groupMembers, opponentName, opponentId, deathRoomId } = useVitals();
    const { addMessage } = useLog();
    const { setPopoverState, popoverState, ui } = useUI();
    const { playerColor, npcColor, enemyColor, objectColor, targetColor, showBackgroundImage, mapBrightness } = useSettingsStore();
    // The map is always rendered in dark mode regardless of the global app theme.
    const isDarkMode = true;
    const displayPlayerColor = playerColor;
    const displayNpcColor = npcColor;
    const displayEnemyColor = enemyColor;
    const displayObjectColor = objectColor;
    const displayTargetColor = targetColor;
    const treatMapAsExplored = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const isMapLookHeld = heldButton?.id === 'map-long-press' && !heldButton.didFire;
    const [backgroundAlignMode, setBackgroundAlignMode] = useState(false);
    const [isCtrlAlignHeld, setIsCtrlAlignHeld] = useState(false);
    const [mapSwipeWheel, setMapSwipeWheel] = useState<{ x: number; y: number; originX: number; originY: number } | null>(null);

    const entitiesRef = useRef({
        roomChars,
        roomPlayers,
        roomNpcs,
        roomItems,
        groupMembers,
        inCombat,
        opponentName,
        opponentId,
        target,
        combatAnimationActive: false
    });

    useEffect(() => {
        const shakeMap = () => {
            const canvas = canvasRef.current;
            if (!canvas?.animate) return;
            wallBumpAnimationRef.current?.cancel();
            wallBumpAnimationRef.current = canvas.animate([
                { transform: 'translate3d(0, 0, 0)' },
                { transform: 'translate3d(-4px, 1px, 0)' },
                { transform: 'translate3d(4px, -1px, 0)' },
                { transform: 'translate3d(-2px, 1px, 0)' },
                { transform: 'translate3d(1px, 0, 0)' },
                { transform: 'translate3d(0, 0, 0)' }
            ], { duration: 150, easing: 'ease-out' });
        };

        window.addEventListener('mume-mapper-wall-bump', shakeMap);
        return () => {
            window.removeEventListener('mume-mapper-wall-bump', shakeMap);
            wallBumpAnimationRef.current?.cancel();
            wallBumpAnimationRef.current = null;
        };
    }, []);

    useEffect(() => {
        let combatAnimationActive = !!(opponentId || opponentName);
        if (!combatAnimationActive && roomChars) {
            for (const key in roomChars) {
                if (Object.prototype.hasOwnProperty.call(roomChars, key)) {
                    const char = roomChars[key];
                    if (char) {
                        const fighting = char.fighting == null ? '' : String(char.fighting);
                        if (fighting !== '' && fighting.toLowerCase() !== 'you' && fighting !== 'Someone') {
                            combatAnimationActive = true;
                            break;
                        }
                    }
                }
            }
        }

        entitiesRef.current = {
            roomChars,
            roomPlayers,
            roomNpcs,
            roomItems,
            groupMembers,
            inCombat,
            opponentName,
            opponentId,
            target,
            combatAnimationActive
        };
        window.dispatchEvent(new CustomEvent('mume-mapper-wake'));
    }, [roomChars, roomPlayers, roomNpcs, roomItems, groupMembers, inCombat, opponentName, opponentId, target]);

    // Use shared state from MapperContext
    const context = useMapper();
    const {
        rooms, setRooms, markers, setMarkers, currentRoomId,
        handleAddRoom, handleDeleteRoom, roomsRef,
        currentRoomIdRef, markersRef, preloadedCoordsRef, performanceMapRef, performanceMapRevision,
        unveilMap, exploredVnums, handleSyncLocation,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        renderVersion, triggerRender, activeMapFilter, setActiveMapFilter,
        mapSearchQuery, setMapSearchQuery,
        regionLabels, setExploredMarkers,
        playerPosRef, moveAnimRef, selectedSearchRoomId, setSelectedSearchRoomId,
        closestRoomId, filterPathIds, filterPathDistance, matchedRoomIds
    } = context;
    const [selectedRegionLabelId, setSelectedRegionLabelId] = useState<string | null>(null);
    const [hoveredSearchRoomId, setHoveredSearchRoomId] = useState<string | null>(null);

    const currentRoomKey = currentRoomId || '';
    const roomIdVnum = currentRoomKey.replace(/^m_/, '');
    const mapRoom = rooms[currentRoomKey] || rooms[`m_${roomIdVnum}`] || rooms[roomIdVnum];
    const currentVnum = mapRoom?.gmcpId ? String(mapRoom.gmcpId) : roomIdVnum;
    const preloadedRoom = currentVnum ? preloadedCoordsRef.current?.[currentVnum] : undefined;
    const rawZone = mapRoom?.zone || preloadedRoom?.[9] || roomZone || '';
    const displayZone = rawZone
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const {
        isTracingMode, calibration, setCalibration, vectors, activePath, hoverCoord,
        anchorRegisterState, setAnchorRegisterState, anchors, onTraceClick, onTraceHover,
        onAddPath, onAddLabel, onClearPath, onUndoPoint, onClearAnchors, onAutoCalibrate,
        onSaveAllToVectorsJson
    } = useMapperTracing(triggerRender);

    useEffect(() => {
        if (!isTracingMode) {
            setIsCtrlAlignHeld(false);
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey) setIsCtrlAlignHeld(true);
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (!event.ctrlKey) setIsCtrlAlignHeld(false);
        };
        const onBlur = () => setIsCtrlAlignHeld(false);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [isTracingMode]);

    const { handleCenterOnPlayer } = useMapperPlayerTracking(currentRoomId, rooms, autoCenter, setAutoCenter, cameraRef, canvasRef, playerPosRef, playerTrailRef, lastRoomIdRef, triggerRender, setViewZ, preloadedCoordsRef);
    const revealAll = !!(unveilMap || treatMapAsExplored);
    const { isWalking, walkTargetId, walkPath, startWalking, stopWalking } = useSmartWalk(
        currentRoomId,
        rooms,
        executeCommand,
        preloadedCoordsRef,
        addMessage,
        revealAll,
        exploredVnums,
        isPerformanceMode ? performanceMapRef.current : null,
        isRiding
    );
    const mode = ui.mapMode || 'play';

    useEffect(() => {
        triggerRender();
    }, [popoverState?.entityId, selectedObjectIds, triggerRender]);

    const controllerOptions = useMemo(() => ({
        onRecenter: handleCenterOnPlayer,
        triggerRender,
        cameraRef,
        canvasRef
    }), [handleCenterOnPlayer, triggerRender, cameraRef, canvasRef]);

    useMapperController(characterName ?? null, ref, controllerOptions);

    useEffect(() => {
        const onCenter = () => handleCenterOnPlayer();
        window.addEventListener('mume-mapper-center-on-player', onCenter);
        return () => window.removeEventListener('mume-mapper-center-on-player', onCenter);
    }, [handleCenterOnPlayer]);

    // We still keep the context menu local to the instance for better UX (each window has its own context menu)
    const [localContextMenu, setLocalContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);
    const setContextMenu = setLocalContextMenu;

    const { marquee } = useMapperInteractions({
        rooms, setRooms, markers, setMarkers,
        selectedRoomIds, setSelectedRoomIds,
        selectedMarkerId, setSelectedMarkerId,
        cameraRef, mode, currentRoomId,
        isMobile,
        isDesignMode: props.isDesignMode || false,
        isMinimized: effectiveIsMinimized,
        setAutoCenter, setContextMenu,
        setInfoRoomId,
        setMapSwipeWheel,
        triggerHaptic: triggerHaptic ?? (() => { }),
        canvasRef, cardRef, setIsDragging: setIsDraggingWithRef, handleAddRoom,
        triggerRender, viewZ, setViewZ,
        preloadedCoordsRef,
        spatialIndexRef: context.spatialIndexRef,
        startWalking, stopWalking,
        executeCommand, joystick, btn, heldButton, heldButtonRef, setHeldButton, target,
        roomExits,
        setIsTrackpadModifierActive,
        popoverState,
        setPopoverState,
        setActiveSet: btn.setActiveSet,
        playClickSound,
        characterName: characterName ?? null,
        entitiesRef,
        inlineCategories,
        playerColor: displayPlayerColor,
        npcColor: displayNpcColor,
        activeMapFilter,
        mapSearchQuery,
        matchedRoomIds,
        closestRoomId,
        setHoveredSearchResult: setHoveredSearchRoomId,
        selectMapSearchResult: setSelectedSearchRoomId,
        isTracingMode,
        backgroundAlignMode,
        calibration,
        setCalibration,
        onTraceClick,
        onTraceHover
    });

    const handleAddMarker = useCallback((wx: number, wy: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({
            ...prev,
            [id]: { id, x: wx, y: wy, z, text: 'New Marker', dotSize: 5, fontSize: 12, createdAt: Date.now() }
        }));
        setExploredMarkers(prev => new Set([...prev, id]));
    }, [setMarkers, setExploredMarkers]);

    const effectiveLighting = 'none';
    const clearMapRoute = useCallback(() => {
        setActiveMapFilter(null);
        setMapSearchQuery('');
        setSelectedSearchRoomId(null);
        setSelectedRegionLabelId(null);
        triggerRender();
    }, [setActiveMapFilter, setMapSearchQuery, setSelectedSearchRoomId, triggerRender]);

    return (
        <div className={`mapper-container lighting-state-${effectiveLighting} ${isImmersionMode && isFoggy ? 'foggy' : ''} ${effectiveIsMinimized ? 'minimized' : ''} ${isMobile ? 'mobile' : ''} ${!effectiveIsMinimized ? 'full-view' : ''} ${mapSwipeWheel ? 'map-swipe-wheel-open' : ''} ${(!showBackgroundImage || !isImmersionMode) ? 'no-bg-image' : ''}`} style={{
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            backgroundColor: 'transparent', 
            touchAction: 'none',
            zIndex: infoRoomId ? 2900 : undefined,
        } as React.CSSProperties}>
            {isImmersionMode && !isMobile && (
                <>
                    <div className="mapper-overlay mapper-sun-overlay" />
                    <div className="mapper-overlay mapper-moon-overlay" />
                    <div className="mapper-overlay mapper-artificial-overlay" />
                    <div className="mapper-overlay mapper-dark-overlay" />
                    <div className="mapper-overlay mapper-fog-overlay" />
                </>
            )}
            <MapCanvas
                ref={canvasRef}
                rooms={rooms}
                markers={markers}
                currentRoomId={currentRoomId}
                selectedRoomIds={selectedRoomIds}
                contextMenuRoomId={localContextMenu?.roomId ?? infoRoomId}
                selectedMarkerId={selectedMarkerId}
                camera={cameraRef}
                isDarkMode={isDarkMode}
                isMobile={isMobile}
                isLandscape={isLandscape}
                characterName={characterName ?? null}
                playerPosRef={playerPosRef}
                moveAnimRef={moveAnimRef}
                playerTrailRef={playerTrailRef}
                renderVersion={renderVersion}
                isDragging={isDragging}
                isDraggingRef={isDraggingRef}
                marquee={marquee}
                autoCenter={autoCenter}
                stableRoomsRef={roomsRef}
                stableRoomIdRef={currentRoomIdRef}
                stableMarkersRef={markersRef}
                preloadedCoordsRef={preloadedCoordsRef}
                performanceMapRef={performanceMapRef}
                performanceMapRevision={performanceMapRevision}
                spatialIndexRef={context.spatialIndexRef}
                lighting={effectiveLighting}
                isImmersionMode={isImmersionMode}
                exploredVnums={context.exploredRef.current}
                exploredRef={context.exploredRef}
                exploredMarkers={context.exploredMarkers}
                triggerRender={triggerRender}
                unveilMap={unveilMap}
                treatMapAsExplored={treatMapAsExplored}
                viewZ={viewZ}
                firstExploredAtRef={context.firstExploredAtRef}
                preMoveRef={context.preMoveRef}
                clientPredictionsRef={context.clientPredictionsRef}
                walkTargetId={walkTargetId}
                walkPath={walkPath}
                baseMapExitsRef={context.baseMapExitsRef}
                entitiesRef={entitiesRef}
                groupMembers={groupMembers}
                serverIdIndexRef={context.serverIdIndexRef}
                inlineCategories={inlineCategories}
                playerColor={displayPlayerColor}
                npcColor={displayNpcColor}
                enemyColor={displayEnemyColor}
                objectColor={displayObjectColor}
                targetColor={displayTargetColor}
                mapBrightness={mapBrightness}
                activeInlineEntityId={popoverState?.entityId || null}
                selectedObjectIds={selectedObjectIds}
                deathRoomId={deathRoomId}
                heldButton={heldButton}
                activeMapFilter={activeMapFilter}
                mapSearchQuery={mapSearchQuery}
                closestRoomId={closestRoomId}
                filterPathIds={filterPathIds}
                filterPathDistance={filterPathDistance}
                matchedRoomIds={matchedRoomIds}
                hoveredSearchRoomId={hoveredSearchRoomId}
                calibration={calibration}
                vectors={vectors}
                isTracingMode={isTracingMode}
                activePath={activePath}
                mapTileOpacity={isTracingMode && (backgroundAlignMode || isCtrlAlignHeld) ? 0.5 : 1}
                regionLabels={regionLabels}
                selectedRegionLabelId={selectedRegionLabelId}
                joystickActive={joystick?.joystickActive}
            />
            {!isWalking && closestRoomId && (
                (filterPathIds.length > 1 || (selectedSearchRoomId && selectedSearchRoomId.replace(/^(m_|r_)/, '') === closestRoomId.replace(/^(m_|r_)/, ''))) && (
                <div 
                    className="map-go-there-popup"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        className="map-go-there-close"
                        type="button"
                        aria-label="Clear map route"
                        title="Clear search and route"
                        onClick={clearMapRoute}
                    >
                        <X size={13} strokeWidth={2.5} />
                    </button>
                    <div className="map-go-there-info">
                        {filterPathIds.length > 1
                            ? <>Shortest Path: {filterPathDistance} {filterPathDistance === 1 ? 'room' : 'rooms'}</>
                            : 'No known route'}
                    </div>
                    <button 
                        className="map-go-there-btn"
                        onClick={() => startWalking(closestRoomId, filterPathIds.length > 1 ? filterPathIds : undefined)}
                    >
                        Go there
                    </button>
                </div>
            ))}

            {!effectiveIsMinimized && !isMobile && (
                <MapFilterBar
                    activeMapFilter={activeMapFilter}
                    mapSearchQuery={mapSearchQuery}
                    setActiveMapFilter={setActiveMapFilter}
                    setMapSearchQuery={setMapSearchQuery}
                    triggerHaptic={triggerHaptic}
                />
            )}

            {isMapLookHeld && (
                <div className="map-look-hold-indicator" aria-hidden="true">
                    <Eye size={28} strokeWidth={2.25} />
                </div>
            )}

            {!effectiveIsMinimized && isCharacterPanelMinimized && !viewport.isKeyboardOpen && <MapSwipeWheelOverlay
                isActive={Boolean(mapSwipeWheel)}
                bounds={(() => {
                    const surface = canvasRef.current?.closest('.mobile-mapper-touch-surface')
                        || canvasRef.current?.closest('.mapper-container');
                    const rect = surface?.getBoundingClientRect();
                    return rect
                        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
                })()}
            />}
            {!effectiveIsMinimized && <MapDoorTapFeedback />}

            {isTracingMode && !effectiveIsMinimized && (
                <button
                    className="btn-secondary"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setBackgroundAlignMode(prev => !prev)}
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 10000,
                        width: 'auto',
                        margin: 0,
                        background: backgroundAlignMode ? 'var(--accent)' : 'rgba(0, 0, 0, 0.62)',
                        color: backgroundAlignMode ? '#000' : 'var(--text-primary)',
                        borderColor: backgroundAlignMode ? 'var(--accent)' : 'rgba(255, 255, 255, 0.18)'
                    }}
                    title="Hold Ctrl and drag to align. Hold Ctrl and wheel to scale."
                >
                    {backgroundAlignMode ? 'Align Fade On' : 'Fade Real Map'}
                </button>
            )}

            {isMobile && !mapSwipeWheel && <DpadCluster heldButton={heldButton} setHeldButton={setHeldButton} />}

            {localContextMenu && (
                <MapperContextMenu
                    x={localContextMenu.x}
                    y={localContextMenu.y}
                    roomId={localContextMenu.roomId}
                    isMobile={isMobile}
                    onClose={() => setLocalContextMenu(null)}
                    onDelete={() => { if (localContextMenu.roomId) handleDeleteRoom(localContextMenu.roomId); setLocalContextMenu(null); triggerRender(); }}
                    onInfo={() => { setInfoRoomId(localContextMenu.roomId); setLocalContextMenu(null); }}
                    onAddMarker={() => { handleAddMarker(localContextMenu.wx, localContextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0)); setLocalContextMenu(null); triggerRender(); }}
                    onAddRoom={() => { handleAddRoom(localContextMenu.wx, localContextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0)); setLocalContextMenu(null); triggerRender(); }}
                    onSyncLocation={() => { handleSyncLocation(localContextMenu.wx, localContextMenu.wy); setLocalContextMenu(null); triggerRender(); }}
                    onWalkStart={(rid) => { startWalking(rid); }}
                    onWalkEnd={() => { stopWalking(); setLocalContextMenu(null); }}
                    mode={mode}
                    isDarkMode={isDarkMode}
                />
            )}

            {infoRoomId && (
                <RoomInfoCard
                    roomId={infoRoomId}
                    rooms={rooms}
                    setRooms={setRooms}
                    mode={mode}
                    onClose={() => setInfoRoomId(null)}
                    cardRef={cardRef}
                    preloadedCoordsRef={preloadedCoordsRef}
                    isMmapperMap={performanceMapRef.current !== null}
                    setViewZ={setViewZ}
                    isDarkMode={isDarkMode}
                    isMobile={isMobile}
                    onWalkStart={(rid) => { startWalking(rid); }}
                    stopWalking={stopWalking}
                    walkTargetId={walkTargetId}
                />
            )}



            {isTracingMode && (
                <TracingHUD
                    calibration={calibration}
                    setCalibration={setCalibration}
                    activePath={activePath}
                    vectors={vectors}
                    onAddPath={onAddPath}
                    onAddLabel={onAddLabel}
                    onClearPath={onClearPath}
                    onUndoPoint={onUndoPoint}
                    hoverCoord={hoverCoord}
                    anchorRegisterState={anchorRegisterState}
                    setAnchorRegisterState={setAnchorRegisterState}
                    anchors={anchors}
                    onAutoCalibrate={onAutoCalibrate}
                    onClearAnchors={onClearAnchors}
                    onSaveAllToVectorsJson={onSaveAllToVectorsJson}
                />
            )}
        </div>
    );
});

Mapper.displayName = 'Mapper';
