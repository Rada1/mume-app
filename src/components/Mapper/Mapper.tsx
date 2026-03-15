/**
 * @file Mapper.tsx
 * @description Renders the MUME Mapper.
 * Consumes the shared MapperContext to ensure synchronization across instances.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useGame, useLog, useVitals, useUI } from '../../context/GameContext';
import { useMapper } from '../../context/MapperContext';
import { MapCanvas } from './MapCanvas';
import { MapperToolbar } from './MapperToolbar';
import { MapperDropdown } from './MapperDropdown';
import { MapperContextMenu } from './MapperContextMenu';
import { RoomInfoCard } from './RoomInfoCard';
import { useMapperInteractions } from './useMapperInteractions';
import { useMapAnimation } from './useMapAnimation';
import { useMapperController } from './useMapperController';
import { useSmartWalk } from './hooks/useSmartWalk';
import { useMapperExportImport } from './hooks/useMapperExportImport';
import { useMapperPlayerTracking } from './hooks/useMapperPlayerTracking';
import { DpadCluster } from './DpadCluster';
import '../Mapper.css';

interface MapperProps {
    isMinimized?: boolean;
    setIsMinimized?: (min: boolean) => void;
    characterName?: string;
    isMobile?: boolean;
    isExpanded?: boolean;
    isDesignMode?: boolean;
    isMmapperMode?: boolean;
    heldButton?: any;
    setHeldButton?: (val: any) => void;
    setCommandPreview?: (val: string | null) => void;
    onUndock?: () => void;
}

export interface MapperHandle {
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleResetAndSync: () => void;
}

export const Mapper = forwardRef<MapperHandle, MapperProps>((props, ref) => {
    const { isMinimized: isMinimizedProp, setIsMinimized, characterName, isMobile: isMobileProp, isExpanded, heldButton, setHeldButton, setCommandPreview, onUndock: onUndockProp } = props;
    const effectiveIsMinimized = isMinimizedProp ?? (isExpanded !== undefined ? !isExpanded : false);
    const [mode, setMode] = useState<'play' | 'edit'>('play');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile] = useState(() => isMobileProp ?? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const cardRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);
    const lastRoomIdRef = useRef<string | null>(null);

    const { triggerHaptic, executeCommand, theme, showLegacyButtons, btn, joystick } = useGame();
    const { target } = useVitals();
    const { addMessage } = useLog();
    const { setUI } = useUI();
    const isDarkMode = theme === 'dark';

    // Use shared state from MapperContext
    const context = useMapper();
    const {
        rooms, setRooms, markers, setMarkers, currentRoomId,
        allowPersistence, setAllowPersistence,
        handleAddRoom, handleDeleteRoom, roomsRef,
        currentRoomIdRef, markersRef, preloadedCoordsRef,
        unveilMap, setUnveilMap, handleResetAndSync, handleSyncLocation, handleClearMap,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        renderVersion, triggerRender, isMapFloating, setIsMapFloating
    } = context;

    const { handleCenterOnPlayer } = useMapperPlayerTracking(currentRoomId, rooms, autoCenter, setAutoCenter, cameraRef, canvasRef, playerPosRef, playerTrailRef, lastRoomIdRef, triggerRender, setViewZ, preloadedCoordsRef);
    const { isWalking, walkTargetId, walkPath, startWalking, stopWalking } = useSmartWalk(currentRoomId, rooms, executeCommand, preloadedCoordsRef, addMessage);
    const { handleExportMap, handleImportMap, handleImportMMapper } = useMapperExportImport(rooms, setRooms, markers, setMarkers, characterName, addMessage, context);

    const controllerOptions = useMemo(() => ({
        onRecenter: handleCenterOnPlayer,
        triggerRender
    }), [handleCenterOnPlayer, triggerRender]);

    useMapperController(characterName ?? null, ref, controllerOptions);

    useEffect(() => {
        const onCenter = () => handleCenterOnPlayer();
        window.addEventListener('mume-mapper-center-on-player', onCenter);
        return () => window.removeEventListener('mume-mapper-center-on-player', onCenter);
    }, [handleCenterOnPlayer]);

    const { marquee } = useMapperInteractions({
        rooms, setRooms, markers, setMarkers,
        selectedRoomIds, setSelectedRoomIds,
        selectedMarkerId, setSelectedMarkerId,
        cameraRef, mode, currentRoomId,
        isDesignMode: props.isDesignMode || false,
        isMinimized: effectiveIsMinimized,
        setAutoCenter, setContextMenu: (menu: any) => { /* mapper doesn't need its own state for context menu if we want to share across instances we could... but let's keep context menu instance-specific for now */ },
        setInfoRoomId,
        triggerHaptic: triggerHaptic ?? (() => { }),
        canvasRef, cardRef, setIsDragging, handleAddRoom,
        triggerRender, viewZ, setViewZ,
        preloadedCoordsRef,
        spatialIndexRef: context.spatialIndexRef,
        startWalking, stopWalking,
        executeCommand, joystick, btn, heldButton, setHeldButton, target
    });

    // We still keep the context menu local to the instance for better UX (each window has its own context menu)
    const [localContextMenu, setLocalContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);

    // Re-bind setContextMenu to local for interactions
    const setContextMenu = setLocalContextMenu;

    const handleAddMarker = useCallback((wx: number, wy: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({
            ...prev,
            [id]: { id, x: wx, y: wy, z, text: 'New Marker', dotSize: 5, fontSize: 12, createdAt: Date.now() }
        }));
    }, [setMarkers]);

    const handleDockUndock = useCallback(() => {
        triggerHaptic(40);
        if (isMapFloating) {
            setIsMapFloating(false);
            setUI(prev => ({ ...prev, mapExpanded: true }));
        } else {
            setIsMapFloating(true);
            setUI(prev => ({ ...prev, mapExpanded: false }));
        }
    }, [isMapFloating, setIsMapFloating, setUI, triggerHaptic]);

    return (
        <div className={`mapper-container ${effectiveIsMinimized ? 'minimized' : ''} ${isMobile ? 'mobile' : ''} ${!effectiveIsMinimized ? 'full-view' : ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: isDarkMode ? '#11111b' : '#bababa', touchAction: 'none' }}>
            <MapCanvas
                ref={canvasRef}
                rooms={rooms}
                markers={markers}
                currentRoomId={currentRoomId}
                selectedRoomIds={selectedRoomIds}
                selectedMarkerId={selectedMarkerId}
                camera={cameraRef}
                isDarkMode={isDarkMode}
                isMobile={isMobile}
                imagesRef={imagesRef}
                characterName={characterName ?? null}
                playerPosRef={playerPosRef}
                playerTrailRef={playerTrailRef}
                renderVersion={renderVersion}
                isDragging={isDragging}
                marquee={marquee}
                autoCenter={autoCenter}
                stableRoomsRef={roomsRef}
                stableRoomIdRef={currentRoomIdRef}
                stableMarkersRef={markersRef}
                preloadedCoordsRef={preloadedCoordsRef}
                spatialIndexRef={context.spatialIndexRef}
                exploredVnums={context.exploredRef.current}
                exploredRef={context.exploredRef}
                triggerRender={triggerRender}
                unveilMap={unveilMap}
                viewZ={viewZ}
                firstExploredAtRef={context.firstExploredAtRef}
                preMoveRef={context.preMoveRef}
                walkTargetId={walkTargetId}
                walkPath={walkPath}
            />
            <div className="vignette-container" />
            
            {isMobile && currentRoomId && (rooms[currentRoomId] || rooms[`m_${currentRoomId}`] || preloadedCoordsRef.current[String(currentRoomId).replace(/^m_/, '')]) && (
                <DpadCluster heldButton={heldButton} setHeldButton={setHeldButton} />
            )}

            <MapperToolbar
                mode={mode}
                setMode={setMode}
                autoCenter={autoCenter}
                setAutoCenter={setAutoCenter}
                setIsMinimized={setIsMinimized ?? (() => { })}
                isMobile={isMobile}
                isExpanded={!effectiveIsMinimized}
                onCenterClick={handleCenterOnPlayer}
                setIsDropdownOpen={setIsDropdownOpen}
                unveilMap={unveilMap}
                setUnveilMap={setUnveilMap}
                onResetSync={handleResetAndSync}
                onUndock={handleDockUndock}
                isDarkMode={isDarkMode}
                isMapFloating={isMapFloating}
                setIsMapFloating={setIsMapFloating}
            />

            <MapperDropdown
                isOpen={isDropdownOpen}
                setIsOpen={setIsDropdownOpen}
                allowPersistence={allowPersistence}
                setAllowPersistence={setAllowPersistence}
                isDarkMode={isDarkMode}
                setIsDarkMode={(dark) => theme === 'dark' ? null : null} // Theme managed by GameContext
                exportMap={handleExportMap}
                importMap={handleImportMap}
                importMMapper={handleImportMMapper}
                clearMap={() => { handleClearMap(); setIsDropdownOpen(false); }}
                unveilMap={unveilMap}
                setUnveilMap={setUnveilMap}
                onResetSync={handleResetAndSync}
                isMapFloating={isMapFloating}
                onUndock={handleDockUndock}
            />

            {localContextMenu && (
                <MapperContextMenu
                    x={localContextMenu.x}
                    y={localContextMenu.y}
                    roomId={localContextMenu.roomId}
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
                    setViewZ={setViewZ}
                    isDarkMode={isDarkMode}
                />
            )}

            {!effectiveIsMinimized && (
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'lime', background: 'rgba(0,0,0,0.85)', padding: '8px', zIndex: 9999, fontSize: '11px', pointerEvents: 'none', borderRadius: '4px', border: '1px solid #333', fontFamily: 'monospace' }}>
                    Z: {viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? (rooms[currentRoomId].z || 0).toFixed(1) : '0.0')}
                </div>
            )}
        </div>
    );
});

Mapper.displayName = 'Mapper';