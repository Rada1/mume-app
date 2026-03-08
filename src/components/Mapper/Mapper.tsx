import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useMapperController } from './useMapperController';
import { MapCanvas } from './MapCanvas';
import { MapperToolbar } from './MapperToolbar';
import { MapperDropdown } from './MapperDropdown';
import { MapperContextMenu } from './MapperContextMenu';
import { RoomInfoCard } from './RoomInfoCard';
import { useMapperInteractions } from './useMapperInteractions';
import { PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES } from './mapperUtils';
import { useSmartWalk } from './hooks/useSmartWalk';
import { useMapperExportImport } from './hooks/useMapperExportImport';
import { useMapperPlayerTracking } from './hooks/useMapperPlayerTracking';

interface MapperProps {
    isMinimized?: boolean;
    setIsMinimized?: (min: boolean) => void;
    characterName?: string;
    isMobile?: boolean;
    isExpanded?: boolean;
    isDesignMode?: boolean;
    isMmapperMode?: boolean;
}

export interface MapperHandle {
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleResetAndSync: () => void;
}

export const Mapper = forwardRef<MapperHandle, MapperProps>((props, ref) => {
    const { isMinimized: isMinimizedProp, setIsMinimized, characterName, isMobile: isMobileProp, isExpanded } = props;
    const effectiveIsMinimized = isMinimizedProp ?? (isExpanded !== undefined ? !isExpanded : false);
    const [mode, setMode] = useState<'play' | 'edit'>('play');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);
    const [renderVersion, setRenderVersion] = useState(0);
    const [autoCenter, setAutoCenter] = useState(true);
    const [isMobile] = useState(() => isMobileProp ?? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    const [viewZ, setViewZ] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);
    const lastRoomIdRef = useRef<string | null>(null);

    const { addMessage, triggerHaptic, executeCommand } = useGame();

    // Pass a dummy onRecenter first to controller
    const controller = useMapperController(characterName ?? null, ref, { 
        onRecenter: () => { handleCenterOnPlayer() },
        triggerRender: () => { setRenderVersion(v => v + 1); }
    });

    const {
        rooms, setRooms, markers, setMarkers, currentRoomId,
        allowPersistence, setAllowPersistence, cameraRef,
        handleAddRoom, handleDeleteRoom, roomsRef,
        currentRoomIdRef, markersRef, preloadedCoordsRef,
        unveilMap, setUnveilMap, handleResetAndSync, handleSyncLocation, handleClearMap
    } = controller;

    const { isWalking, startWalking, stopWalking } = useSmartWalk(currentRoomId, rooms, executeCommand, preloadedCoordsRef, addMessage);

    const triggerRender = useCallback(() => setRenderVersion(v => v + 1), []);

    const { handleExportMap, handleImportMap, handleImportMMapper } = useMapperExportImport(rooms, setRooms, markers, setMarkers, characterName, addMessage, controller);
    const { handleCenterOnPlayer } = useMapperPlayerTracking(currentRoomId, rooms, autoCenter, setAutoCenter, cameraRef, canvasRef, playerPosRef, playerTrailRef, lastRoomIdRef, triggerRender);

    const { marquee } = useMapperInteractions({
        rooms, setRooms, markers, setMarkers,
        selectedRoomIds, setSelectedRoomIds,
        selectedMarkerId, setSelectedMarkerId,
        cameraRef, mode, currentRoomId,
        isDesignMode: props.isDesignMode || false,
        isMinimized: effectiveIsMinimized,
        setAutoCenter, setContextMenu, setInfoRoomId,
        triggerHaptic: triggerHaptic ?? (() => { }),
        canvasRef, cardRef, setIsDragging, handleAddRoom,
        triggerRender, viewZ, setViewZ,
        preloadedCoordsRef,
        spatialIndexRef: controller.spatialIndexRef,
        startWalking, stopWalking
    });

    useEffect(() => {
        const all = [...PEAK_IMAGES, ...FOREST_IMAGES, ...HILL_IMAGES];
        all.forEach(src => {
            if (!imagesRef.current[src]) {
                const img = new Image();
                img.src = src;
                img.onload = () => triggerRender();
                imagesRef.current[src] = img;
            }
        });
    }, [triggerRender]);

    // Handle Player Position & Trail
    useEffect(() => {
        if (currentRoomId && rooms[currentRoomId]) {
            const r = rooms[currentRoomId];
            if (playerPosRef.current) {
                // Add old position to trail
                playerTrailRef.current.push({
                    x: playerPosRef.current.x,
                    y: playerPosRef.current.y,
                    z: playerPosRef.current.z,
                    alpha: 1.0
                });
                if (playerTrailRef.current.length > 15) playerTrailRef.current.shift();
            }
            if (!playerPosRef.current) {
                playerPosRef.current = { x: r.x, y: r.y, z: r.z || 0 };
            }

            // Whenever the room changes, ensure auto-center is active so the 
            // animation loop in useMapAnimation.ts can glide the camera smoothly.
            if (currentRoomId !== lastRoomIdRef.current) {
                lastRoomIdRef.current = currentRoomId;
                setAutoCenter(true);
            }

            triggerRender();
        } else if (!currentRoomId) {
            lastRoomIdRef.current = null;
            playerPosRef.current = null;
            playerTrailRef.current = [];
            triggerRender();
        }
    }, [currentRoomId, rooms, autoCenter, cameraRef, triggerRender]);

    // Trigger immediate render when unveilMap toggles
    useEffect(() => {
        triggerRender();
    }, [unveilMap, triggerRender]);

    const handleAddMarker = useCallback((wx: number, wy: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({
            ...prev,
            [id]: {
                id,
                x: wx,
                y: wy,
                z,
                text: 'New Marker',
                dotSize: 5,
                fontSize: 12,
                createdAt: Date.now()
            }
        }));
    }, [setMarkers]);

    return (
        <div className={`mapper-container ${effectiveIsMinimized ? 'minimized' : ''} ${isMobile ? 'mobile' : ''} ${!effectiveIsMinimized ? 'full-view' : ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#11111b' }}>
            <MapCanvas
                ref={canvasRef}
                rooms={rooms}
                markers={markers}
                currentRoomId={currentRoomId}
                selectedRoomIds={selectedRoomIds}
                selectedMarkerId={selectedMarkerId}
                camera={cameraRef}
                isDarkMode={true}
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
                spatialIndexRef={controller.spatialIndexRef}
                exploredVnums={controller.exploredVnums}
                exploredRef={controller.exploredRef}
                triggerRender={triggerRender}
                unveilMap={unveilMap}
                viewZ={viewZ}
                firstExploredAtRef={controller.firstExploredAtRef}
            />
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
            />
            <MapperDropdown
                isOpen={isDropdownOpen}
                setIsOpen={setIsDropdownOpen}
                allowPersistence={allowPersistence}
                setAllowPersistence={setAllowPersistence}
                isDarkMode={true}
                setIsDarkMode={() => { }}
                exportMap={handleExportMap}
                importMap={handleImportMap}
                importMMapper={handleImportMMapper}
                clearMap={() => {
                    handleClearMap();
                    setIsDropdownOpen(false);
                }}
            />

            {contextMenu && (
                <MapperContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    roomId={contextMenu.roomId}
                    onClose={() => setContextMenu(null)}
                    onDelete={() => {
                        if (contextMenu.roomId) handleDeleteRoom(contextMenu.roomId);
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onInfo={() => {
                        setInfoRoomId(contextMenu.roomId);
                        setContextMenu(null);
                    }}
                    onAddMarker={() => {
                        handleAddMarker(contextMenu.wx, contextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0));
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onAddRoom={() => {
                        handleAddRoom(contextMenu.wx, contextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0));
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onSyncLocation={() => {
                        handleSyncLocation(contextMenu.wx, contextMenu.wy);
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onWalkStart={(rid) => {
                        startWalking(rid);
                    }}
                    onWalkEnd={() => {
                        stopWalking();
                        setContextMenu(null);
                    }}
                    mode={mode}
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