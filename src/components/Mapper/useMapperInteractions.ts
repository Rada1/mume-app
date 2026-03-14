import { useRef, useState, useEffect, useMemo } from 'react';
import { MapperRoom, MapperMarker } from './mapperTypes';
import { GRID_SIZE, DRAG_SENSITIVITY, ZOOM_SENSITIVITY } from './mapperUtils';
import { useMapHitTest } from './hooks/useMapHitTest';
import { useMapWheelEvents } from './hooks/useMapWheelEvents';
import { getButtonCommand } from '../../utils/buttonUtils';

interface InteractionProps {
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    markers: Record<string, MapperMarker>;
    setMarkers: React.Dispatch<React.SetStateAction<Record<string, MapperMarker>>>;
    selectedRoomIds: Set<string>;
    setSelectedRoomIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedMarkerId: string | null;
    setSelectedMarkerId: React.Dispatch<React.SetStateAction<string | null>>;
    cameraRef: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    mode: 'edit' | 'play';
    currentRoomId: string | null;
    isDesignMode: boolean;
    isMinimized: boolean;
    setAutoCenter: (auto: boolean) => void;
    setContextMenu: (menu: any) => void;
    setInfoRoomId: (id: string | null) => void;
    triggerHaptic: (duration?: number) => void;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    cardRef: React.RefObject<HTMLDivElement>;
    setIsDragging: (dragging: boolean) => void;
    handleAddRoom: (wx: number, wy: number, z: number) => string;
    triggerRender: () => void;
    viewZ: number | null;
    setViewZ: React.Dispatch<React.SetStateAction<number | null>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    startWalking: (targetId: string) => void;
    stopWalking: () => void;
    executeCommand: (cmd: string) => void;
    joystick: any;
    btn: any;
    heldButton: any;
    setHeldButton: (val: any) => void;
    target: any;
}

