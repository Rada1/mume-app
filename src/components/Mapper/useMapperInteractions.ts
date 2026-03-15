import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { MapperRoom, MapperMarker } from './mapperTypes';
import { GRID_SIZE, DRAG_SENSITIVITY, ZOOM_SENSITIVITY } from './mapperUtils';
import { useMapHitTest } from './hooks/useMapHitTest';

export interface InteractionDeps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    cameraRef: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    triggerRender: () => void;
    rooms: Record<string, MapperRoom>;
    markers: Record<string, MapperMarker>;
    setRooms: (fn: (prev: Record<string, MapperRoom>) => Record<string, MapperRoom>) => void;
    setMarkers: (fn: (prev: Record<string, MapperMarker>) => Record<string, MapperMarker>) => void;
    setViewZ: (z: number | null) => void;
    onRoomClick?: (roomId: string) => void;
    mode: 'play' | 'edit';
    currentRoomId: string | null;
    isDesignMode: boolean;
    isMinimized: boolean;
    setIsMinimized?: (min: boolean) => void;
    setAutoCenter: (auto: boolean) => void;
    setContextMenu: (menu: any) => void;
    setInfoRoomId: (id: string | null) => void;
    setSelectedRoomIds: (ids: Set<string>) => void;
    selectedRoomIds: Set<string>;
    selectedMarkerId: string | null;
    setSelectedMarkerId: (id: string | null) => void;
    triggerHaptic: (ms: number) => void;
    joystick: any;
    executeCommand: (cmd: string) => void;
    startWalking: (targetId: string) => void;
    stopWalking: () => void;
    setIsDragging: (dragging: boolean) => void;
    handleAddRoom: (x: number, y: number, z: number) => void;
    viewZ: number | null;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    spatialIndexRef: React.MutableRefObject<any>;
    cardRef?: React.RefObject<HTMLDivElement>;
    btn?: any;
    heldButton?: any;
    setHeldButton?: any;
    target?: any;
}

