import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ExecuteCommand } from '../../types';

import { MapperRoom, MapperMarker } from './mapperTypes';
import { GRID_SIZE, DRAG_SENSITIVITY, ZOOM_SENSITIVITY } from './mapperUtils';
import { useMapHitTest } from './hooks/useMapHitTest';
import { getButtonCommand } from '../../utils/buttonUtils';

export interface InteractionDeps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    cardRef: React.RefObject<HTMLDivElement>;
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
    btn?: any;
    heldButton?: any;
    heldButtonRef?: React.MutableRefObject<any>;
    setHeldButton?: (val: any) => void;
    target?: string;
    executeCommand: ExecuteCommand;
    startWalking: (targetId: string) => void;
    stopWalking: () => void;
    setIsDragging: (dragging: boolean) => void;
    handleAddRoom: (x: number, y: number, z: number) => void;
    viewZ: number | null;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    spatialIndexRef: React.MutableRefObject<any>;
    setIsTrackpadModifierActive?: (val: boolean) => void;
    setPopoverState: (val: any) => void;
    setActiveSet: (setId: string) => void;
}

export const useMapperInteractions = (deps: InteractionDeps) => {
    const { canvasRef, cameraRef, triggerRender, rooms, markers, setRooms, setMarkers, setViewZ, onRoomClick } = deps;
    const hitTest = useMapHitTest({
        canvasRef, cameraRef, roomsRef: { current: rooms } as any, markersRef: { current: markers } as any,
        currentRoomIdRef: { current: deps.currentRoomId } as any,
        viewZ: deps.viewZ,
        spatialIndexRef: deps.spatialIndexRef,
        preloadedCoordsRef: deps.preloadedCoordsRef
    });
    const hitTestRef = useRef(hitTest);
    useEffect(() => { hitTestRef.current = hitTest; }, [hitTest]);

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
        
        // --- Z-Axis Scrolling (Ctrl + Scroll) ---
        if (e.ctrlKey) {
            const dir = e.deltaY > 0 ? -1 : 1;
            const { setViewZ, setAutoCenter, rooms, currentRoomId, viewZ } = depsRef.current;
            
            // Get effective current Z to start from if viewZ is null
            let startZ = 0;
            if (viewZ !== null) {
                startZ = viewZ;
            } else if (currentRoomId) {
                const room = rooms[currentRoomId] || rooms[`m_${currentRoomId}`];
                startZ = room?.z || 0;
            }

            const newZ = Math.round(startZ + dir);
            setViewZ(newZ);
            setAutoCenter(false);
            triggerRender();
            return;
        }

        // --- Standard Zooming ---
        console.log(`[MapperInteractions] Wheel: deltaX=${e.deltaX} deltaY=${e.deltaY}`);
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
            // IGNORE all internal map interactions if a window/cluster drag is in progress
            if (document.body.classList.contains('global-dragging')) return;

            const { cardRef, setContextMenu, triggerHaptic } = depsRef.current;
            if (cardRef.current && cardRef.current.contains(e.target as Node)) {
                scrollLockRef.current = true;
                return;
            }
            if ((e.target as HTMLElement).closest('.message-log') || (e.target as HTMLElement).closest('.hud-cluster')) {
                return;
            }
            scrollLockRef.current = false;

            // Prevent browser gestures (scrolling, etc) from stealing map input
            if (e.pointerType === 'mouse' && e.button !== 0) return; // Only allow left-click for drag
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try { cvs.setPointerCapture(e.pointerId); } catch(err) {}
            
            const pointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = pointers;
            console.log(`[useMapperInteractions] onDown: id=${e.pointerId}, size=${activePointersRef.current.size}, target=${(e.target as HTMLElement).className}`);

            if (activePointersRef.current.size === 1) {
                const { mode, setSelectedRoomIds } = depsRef.current;
                startMouseRef.current = { x: e.clientX, y: e.clientY };
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
                startTimeRef.current = Date.now();
                hasDraggedRef.current = false;
                dragTypeRef.current = 'room';
                contextMenuTriggeredRef.current = false;
                console.log(`[MapperInteractions] PointerDown: ${e.pointerType} x=${e.clientX} y=${e.clientY}`);

                const { screenToWorld, getRoomAt, getMarkerAt } = hitTestRef.current;
                const world = screenToWorld(e.clientX, e.clientY);
                const roomId = getRoomAt(world.x, world.y);
                const markerId = getMarkerAt(world.x, world.y);

                if (mode === 'edit') {
                    if (markerId) {
                        dragTypeRef.current = 'marker';
                        startMarkerPosRef.current = { x: roomsRef.current[markerId]?.x || 0, y: roomsRef.current[markerId]?.y || 0 };
                    } else if (roomId) {
                        dragTypeRef.current = 'room'; // Specifically room dragging in edit mode
                        if (!selectedRoomIdsRef.current.has(roomId)) {
                            setSelectedRoomIds(new Set([roomId]));
                        }
                    } else {
                        dragTypeRef.current = 'marquee';
                        setMarqueeStart({ x: e.clientX, y: e.clientY });
                        setMarqueeEnd({ x: e.clientX, y: e.clientY });
                    }
                } else {
                    // Play mode: Start long-press timer for "Look Modifier"
                    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = setTimeout(() => {
                        const { triggerHaptic, setIsTrackpadModifierActive } = depsRef.current;
                        triggerHaptic(40);
                        contextMenuTriggeredRef.current = true;
                        if (setIsTrackpadModifierActive) {
                            setIsTrackpadModifierActive(true);
                        }
                    }, 500);

                    // Only use joystick/trackpad mode on touch devices; mouse always pans
                    if (e.pointerType === 'touch') {
                        dragTypeRef.current = 'joystick';
                        if (depsRef.current.joystick?.handleJoystickStart) {
                            depsRef.current.joystick.handleJoystickStart(e, depsRef.current.executeCommand);
                        }
                    } else {
                        dragTypeRef.current = 'pan';
                        depsRef.current.setIsDragging(true);
                        isDraggingInternalRef.current = true;
                        depsRef.current.triggerRender();
                    }
                }
            } else if (activePointersRef.current.size === 2) {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                // If we were joysticking, cancel it so we can pan
                if (dragTypeRef.current === 'joystick') {
                    if (depsRef.current.joystick?.handleJoystickCancel) {
                        depsRef.current.joystick.handleJoystickCancel(e);
                    }
                }
                dragTypeRef.current = 'pan';
                depsRef.current.setIsDragging(true);
                isDraggingInternalRef.current = true;
                hasDraggedRef.current = true;
                depsRef.current.triggerRender();
            }
        };

        const onMove = (e: PointerEvent) => {
            if (!activePointersRef.current.has(e.pointerId)) return;
            
            // IGNORE all internal map interactions if a window/cluster drag is in progress
            if (document.body.classList.contains('global-dragging')) return;

            // Prevent browser scroll during map interaction
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            
            const { setAutoCenter, setIsDragging } = depsRef.current;
            const pointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));

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
                        depsRef.current.triggerRender();
                        if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                        }
                    }
                }

                if (hasDraggedRef.current) {
                    if (dragTypeRef.current === 'joystick') {
                        const { joystick, executeCommand, heldButton, setHeldButton, btn, target, triggerHaptic } = depsRef.current;
                        if (joystick?.handleJoystickMove) {
                            // If the trackpad look-modifier fired (long press), we're in "look mode".
                            // Stop any pending repeat-move timer so its haptic(10) doesn't double up
                            // with the look-activation haptic(40) as the user moves toward an inline button.
                            if (contextMenuTriggeredRef.current && joystick.stopRepeatTimer) {
                                joystick.stopRepeatTimer();
                            }
                            const dir = joystick.handleJoystickMove(e, executeCommand, !!heldButton);
                            if (dir) console.log(`[MapperInteractions] Joystick Dir: ${dir}`);
                        }
                    } else if (dragTypeRef.current === 'pan' || dragTypeRef.current === 'room') {
                        const cam = cameraRef.current;
                        cam.x -= dx / cam.zoom;
                        cam.y -= dy / cam.zoom;
                        setAutoCenter(false);
                        triggerRender();
                    } else if (dragTypeRef.current === 'marquee') {
                        setMarqueeEnd({ x: p.x, y: p.y });
                        triggerRender(); // Still needed for marquee as it's not a camera change
                    }
                }
                lastMouseRef.current = { x: p.x, y: p.y };
            } else if (pointers.length === 2) {
                const p1 = pointers[0], p2 = pointers[1];
                const lastP1 = lastPointersRef.current.find(lp => lp.id === p1.id);
                const lastP2 = lastPointersRef.current.find(lp => lp.id === p2.id);

                if (lastP1 && lastP2) {
                    const lastDist = Math.sqrt(Math.pow(lastP1.x - lastP2.x, 2) + Math.pow(lastP1.y - lastP2.y, 2));
                    const currentDist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                    
                    const lastMid = { x: (lastP1.x + lastP2.x) / 2, y: (lastP1.y + lastP2.y) / 2 };
                    const currentMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

                    const cam = cameraRef.current;
                    const oldZoom = cam.zoom;

                    if (lastDist > 10) {
                        const scaleFactor = currentDist / lastDist;
                        const newZoom = Math.max(0.05, Math.min(5, cam.zoom * scaleFactor));
                        
                        const rect = canvasRef.current!.getBoundingClientRect();
                        const mx = currentMid.x - rect.left;
                        const my = currentMid.y - rect.top;
                        
                        cam.x += (mx / oldZoom) - (mx / newZoom);
                        cam.y += (my / oldZoom) - (my / newZoom);
                        cam.zoom = newZoom;
                    }

                    const dx = currentMid.x - lastMid.x;
                    const dy = currentMid.y - lastMid.y;
                    cam.x -= dx / cam.zoom;
                    cam.y -= dy / cam.zoom;

                    setAutoCenter(false);
                    // triggerRender removed - useMapAnimation handles this
                }
            }
            lastPointersRef.current = pointers;
        };

        const onUp = (e: PointerEvent) => {
            e.stopPropagation();
            const { mode, joystick, executeCommand, triggerHaptic, stopWalking, setInfoRoomId, setSelectedRoomIds, setIsDragging, setRooms } = depsRef.current;
            
            if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            
            // Capture the fired state before resetting it
            const wasLongPress = contextMenuTriggeredRef.current;
            contextMenuTriggeredRef.current = false;
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

                if (dragTypeRef.current === 'joystick' || dragTypeRef.current === 'room') {
                    const isTap = !hasDraggedRef.current;
                    const { screenToWorld, getRoomAt, getExitAt } = hitTestRef.current;
                    const world = screenToWorld(e.clientX, e.clientY);

                    // Priority 1: Check for Exit/Door Click (on ANY tap)
                    const exitHit = isTap ? getExitAt?.(world.x, world.y) : null;

                    if (exitHit) {
                        // Clean up joystick state just in case we intercepted its tap
                        if (dragTypeRef.current === 'joystick' && depsRef.current.joystick?.handleJoystickCancel) {
                            depsRef.current.joystick.handleJoystickCancel(e as any);
                        }

                        const { setPopoverState, executeCommand } = depsRef.current;
                        const directions: Record<string, string> = { 
                            n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' 
                        };
                        const dirName = directions[exitHit.direction];
                        
                        // Short Tap -> Open or Close
                        let finalDirName = dirName;
                        let finalAction = exitHit.isClosed ? 'open' : 'close';

                        // --- Dynamic Direction Correction ---
                        // If the exit we clicked belongs to room A, but we are in room B (A's neighbor),
                        // we should send the command for the reciprocal direction from B.
                        if (depsRef.current.currentRoomId && exitHit.roomId !== depsRef.current.currentRoomId) {
                            const curRoom = roomsRef.current[depsRef.current.currentRoomId] || roomsRef.current[`m_${depsRef.current.currentRoomId}`];
                            if (curRoom) {
                                // Find which exit from our current room leads to the clicked room
                                const normalizedClickedId = exitHit.roomId.replace(/^m_/, '');
                                const localExitEntry = Object.entries(curRoom.exits).find(([_, ex]) => 
                                    String(ex.target || ex.gmcpDestId || "").replace(/^m_/, '') === normalizedClickedId
                                );

                                if (localExitEntry) {
                                    const [localDir] = localExitEntry;
                                    const dirMap: Record<string, string> = { 
                                        n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down',
                                        ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest'
                                    };
                                    finalDirName = dirMap[localDir] || localDir;
                                    console.log(`[MapperInteractions] Corrected direction: ${dirName} -> ${finalDirName} (via ${exitHit.roomId})`);
                                }
                            }
                        }

                        if (wasLongPress) {
                            // Long Press -> Menu
                            setPopoverState({
                                x: e.clientX,
                                y: e.clientY,
                                setId: 'doors',
                                direction: finalDirName,
                                accentColor: '#78350f' 
                            });
                        } else {
                            // Short Tap -> Open or Close
                            depsRef.current.executeCommand(`${finalAction} exit ${finalDirName}`, false, false, false, false, { fromUi: true });
                        }
                        depsRef.current.triggerHaptic(40);
                    } else if (dragTypeRef.current === 'joystick') {
                        // Priority 2: Standard Joystick Tap/Release
                        const activeHeldButton = depsRef.current.heldButtonRef?.current || depsRef.current.heldButton;
                        const resultData = joystick.handleJoystickEnd(e as any, (cmd: string) => depsRef.current.executeCommand(cmd, false, false, false, false, { fromUi: true }), triggerHaptic, !!activeHeldButton);
                        
                        const isJoyTap = resultData === true || (typeof resultData === 'object' && resultData.isCenterTap);
                        const comboDir = (typeof resultData === 'object') ? resultData.dir : null;

                        // --- TRACKPAD COMBO LOGIC (Requirements 4 & 5) ---
                        if (activeHeldButton?.dx !== undefined && !comboFiredRef.current) {
                            const button = depsRef.current.btn?.buttons?.find((b: any) => b.id === activeHeldButton.id);
                            if (button) {
                                const result = getButtonCommand(
                                    button,
                                    activeHeldButton.dx,
                                    activeHeldButton.dy,
                                    undefined,
                                    undefined,
                                    activeHeldButton.modifiers,
                                    { currentDir: comboDir, isTargetModifierActive: false },
                                    depsRef.current.target,
                                    isJoyTap
                                );
                                
                                if (result) {
                                    if (isJoyTap) {
                                        if (result.actionType === 'nav') {
                                            depsRef.current.setActiveSet(result.cmd);
                                        } else if (['assign', 'menu', 'select-assign', 'select-recipient'].includes(result.actionType || '')) {
                                            const isDial = button.menuDisplay === 'dial';
                                            const fingerX = (activeHeldButton.initialX || 0) + (activeHeldButton.dx || 0);
                                            const fingerY = (activeHeldButton.initialY || 0) + (activeHeldButton.dy || 0);

                                            let finalContext = result.modifiers || button.label;
                                            if (result.actionType === 'select-assign' && !result.modifiers && result.dir) {
                                                const swipeToDir: Record<string, string> = { up: 'north', down: 'south', left: 'west', right: 'east', ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest' };
                                                finalContext = swipeToDir[result.dir] || result.dir;
                                            }

                                            depsRef.current.setPopoverState({
                                                x: isDial ? window.innerWidth / 2 : fingerX,
                                                y: isDial ? window.innerHeight / 2 : fingerY,
                                                setId: result.cmd,
                                                context: finalContext,
                                                assignSourceId: (result.actionType === 'assign' || result.actionType === 'select-assign') ? button.id : undefined,
                                                assignSwipeDir: result.dir,
                                                executeAndAssign: result.actionType === 'select-assign' || result.actionType === 'assign',
                                                menuDisplay: button.menuDisplay,
                                                accentColor: button.style.borderColor || button.style.backgroundColor,
                                                type: result.actionType === 'select-recipient' ? 'give-recipient-select' : undefined
                                            });
                                        } else {
                                            depsRef.current.executeCommand(result.cmd, false, false, false, false, { fromUi: true });
                                        }
                                    } else if (comboDir) {
                                        depsRef.current.executeCommand(result.cmd, false, false, false, false, { fromUi: true });
                                    }
                                    depsRef.current.setHeldButton?.((prev: any) => prev ? { ...prev, didFire: true } : null);
                                    comboFiredRef.current = true;
                                    depsRef.current.triggerHaptic(60);
                                }
                            }
                        }
                    } else if (isTap && !wasLongPress) {
                        // Priority 3: Standard Room Info
                        const clickedRoomId = getRoomAt(world.x, world.y);
                        if (clickedRoomId) setInfoRoomId(clickedRoomId);
                    }
                } else if (dragTypeRef.current === 'marquee' && marqueeStart && marqueeEnd) {
                    const { screenToWorld } = hitTestRef.current;
                    const w1 = screenToWorld(marqueeStart.x, marqueeStart.y), w2 = screenToWorld(marqueeEnd.x, marqueeEnd.y);
                    const x1 = Math.min(w1.x, w2.x), y1 = Math.min(w1.y, w2.y), x2 = Math.max(w1.x, w2.x), y2 = Math.max(w1.y, w2.y);
                    const currentZ = currentRoomIdRef.current ? (roomsRef.current[currentRoomIdRef.current]?.z || 0) : 0;
                    const newSelection = new Set(e.shiftKey ? selectedRoomIdsRef.current : []);
                    Object.values(roomsRef.current).forEach(r => {
                        const rx = r.x * GRID_SIZE, ry = r.y * GRID_SIZE;
                        if (rx >= x1 - GRID_SIZE && rx <= x2 && ry >= y1 - GRID_SIZE && ry <= y2 && (r.z || 0) === currentZ) newSelection.add(r.id);
                    });
                    setSelectedRoomIds(newSelection);
                }
                if (dragTypeRef.current === 'room' && selectedRoomIdsRef.current.size > 0 && hasDraggedRef.current) {
                    setRooms(prev => {
                        const next = { ...prev };
                        selectedRoomIdsRef.current.forEach(id => { if (next[id]) next[id] = { ...next[id], x: Math.round(next[id].x), y: Math.round(next[id].y) }; });
                        return next;
                    });
                }
                if (depsRef.current.setIsTrackpadModifierActive) {
                    depsRef.current.setIsTrackpadModifierActive(false);
                }
                isDraggingInternalRef.current = false; dragTypeRef.current = null; setIsDragging(false);
                setMarqueeStart(null); setMarqueeEnd(null);
            } else if (activePointersRef.current.size === 1) {
                const pointer = remPointers[0];
                lastMouseRef.current = { x: pointer.x, y: pointer.y };
                dragTypeRef.current = 'pan';
            }
        };

        const onCancel = (e: PointerEvent) => {
            const { setIsDragging, joystick } = depsRef.current;
            activePointersRef.current.delete(e.pointerId);
            try { cvs.releasePointerCapture(e.pointerId); } catch(err) {}

            if (dragTypeRef.current === 'joystick' && joystick?.handleJoystickCancel) {
                joystick.handleJoystickCancel(e);
            }

            if (activePointersRef.current.size === 0) {
                if (depsRef.current.setIsTrackpadModifierActive) {
                    depsRef.current.setIsTrackpadModifierActive(false);
                }
                isDraggingInternalRef.current = false;
                dragTypeRef.current = null;
                setIsDragging(false);
                setMarqueeStart(null);
                setMarqueeEnd(null);
            }
        };

        cvs.addEventListener('pointerdown', onDown, { passive: false });
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onCancel, { passive: false });
        cvs.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cvs.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            cvs.removeEventListener('wheel', onWheel);
            // DO NOT clear activePointersRef or isDraggingInternal here if it's just a re-render
        };
    }, [canvasRef]); // Stable effect

    const outputMarquee = useMemo(() => ({ start: marqueeStart, end: marqueeEnd }), [marqueeStart, marqueeEnd]);

    return { marquee: outputMarquee };
};