export const useMapperInteractions = ({
    rooms, setRooms, markers, setMarkers, selectedRoomIds, setSelectedRoomIds,
    selectedMarkerId, setSelectedMarkerId, cameraRef, mode, currentRoomId,
    isDesignMode, isMinimized, setAutoCenter, setContextMenu, setInfoRoomId,
    triggerHaptic, canvasRef, cardRef, setIsDragging, handleAddRoom, triggerRender,
    viewZ, setViewZ, preloadedCoordsRef, spatialIndexRef,
    startWalking, stopWalking, executeCommand, joystick, btn, heldButton, setHeldButton, target
}: InteractionProps) => {

    const isDraggingInternalRef = useRef(false);
    const dragTypeRef = useRef<'pan' | 'room' | 'pinch' | 'marquee' | 'marker' | 'joystick' | null>(null);
    const activePointersRef = useRef<Map<number, { x: number, y: number }>>(new Map());
    const lastPointersRef = useRef<{ id: number, x: number, y: number }[]>([]);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });
    const hasDraggedRef = useRef(false);
    const longPressTimerRef = useRef<any>(null);
    const scrollLockRef = useRef(false);
    const contextMenuTriggeredRef = useRef(false);
    const comboFiredRef = useRef(false);

    const [marqueeStart, setMarqueeStart] = useState<{ x: number, y: number } | null>(null);
    const [marqueeEnd, setMarqueeEnd] = useState<{ x: number, y: number } | null>(null);

    const roomsRef = useRef(rooms);
    const markersRef = useRef(markers);
    const selectedRoomIdsRef = useRef(selectedRoomIds);
    const currentRoomIdRef = useRef(currentRoomId);
    
    // Stable refs for volatile dependencies
    const depsRef = useRef({ mode, isDesignMode, joystick, btn, heldButton, setHeldButton, target, executeCommand, triggerHaptic, setContextMenu, setInfoRoomId, setSelectedRoomIds, setSelectedMarkerId, setIsDragging, startWalking, stopWalking, setRooms, setMarkers });
    useEffect(() => {
        depsRef.current = { mode, isDesignMode, joystick, btn, heldButton, setHeldButton, target, executeCommand, triggerHaptic, setContextMenu, setInfoRoomId, setSelectedRoomIds, setSelectedMarkerId, setIsDragging, startWalking, stopWalking, setRooms, setMarkers };
    }, [mode, isDesignMode, joystick, btn, heldButton, setHeldButton, target, executeCommand, triggerHaptic, setContextMenu, setInfoRoomId, setSelectedRoomIds, setSelectedMarkerId, setIsDragging, startWalking, stopWalking, setRooms, setMarkers]);

    useEffect(() => { roomsRef.current = rooms; }, [rooms]);
    useEffect(() => { markersRef.current = markers; }, [markers]);
    useEffect(() => { selectedRoomIdsRef.current = selectedRoomIds; }, [selectedRoomIds]);
    useEffect(() => { currentRoomIdRef.current = currentRoomId; }, [currentRoomId]);

    const { screenToWorld, getRoomAt, getMarkerAt } = useMapHitTest({
        roomsRef, markersRef, currentRoomIdRef, cameraRef, canvasRef, viewZ, spatialIndexRef, preloadedCoordsRef
    });

    const { onWheel } = useMapWheelEvents({
        cameraRef, roomsRef, currentRoomIdRef, canvasRef, setViewZ, setAutoCenter, triggerRender
    });

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const onDown = (e: PointerEvent) => {
            if (!e.isPrimary) return;
            
            // IGNORE all internal map interactions if a window/cluster drag is in progress
            if (document.body.classList.contains('global-dragging')) return;

            if (cardRef.current && cardRef.current.contains(e.target as Node)) {
                scrollLockRef.current = true;
                return;
            }
            scrollLockRef.current = false;
            
            const { mode, isDesignMode, joystick, triggerHaptic, setContextMenu, setSelectedMarkerId, setInfoRoomId, setSelectedRoomIds, setIsDragging, startWalking, executeCommand, heldButton } = depsRef.current;

            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const world = screenToWorld(mx, my);
            const clickedMarkerId = getMarkerAt(world.x, world.y);
            const clickedRoomId = getRoomAt(world.x, world.y, true);

            // Special case for joystick trackpad in play mode on mobile/touch
            const isJoystickMode = mode === 'play' && !isDesignMode && e.pointerType !== 'mouse';

            if (isDesignMode && !clickedMarkerId && !clickedRoomId && !e.altKey) return;

            // e.preventDefault(); // Stop bubbling to joystick
            e.stopPropagation();
            try { cvs.setPointerCapture(e.pointerId); } catch(err) {}
            activePointersRef.current.set(e.pointerId, { x: mx, y: my });

            const pointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = pointers;

            if (pointers.length === 1 || (pointers.length === 2 && heldButton)) {
                if (e.button !== 0 && pointers.length === 1) return;
                hasDraggedRef.current = false;
                contextMenuTriggeredRef.current = false;
                comboFiredRef.current = false;

                longPressTimerRef.current = setTimeout(() => {
                    const latestWorld = screenToWorld(lastMouseRef.current.x, lastMouseRef.current.y);
                    const latestRoomId = getRoomAt(latestWorld.x, latestWorld.y, false);

                    triggerHaptic(40);
                    contextMenuTriggeredRef.current = true;

                    if (depsRef.current.mode === 'play') {
                        if (latestRoomId) {
                            // Cancel joystick steering once walk is confirmed
                            if (dragTypeRef.current === 'joystick') {
                                depsRef.current.joystick.handleJoystickCancel();
                                dragTypeRef.current = 'pan'; // Switch to pan to prevent further joystick events
                            }
                            depsRef.current.startWalking(latestRoomId);
                        }
                    } else if (!isJoystickMode) {
                        setContextMenu({ x: mx, y: my, wx: latestWorld.x, wy: latestWorld.y, roomId: latestRoomId });
                    }
                }, 500);

                if (isJoystickMode) {
                    isDraggingInternalRef.current = true;
                    dragTypeRef.current = 'joystick';
                    setIsDragging(true);
                    joystick.handleJoystickStart(e as any, executeCommand);
                    startMouseRef.current = { x: mx, y: my };
                    lastMouseRef.current = { x: mx, y: my };
                    return;
                }

                if (clickedMarkerId && mode === 'edit') {
                    setSelectedMarkerId(clickedMarkerId); setInfoRoomId(null); setSelectedRoomIds(new Set());
                    isDraggingInternalRef.current = true; dragTypeRef.current = 'marker'; setIsDragging(true);
                } else if (clickedRoomId && mode === 'edit') {
                    setSelectedMarkerId(null);
                    if (e.shiftKey) {
                        setSelectedRoomIds(prev => {
                            const next = new Set(prev);
                            if (next.has(clickedRoomId)) (next as Set<string>).delete(clickedRoomId);
                            else (next as Set<string>).add(clickedRoomId);
                            return next;
                        });
                    } else if (!selectedRoomIdsRef.current.has(clickedRoomId)) {
                        setSelectedRoomIds(new Set([clickedRoomId]));
                    }
                    isDraggingInternalRef.current = true; dragTypeRef.current = 'room'; setIsDragging(true);
                } else {
                    isDraggingInternalRef.current = true; dragTypeRef.current = mode === 'edit' && !clickedRoomId ? 'marquee' : 'pan'; setIsDragging(true);
                    if (!clickedRoomId) {
                        if (!e.shiftKey) setSelectedRoomIds(new Set());
                        setInfoRoomId(null); setSelectedMarkerId(null);
                        if (mode === 'edit') setMarqueeStart({ x: mx, y: my });
                    }
                }
            } else if (pointers.length === 2) {
                if (dragTypeRef.current === 'joystick') {
                    joystick.handleJoystickCancel();
                }
                isDraggingInternalRef.current = true; dragTypeRef.current = 'pinch'; setIsDragging(true);
            }
            startMouseRef.current = { x: mx, y: my };
            lastMouseRef.current = { x: mx, y: my };
        };

        const onMove = (e: PointerEvent) => {
            if (!e.isPrimary) return;
            const { mode, joystick, executeCommand, heldButton, setHeldButton, btn, target, triggerHaptic, setRooms, setMarkers } = depsRef.current;
            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;

            if (longPressTimerRef.current) {
                const dx = mx - startMouseRef.current.x, dy = my - startMouseRef.current.y;
                if (Math.hypot(dx, dy) > 25) {
                    hasDraggedRef.current = true;
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                }
            }
            if (scrollLockRef.current || !isDraggingInternalRef.current) return;

            if (!activePointersRef.current.has(e.pointerId)) return;
            activePointersRef.current.set(e.pointerId, { x: mx, y: my });
            const pointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));

            if ((pointers.length === 1 || (pointers.length === 2 && heldButton)) && lastMouseRef.current) {
                const dx = mx - lastMouseRef.current.x, dy = my - lastMouseRef.current.y;
                if (!hasDraggedRef.current && (Math.abs(mx - startMouseRef.current.x) > 3 || Math.abs(my - startMouseRef.current.y) > 3)) hasDraggedRef.current = true;
                
                if (dragTypeRef.current === 'joystick') {
                    const dir = joystick.handleJoystickMove(e as any, executeCommand, !!heldButton);
                    if (dir && heldButton && !comboFiredRef.current && setHeldButton) {
                        const button = btn.buttons.find((b: any) => b.id === heldButton.id);
                        if (button) {
                            const result = getButtonCommand(button, heldButton.dx || 0, heldButton.dy || 0, undefined, undefined, heldButton.modifiers, { currentDir: dir, isTargetModifierActive: !!joystick.isTargetModifierActive }, target, !!joystick.isTargetModifierActive);
                            if (result) {
                                executeCommand(result.cmd);
                                comboFiredRef.current = true;
                                setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                                triggerHaptic(60);
                            }
                        } else if (heldButton.baseCommand) {
                            const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down', nw: 'up', se: 'down' };
                            const finalDir = dirMap[dir] || dir;
                            executeCommand(`${heldButton.baseCommand} ${finalDir}`);
                            comboFiredRef.current = true;
                            setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                            triggerHaptic(60);
                        }
                    }
                    lastMouseRef.current = { x: mx, y: my };
                    return;
                }

                if (!hasDraggedRef.current) { lastMouseRef.current = { x: mx, y: my }; return; }

                const cam = cameraRef.current;
                if (dragTypeRef.current === 'pan') {
                    cam.x -= (dx * DRAG_SENSITIVITY) / cam.zoom; cam.y -= (dy * DRAG_SENSITIVITY) / cam.zoom;
                    setAutoCenter(false);
                    triggerRender();
                } else if (dragTypeRef.current === 'room' && selectedRoomIdsRef.current.size > 0 && mode === 'edit') {
                    const worldDx = dx / cam.zoom, worldDy = dy / cam.zoom;
                    setRooms(prev => {
                        const next = { ...prev };
                        selectedRoomIdsRef.current.forEach(id => { if (next[id]) next[id] = { ...next[id], x: next[id].x + (worldDx / GRID_SIZE), y: next[id].y + (worldDy / GRID_SIZE) }; });
                        return next;
                    });
                } else if (dragTypeRef.current === 'marker' && selectedMarkerId && mode === 'edit') {
                    const worldDx = dx / cam.zoom, worldDy = dy / cam.zoom;
                    setMarkers(prev => {
                        const next = { ...prev };
                        if (next[selectedMarkerId]) next[selectedMarkerId] = { ...next[selectedMarkerId], x: next[selectedMarkerId].x + (worldDx / GRID_SIZE), y: next[selectedMarkerId].y + (worldDy / GRID_SIZE) };
                        return next;
                    });
                } else if (dragTypeRef.current === 'marquee' && mode === 'edit') {
                    setMarqueeEnd({ x: mx, y: my });
                }
            } else if (pointers.length === 2 && dragTypeRef.current === 'pinch' && lastPointersRef.current.length === 2 && !heldButton) {
                const p1 = pointers[0], p2 = pointers[1], lp1 = lastPointersRef.current[0], lp2 = lastPointersRef.current[1];
                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y), lastDist = Math.hypot(lp2.x - lp1.x, lp2.y - lp1.y);
                const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, lastMid = { x: (lp1.x + lp2.x) / 2, y: (lp1.y + lp2.y) / 2 };
                
                if (lastDist > 1 && dist > 1) {
                    const cam = cameraRef.current, oldZoom = cam.zoom;
                    const newZoom = Math.max(0.01, Math.min(oldZoom * (1 + (dist / lastDist - 1) * ZOOM_SENSITIVITY), 5));
                    
                    // Pan by midpoint delta
                    const dx = mid.x - lastMid.x;
                    const dy = mid.y - lastMid.y;
                    cam.x -= (dx * DRAG_SENSITIVITY) / oldZoom;
                    cam.y -= (dy * DRAG_SENSITIVITY) / oldZoom;
                    
                    // Zoom around midpoint
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
    }, [canvasRef, screenToWorld, getRoomAt, getMarkerAt, triggerRender, onWheel]);

    const outputMarquee = useMemo(() => ({ start: marqueeStart, end: marqueeEnd }), [marqueeStart, marqueeEnd]);

    return { marquee: outputMarquee };
};