export const useMapperInteractions = (deps: InteractionDeps) => {
    const { canvasRef, cameraRef, triggerRender, rooms, markers, setRooms, setMarkers, setViewZ, onRoomClick } = deps;
    const { screenToWorld, getRoomAt, getMarkerAt } = useMapHitTest({
        canvasRef, cameraRef, roomsRef: { current: rooms } as any, markersRef: { current: markers } as any,
        currentRoomIdRef: { current: deps.currentRoomId } as any,
        viewZ: deps.viewZ,
        spatialIndexRef: deps.spatialIndexRef,
        preloadedCoordsRef: deps.preloadedCoordsRef
    });

    const [marqueeStart, setMarqueeStart] = useState<{ x: number, y: number } | null>(null);
    const [marqueeEnd, setMarqueeEnd] = useState<{ x: number, y: number } | null>(null);

    const activePointersRef = useRef<Map<number, { x: number, y: number }>>(new Map());
    const lastPointersRef = useRef<{ id: number, x: number, y: number }[]>([]);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });
    const startTimeRef = useRef(0);
    const hasDraggedRef = useRef(false);
    const dragTypeRef = useRef<'pan' | 'room' | 'marker' | 'marquee' | 'joystick' | null>(null);
    const isDraggingInternalRef = useRef(false);
    const scrollLockRef = useRef(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const contextMenuTriggeredRef = useRef(false);
    const startMarkerPosRef = useRef({ x: 0, y: 0 });
    const comboFiredRef = useRef(false);

    // Stable ref for event listeners to avoid re-binding
    const depsRef = useRef(deps);
    useEffect(() => { depsRef.current = deps; }, [deps]);

    const selectedRoomIdsRef = useRef(deps.selectedRoomIds);
    useEffect(() => { selectedRoomIdsRef.current = deps.selectedRoomIds; }, [deps.selectedRoomIds]);

    const roomsRef = useRef(rooms);
    useEffect(() => { roomsRef.current = rooms; }, [rooms]);

    const currentRoomIdRef = useRef(deps.currentRoomId);
    useEffect(() => { currentRoomIdRef.current = deps.currentRoomId; }, [deps.currentRoomId]);

    const onWheel = useCallback((e: WheelEvent) => {
        // IGNORE zoom if a window drag is in progress
        if (document.body.classList.contains('global-dragging')) return;

        e.preventDefault();
        const cam = cameraRef.current;
        const oldZoom = cam.zoom;
        const delta = -e.deltaY;
        const scaleFactor = Math.pow(1.1, delta / 100);
        const newZoom = Math.max(0.05, Math.min(5, cam.zoom * scaleFactor));

        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        cam.x += (mx / oldZoom) - (mx / newZoom);
        cam.y += (my / oldZoom) - (my / newZoom);
        cam.zoom = newZoom;

        depsRef.current.setAutoCenter(false);
        triggerRender();
    }, [cameraRef, canvasRef, triggerRender]);

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const onDown = (e: PointerEvent) => {
            if (!e.isPrimary) return;
            
            // IGNORE all internal map interactions if a window/cluster drag is in progress
            if (document.body.classList.contains('global-dragging')) return;

            const { cardRef } = depsRef.current;
            if (cardRef.current && cardRef.current.contains(e.target as Node)) {
                scrollLockRef.current = true;
                return;
            }
            scrollLockRef.current = false;

            // Prevent browser gestures (scrolling, etc) from stealing map input
            if (e.cancelable) e.preventDefault();

            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try { cvs.setPointerCapture(e.pointerId); } catch(err) {}
            
            if (activePointersRef.current.size === 1) {
                const { mode, setSelectedRoomIds } = depsRef.current;
                startMouseRef.current = { x: e.clientX, y: e.clientY };
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
                startTimeRef.current = Date.now();
                hasDraggedRef.current = false;
                dragTypeRef.current = 'room';
                contextMenuTriggeredRef.current = false;

                const world = screenToWorld(e.clientX, e.clientY);
                const roomId = getRoomAt(world.x, world.y);
                const markerId = getMarkerAt(world.x, world.y);

                if (mode === 'edit') {
                    if (markerId) {
                        dragTypeRef.current = 'marker';
                        startMarkerPosRef.current = { x: roomsRef.current[markerId]?.x || 0, y: roomsRef.current[markerId]?.y || 0 };
                    } else if (roomId) {
                        if (!selectedRoomIdsRef.current.has(roomId)) {
                            setSelectedRoomIds(new Set([roomId]));
                        }
                    } else {
                        dragTypeRef.current = 'marquee';
                        setMarqueeStart({ x: e.clientX, y: e.clientY });
                        setMarqueeEnd({ x: e.clientX, y: e.clientY });
                    }
                } else {
                    // Normal play mode - no auto-minimize on down
                }
            }
        };

        const onMove = (e: PointerEvent) => {
            if (!activePointersRef.current.has(e.pointerId)) return;
            
            // IGNORE all internal map interactions if a window/cluster drag is in progress
            if (document.body.classList.contains('global-dragging')) return;

            // Prevent browser scroll during map interaction
            if (e.cancelable) e.preventDefault();

            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            
            const { setAutoCenter, setIsDragging, setRooms } = depsRef.current;
            const pointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));
            const mx = e.clientX, my = e.clientY;

            if (pointers.length === 1) {
                const p = pointers[0];
                const dx = p.x - lastMouseRef.current.x;
                const dy = p.y - lastMouseRef.current.y;
                
                if (!hasDraggedRef.current) {
                    const totalDx = p.x - startMouseRef.current.x;
                    const totalDy = p.y - startMouseRef.current.y;
                    if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 5) {
                        hasDraggedRef.current = true;
                        setIsDragging(true);
                    }
                }

                if (hasDraggedRef.current) {
                    if (dragTypeRef.current === 'pan' || dragTypeRef.current === 'room') {
                        const cam = cameraRef.current;
                        cam.x -= dx / cam.zoom;
                        cam.y -= dy / cam.zoom;
                        setAutoCenter(false);
                        triggerRender();
                    } else if (dragTypeRef.current === 'marquee') {
                        setMarqueeEnd({ x: p.x, y: p.y });
                        triggerRender();
                    }
                }
            } else if (pointers.length === 2) {
                const p1 = pointers[0], p2 = pointers[1];
                const lastP1 = lastPointersRef.current.find(lp => lp.id === p1.id);
                const lastP2 = lastPointersRef.current.find(lp => lp.id === p2.id);

                if (lastP1 && lastP2) {
                    const lastDist = Math.sqrt(Math.pow(lastP1.x - lastP2.x, 2) + Math.pow(lastP1.y - lastP2.y, 2));
                    const currentDist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                    
                    const cam = cameraRef.current;
                    const oldZoom = cam.zoom;
                    const scaleFactor = currentDist / lastDist;
                    const newZoom = Math.max(0.05, Math.min(5, cam.zoom * scaleFactor));
                    
                    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                    cam.x += (mid.x / oldZoom) - (mid.x / newZoom);
                    cam.y += (mid.y / oldZoom) - (mid.y / newZoom);
                    cam.zoom = newZoom;
                    
                    setAutoCenter(false);
                    triggerRender();
                }
            }
            lastPointersRef.current = pointers; lastMouseRef.current = { x: mx, y: my };
        };

        const onUp = (e: PointerEvent) => {
            if (!e.isPrimary) return;
            const { mode, joystick, executeCommand, triggerHaptic, stopWalking, setInfoRoomId, setSelectedRoomIds, setIsDragging, setRooms } = depsRef.current;
            
            if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            comboFiredRef.current = false;
            scrollLockRef.current = false;
            activePointersRef.current.delete(e.pointerId);
            try { cvs.releasePointerCapture(e.pointerId); } catch(err) {}
            
            const remPointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = remPointers;

            if (activePointersRef.current.size === 0) {
                if (mode === 'play') {
                    stopWalking();
                }

                if (dragTypeRef.current === 'joystick') {
                    joystick.handleJoystickEnd(e as any, executeCommand, triggerHaptic);
                } else if (dragTypeRef.current === 'marquee' && marqueeStart && marqueeEnd) {
                    const w1 = screenToWorld(marqueeStart.x, marqueeStart.y), w2 = screenToWorld(marqueeEnd.x, marqueeEnd.y);
                    const x1 = Math.min(w1.x, w2.x), y1 = Math.min(w1.y, w2.y), x2 = Math.max(w1.x, w2.x), y2 = Math.max(w1.y, w2.y);
                    const currentZ = currentRoomIdRef.current ? (roomsRef.current[currentRoomIdRef.current]?.z || 0) : 0;
                    const newSelection = new Set(e.shiftKey ? selectedRoomIdsRef.current : []);
                    Object.values(roomsRef.current).forEach(r => {
                        const rx = r.x * GRID_SIZE, ry = r.y * GRID_SIZE;
                        if (rx >= x1 - GRID_SIZE && rx <= x2 && ry >= y1 - GRID_SIZE && ry <= y2 && (r.z || 0) === currentZ) newSelection.add(r.id);
                    });
                    setSelectedRoomIds(newSelection);
                } else if (!hasDraggedRef.current && dragTypeRef.current === 'room' && !contextMenuTriggeredRef.current) {
                    const world = screenToWorld(startMouseRef.current.x, startMouseRef.current.y);
                    const clickedRoomId = getRoomAt(world.x, world.y);
                    if (clickedRoomId) setInfoRoomId(clickedRoomId);
                }
                if (dragTypeRef.current === 'room' && selectedRoomIdsRef.current.size > 0 && hasDraggedRef.current) {
                    setRooms(prev => {
                        const next = { ...prev };
                        selectedRoomIdsRef.current.forEach(id => { if (next[id]) next[id] = { ...next[id], x: Math.round(next[id].x), y: Math.round(next[id].y) }; });
                        return next;
                    });
                }
                isDraggingInternalRef.current = false; dragTypeRef.current = null; setIsDragging(false);
                setMarqueeStart(null); setMarqueeEnd(null);
            } else if (activePointersRef.current.size === 1) {
                dragTypeRef.current = 'pan';
                const pointer = remPointers[0];
                startMouseRef.current = { x: pointer.x, y: pointer.y }; lastMouseRef.current = { x: pointer.x, y: pointer.y };
            }
        };

        cvs.addEventListener('pointerdown', onDown, { passive: false });
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onUp, { passive: false });
        cvs.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cvs.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            cvs.removeEventListener('wheel', onWheel);
            activePointersRef.current.clear();
            isDraggingInternalRef.current = false;
        };
    }, [canvasRef, screenToWorld, getRoomAt, getMarkerAt, triggerRender, onWheel, marqueeStart, marqueeEnd]);

    const outputMarquee = useMemo(() => ({ start: marqueeStart, end: marqueeEnd }), [marqueeStart, marqueeEnd]);

    return { marquee: outputMarquee };
};
