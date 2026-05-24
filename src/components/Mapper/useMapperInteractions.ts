import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ExecuteCommand } from '../../types';

import { MapperRoom, MapperMarker, RegionLabel } from './mapperTypes';
import { GRID_SIZE, DRAG_SENSITIVITY, ZOOM_SENSITIVITY, checkRoomFilter } from './mapperUtils';
import { useMapHitTest } from './hooks/useMapHitTest';
import { hitTestRegionLabel, hitTestRegionLabelFull } from './renderers/drawRegionLabels';
import { getButtonCommand } from '../../utils/buttonUtils';
import { fireHeldCommandAtMapOccupant } from './mapperHeldCommandTarget';
import { sanitizeGameTarget } from '../../utils/gameUtils';
import type { GmcpOccupant, GroupMember, InlineCategoryConfig } from '../../types';
import { registerOccupantTap } from './occupantAnimStore';

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
    popoverState?: any;
    setPopoverState: (val: any) => void;
    setActiveSet: (setId: string) => void;
    playClickSound?: () => void;
    characterName?: string | null;
    roomChars?: Record<number, GmcpOccupant>;
    roomPlayers?: GmcpOccupant[];
    roomNpcs?: GmcpOccupant[];
    groupMembers?: GroupMember[];
    inlineCategories?: InlineCategoryConfig[];
    playerColor?: string;
    npcColor?: string;
    activeMapFilter?: string | null;
    mapSearchQuery?: string;
    isTracingMode?: boolean;
    backgroundAlignMode?: boolean;
    calibration?: {
        bgScale: number;
        bgTranslateX: number;
        bgTranslateY: number;
        bgOpacity: number;
    };
    setCalibration?: React.Dispatch<React.SetStateAction<{
        bgScale: number;
        bgTranslateX: number;
        bgTranslateY: number;
        bgOpacity: number;
    }>>;
    onTraceClick?: (wx: number, wy: number) => void;
    onTraceHover?: (wx: number, wy: number) => void;
    regionLabels?: Record<string, RegionLabel>;
    regionLabelEditMode?: boolean;
    addRegionLabel?: (partial: Partial<RegionLabel> & { text: string; x: number; y: number; z: number }) => string;
    updateRegionLabel?: (id: string, patch: Partial<RegionLabel>) => void;
    setSelectedRegionLabelId?: (id: string | null) => void;
}

export const useMapperInteractions = (deps: InteractionDeps) => {
    const { canvasRef, cameraRef, triggerRender, rooms, markers, setRooms, setMarkers, setViewZ, onRoomClick } = deps;
    const roomCharsRef = useRef(deps.roomChars || {});
    const roomPlayersRef = useRef(deps.roomPlayers || []);
    const roomNpcsRef = useRef(deps.roomNpcs || []);
    const groupMembersRef = useRef(deps.groupMembers || []);
    const inlineCategoriesRef = useRef(deps.inlineCategories || []);
    const characterNameRef = useRef(deps.characterName || null);
    const playerColorRef = useRef(deps.playerColor);
    const npcColorRef = useRef(deps.npcColor);

    const hitTest = useMapHitTest({
        canvasRef, cameraRef, roomsRef: { current: rooms } as any, markersRef: { current: markers } as any,
        currentRoomIdRef: { current: deps.currentRoomId } as any,
        viewZ: deps.viewZ,
        spatialIndexRef: deps.spatialIndexRef,
        preloadedCoordsRef: deps.preloadedCoordsRef,
        roomCharsRef,
        roomPlayersRef,
        roomNpcsRef,
        groupMembersRef,
        inlineCategoriesRef,
        characterNameRef,
        playerColorRef,
        npcColorRef
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
    const dragTypeRef = useRef<'pan' | 'room' | 'marker' | 'marquee' | 'joystick' | 'region-label' | 'background-align' | null>(null);
    const draggedMarkerRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const markersRefLocal = useRef(deps.markers);
    useEffect(() => { markersRefLocal.current = deps.markers; }, [deps.markers]);

    const draggedRegionLabelRef = useRef<{
        id: string;
        mode: 'move' | 'resize' | 'rotate';
        // move
        offsetX: number;
        offsetY: number;
        // resize / rotate
        centerWX: number;          // world px
        centerWY: number;
        initialFontSize: number;
        initialRotation: number;
        initialAngle: number;      // angle from center to grab point at start (radians)
        initialDist: number;       // distance center → grab point at start (world px)
    } | null>(null);
    const isDraggingInternalRef = useRef(false);
    const scrollLockRef = useRef(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const contextMenuTriggeredRef = useRef(false);
    const startMarkerPosRef = useRef({ x: 0, y: 0 });
    const comboFiredRef = useRef(false);
    const ignoredPointerUpsRef = useRef<Set<number>>(new Set());
    const mapLookActivatedRef = useRef(false);

    // Stable ref for event listeners to avoid re-binding
    const depsRef = useRef(deps);
    useEffect(() => { depsRef.current = deps; }, [deps]);

    const clearMapLongPressHold = useCallback(() => {
        if (depsRef.current.heldButtonRef?.current?.id === 'map-long-press') {
            depsRef.current.heldButtonRef.current = null;
        }
        depsRef.current.setHeldButton?.((prev: any) => prev?.id === 'map-long-press' ? null : prev);
    }, []);

    const resetMapLookGestureState = useCallback(() => {
        clearMapLongPressHold();
        depsRef.current.joystick?.stopRepeatTimer?.();
        depsRef.current.joystick?.handleJoystickCancel?.();
        depsRef.current.joystick?.setIsJoystickConsumed?.(false);
        if (depsRef.current.setIsTrackpadModifierActive) {
            depsRef.current.setIsTrackpadModifierActive(false);
        }
        contextMenuTriggeredRef.current = false;
        comboFiredRef.current = false;
        mapLookActivatedRef.current = false;
        isDraggingInternalRef.current = false;
        dragTypeRef.current = null;
        depsRef.current.setIsDragging(false);
        setMarqueeStart(null);
        setMarqueeEnd(null);
    }, [clearMapLongPressHold]);

    const fireMapLongPressAtLogTarget = useCallback((e: PointerEvent) => {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const targetEl = element instanceof HTMLElement
            ? element.closest('.inline-btn') as HTMLElement | null
            : null;

        if (!targetEl || targetEl.getAttribute('data-targetable') === 'false') return false;

        const rawContext = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
        const context = sanitizeGameTarget(rawContext) || rawContext;
        if (!context) return false;

        depsRef.current.executeCommand(`look ${context}`, false, false, false, false, { fromUi: true });
        targetEl.classList.add('pressed');
        setTimeout(() => targetEl.classList.remove('pressed'), 350);
        resetMapLookGestureState();
        depsRef.current.playClickSound?.();
        return true;
    }, [resetMapLookGestureState]);

    const fireMapLongPressAtPointer = useCallback((e: PointerEvent) => {
        const activeHeld = depsRef.current.heldButtonRef?.current || depsRef.current.heldButton;
        if (activeHeld?.id !== 'map-long-press') return false;
        if (activeHeld.lastTargetFireAt && Date.now() - activeHeld.lastTargetFireAt < 800) {
            resetMapLookGestureState();
            return true;
        }

        if (fireMapLongPressAtLogTarget(e)) return true;

        const { screenToWorld, getExitAt, getOccupantAt } = hitTestRef.current;
        const world = screenToWorld(e.clientX, e.clientY);
        const exitHit = getExitAt?.(world.x, world.y);

        if (exitHit) {
            const directions: Record<string, string> = {
                n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down'
            };
            const dirName = directions[exitHit.direction] || exitHit.direction;
            const doorTarget = {
                commandTarget: `exit ${dirName}`,
                name: `exit ${dirName}`,
                kind: 'door',
                category: 'doors'
            } as any;

            if (fireHeldCommandAtMapOccupant(depsRef.current, doorTarget)) {
                resetMapLookGestureState();
                depsRef.current.triggerRender();
                return true;
            }
        }

        const occupantHit = getOccupantAt?.(world.x, world.y);
        if (!occupantHit) return false;

        if (fireHeldCommandAtMapOccupant(depsRef.current, occupantHit)) {
            registerOccupantTap(occupantHit.id, occupantHit.name, occupantHit.kind === 'player');
            resetMapLookGestureState();
            depsRef.current.triggerRender();
            return true;
        }

        return false;
    }, [fireMapLongPressAtLogTarget, resetMapLookGestureState]);

    const selectedRoomIdsRef = useRef(deps.selectedRoomIds);
    useEffect(() => { selectedRoomIdsRef.current = deps.selectedRoomIds; }, [deps.selectedRoomIds]);

    const roomsRef = useRef(rooms);
    useEffect(() => { roomsRef.current = rooms; }, [rooms]);

    const currentRoomIdRef = useRef(deps.currentRoomId);
    useEffect(() => { currentRoomIdRef.current = deps.currentRoomId; }, [deps.currentRoomId]);

    useEffect(() => { roomCharsRef.current = deps.roomChars || {}; }, [deps.roomChars]);
    useEffect(() => { roomPlayersRef.current = deps.roomPlayers || []; }, [deps.roomPlayers]);
    useEffect(() => { roomNpcsRef.current = deps.roomNpcs || []; }, [deps.roomNpcs]);
    useEffect(() => { groupMembersRef.current = deps.groupMembers || []; }, [deps.groupMembers]);
    useEffect(() => { inlineCategoriesRef.current = deps.inlineCategories || []; }, [deps.inlineCategories]);
    useEffect(() => { characterNameRef.current = deps.characterName || null; }, [deps.characterName]);
    useEffect(() => { playerColorRef.current = deps.playerColor; }, [deps.playerColor]);
    useEffect(() => { npcColorRef.current = deps.npcColor; }, [deps.npcColor]);

    const onWheel = useCallback((e: WheelEvent) => {
        // IGNORE zoom if a window drag is in progress
        if (document.body.classList.contains('global-dragging')) return;

        e.preventDefault();

        if (depsRef.current.isTracingMode && e.ctrlKey && depsRef.current.setCalibration) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const cam = cameraRef.current;
            const worldX = cam.x + mx / cam.zoom;
            const worldY = cam.y + my / cam.zoom;
            const visualScaleFactor = Math.pow(1.1, e.deltaY / 100);

            depsRef.current.setCalibration(prev => {
                const oldScale = prev.bgScale || 1;
                const nextScale = Math.max(0.05, Math.min(80, oldScale * visualScaleFactor));
                const px = (worldX - prev.bgTranslateX) / oldScale;
                const py = (worldY - prev.bgTranslateY) / oldScale;
                return {
                    ...prev,
                    bgScale: nextScale,
                    bgTranslateX: worldX - px * nextScale,
                    bgTranslateY: worldY - py * nextScale
                };
            });
            triggerRender();
            return;
        }
        
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
        // console.log(`[MapperInteractions] Wheel: deltaX=${e.deltaX} deltaY=${e.deltaY}`);
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
            // console.log(`[useMapperInteractions] onDown: id=${e.pointerId}, size=${activePointersRef.current.size}, target=${(e.target as HTMLElement).className}`);

            if (activePointersRef.current.size === 1) {
                const { mode, setSelectedRoomIds } = depsRef.current;
                startMouseRef.current = { x: e.clientX, y: e.clientY };
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
                startTimeRef.current = Date.now();
                hasDraggedRef.current = false;
                dragTypeRef.current = 'room';
                contextMenuTriggeredRef.current = false;
                mapLookActivatedRef.current = false;
                // console.log(`[MapperInteractions] PointerDown: ${e.pointerType} x=${e.clientX} y=${e.clientY}`);

                if (depsRef.current.isTracingMode && e.ctrlKey && depsRef.current.setCalibration) {
                    dragTypeRef.current = 'background-align';
                    depsRef.current.setIsDragging(true);
                    isDraggingInternalRef.current = true;
                    depsRef.current.triggerRender();
                    return;
                }

                const { screenToWorld, getRoomAt, getMarkerAt } = hitTestRef.current;
                const world = screenToWorld(e.clientX, e.clientY);

                const roomId = getRoomAt(world.x, world.y);
                const markerId = getMarkerAt(world.x, world.y);

                // Region-label edit mode: if we hit a label (body OR handle), take over the pointer.
                // Empty-space clicks fall through to the normal pan/joystick handling so the
                // map can still be navigated; the onUp handler turns a tap-on-empty into a drop.
                if (depsRef.current.regionLabelEditMode) {
                    const labels = depsRef.current.regionLabels || {};
                    const tileX = world.x / GRID_SIZE;
                    const tileY = world.y / GRID_SIZE;
                    const layerZ = depsRef.current.viewZ !== null && depsRef.current.viewZ !== undefined
                        ? depsRef.current.viewZ
                        : (depsRef.current.currentRoomId
                            ? (depsRef.current.rooms[depsRef.current.currentRoomId]?.z || 0)
                            : 0);
                    const measureCtx = cvs.getContext('2d');
                    const invZoom = 1 / cameraRef.current.zoom;
                    const hit = measureCtx ? hitTestRegionLabelFull(labels, tileX, tileY, layerZ, measureCtx, invZoom, true) : null;
                    if (hit) {
                        const label = labels[hit.id];
                        const grabPx = world.x;
                        const grabPy = world.y;
                        const dxw = grabPx - hit.geometry.cx;
                        const dyw = grabPy - hit.geometry.cy;
                        draggedRegionLabelRef.current = {
                            id: hit.id,
                            mode: hit.mode,
                            offsetX: label.x - tileX,
                            offsetY: label.y - tileY,
                            centerWX: hit.geometry.cx,
                            centerWY: hit.geometry.cy,
                            initialFontSize: label.fontSize,
                            initialRotation: label.rotation || 0,
                            initialAngle: Math.atan2(dyw, dxw),
                            initialDist: Math.sqrt(dxw * dxw + dyw * dyw) || 1
                        };
                        dragTypeRef.current = 'region-label';
                        depsRef.current.setSelectedRegionLabelId?.(hit.id);
                        return;
                    }
                }

                if (mode === 'edit') {
                    if (markerId) {
                        const marker = markersRefLocal.current[markerId];
                        if (marker) {
                            const { screenToWorld } = hitTestRef.current;
                            const world = screenToWorld(e.clientX, e.clientY);
                            const tileX = world.x / GRID_SIZE;
                            const tileY = world.y / GRID_SIZE;
                            draggedMarkerRef.current = { id: markerId, offsetX: marker.x - tileX, offsetY: marker.y - tileY };
                            dragTypeRef.current = 'marker';
                            depsRef.current.setSelectedMarkerId?.(markerId);
                        }
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
                        const { triggerHaptic, setHeldButton, joystick } = depsRef.current;
                        if (mapLookActivatedRef.current) return;
                        mapLookActivatedRef.current = true;
                        triggerHaptic(40);
                        contextMenuTriggeredRef.current = true;
                        joystick?.stopRepeatTimer?.();
                        joystick?.handleJoystickCancel?.();
                        joystick?.setIsJoystickConsumed?.(false);

                        // --- Map Long-Press: Enter look-targeting mode ---
                        // Sets heldButton so the app gains tactical-targeting-active CSS class,
                        // giving targeting borders to all inline log buttons, map occupants,
                        // and door buttons. Tapping any of those fires 'look <target>'.
                        // Releasing over empty space fires plain 'look' (handled in onUp).
                        if (setHeldButton) {
                            setHeldButton({
                                id: 'map-long-press',
                                baseCommand: 'look',
                                modifiers: [],
                                dx: 0,
                                dy: 0,
                                didFire: false,
                                commandPrefixes: []
                            });
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
                    if (dragTypeRef.current === 'marker' && draggedMarkerRef.current) {
                        const { screenToWorld } = hitTestRef.current;
                        const world = screenToWorld(p.x, p.y);
                        const tileX = world.x / GRID_SIZE;
                        const tileY = world.y / GRID_SIZE;
                        const { id, offsetX, offsetY } = draggedMarkerRef.current;
                        depsRef.current.setMarkers((prev: any) => ({
                            ...prev,
                            [id]: { ...prev[id], x: tileX + offsetX, y: tileY + offsetY }
                        }));
                        triggerRender();
                    } else if (dragTypeRef.current === 'region-label' && draggedRegionLabelRef.current) {
                        const { screenToWorld } = hitTestRef.current;
                        const world = screenToWorld(p.x, p.y);
                        const grab = draggedRegionLabelRef.current;
                        if (grab.mode === 'move') {
                            const tileX = world.x / GRID_SIZE;
                            const tileY = world.y / GRID_SIZE;
                            depsRef.current.updateRegionLabel?.(grab.id, { x: tileX + grab.offsetX, y: tileY + grab.offsetY });
                        } else if (grab.mode === 'resize') {
                            const dxw = world.x - grab.centerWX;
                            const dyw = world.y - grab.centerWY;
                            const dist = Math.sqrt(dxw * dxw + dyw * dyw) || 1;
                            const ratio = dist / grab.initialDist;
                            const newFontSize = Math.max(10, Math.min(800, grab.initialFontSize * ratio));
                            depsRef.current.updateRegionLabel?.(grab.id, { fontSize: newFontSize });
                        } else if (grab.mode === 'rotate') {
                            const dxw = world.x - grab.centerWX;
                            const dyw = world.y - grab.centerWY;
                            const angle = Math.atan2(dyw, dxw);
                            const deltaAngle = angle - grab.initialAngle;
                            let newRot = grab.initialRotation + deltaAngle;
                            // Normalize to [-PI, PI]
                            while (newRot > Math.PI) newRot -= Math.PI * 2;
                            while (newRot < -Math.PI) newRot += Math.PI * 2;
                            depsRef.current.updateRegionLabel?.(grab.id, { rotation: newRot });
                        }
                        triggerRender();
                    } else if (dragTypeRef.current === 'joystick') {
                        const { joystick, executeCommand, heldButton, setHeldButton, btn, target, triggerHaptic } = depsRef.current;
                        if (joystick?.handleJoystickMove) {
                            // If the trackpad look-modifier fired (long press), we're in "look mode".
                            // Stop any pending repeat-move timer so its haptic(10) doesn't double up
                            // with the look-activation haptic(40) as the user moves toward an inline button.
                            if (contextMenuTriggeredRef.current && joystick.stopRepeatTimer) {
                                joystick.stopRepeatTimer();
                            }
                            const dir = joystick.handleJoystickMove(e, executeCommand, !!heldButton);
                            // if (dir) console.log(`[MapperInteractions] Joystick Dir: ${dir}`);
                        }
                    } else if (dragTypeRef.current === 'background-align') {
                        const cam = cameraRef.current;
                        depsRef.current.setCalibration?.(prev => ({
                            ...prev,
                            bgTranslateX: prev.bgTranslateX - dx / cam.zoom,
                            bgTranslateY: prev.bgTranslateY - dy / cam.zoom
                        }));
                        triggerRender();
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

            if (!activePointersRef.current.has(e.pointerId)) {
                if (ignoredPointerUpsRef.current.has(e.pointerId)) {
                    ignoredPointerUpsRef.current.delete(e.pointerId);
                    try { cvs.releasePointerCapture(e.pointerId); } catch(err) {}
                }
                // Pointer never started on the canvas — leave it to whatever owns it
                // (popover buttons, action buttons, etc). Otherwise stale dragTypeRef
                // state from a prior canvas tap can spuriously close popovers.
                return;
            }

            if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            
            // Capture the fired state before resetting it
            const wasLongPress = contextMenuTriggeredRef.current;
            contextMenuTriggeredRef.current = false;
            mapLookActivatedRef.current = false;
            comboFiredRef.current = false;
            scrollLockRef.current = false;
            activePointersRef.current.delete(e.pointerId);
            try { cvs.releasePointerCapture(e.pointerId); } catch(err) {}

            if (fireMapLongPressAtPointer(e)) {
                for (const pointerId of activePointersRef.current.keys()) {
                    ignoredPointerUpsRef.current.add(pointerId);
                    try { cvs.releasePointerCapture(pointerId); } catch(err) {}
                }
                activePointersRef.current.clear();
                lastPointersRef.current = [];
                contextMenuTriggeredRef.current = false;
                mapLookActivatedRef.current = false;
                comboFiredRef.current = false;
                if (dragTypeRef.current === 'joystick' && joystick?.handleJoystickCancel) {
                    joystick.handleJoystickCancel(e as any);
                }
                if (depsRef.current.setIsTrackpadModifierActive) {
                    depsRef.current.setIsTrackpadModifierActive(false);
                }
                isDraggingInternalRef.current = false;
                dragTypeRef.current = null;
                setIsDragging(false);
                setMarqueeStart(null);
                setMarqueeEnd(null);
                return;
            }
            
            const remPointers = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b).map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = remPointers;

            if (activePointersRef.current.size === 0) {
                if (mode === 'play') {
                    stopWalking();
                }

                const activeLPHeld = depsRef.current.heldButtonRef?.current || depsRef.current.heldButton;
                const isMapLongPress = activeLPHeld?.id === 'map-long-press' && wasLongPress;
                let didHandleMapLongPressRelease = false;

                // Region-label edit mode is handled separately from play/edit logic.
                // dragTypeRef === 'region-label' is set in onDown whenever edit mode is on.
                if (dragTypeRef.current === 'region-label') {
                    const isTap = !hasDraggedRef.current;
                    if (isTap) {
                        const { screenToWorld } = hitTestRef.current;
                        const world = screenToWorld(e.clientX, e.clientY);
                        const labels = depsRef.current.regionLabels || {};
                        const tileX = world.x / GRID_SIZE;
                        const tileY = world.y / GRID_SIZE;
                        const layerZ = depsRef.current.viewZ !== null && depsRef.current.viewZ !== undefined
                            ? depsRef.current.viewZ
                            : (depsRef.current.currentRoomId
                                ? (depsRef.current.rooms[depsRef.current.currentRoomId]?.z || 0)
                                : 0);
                        const measureCtx = cvs.getContext('2d');
                        const hitId = measureCtx ? hitTestRegionLabel(labels, tileX, tileY, layerZ, measureCtx) : null;
                        if (hitId) {
                            depsRef.current.setSelectedRegionLabelId?.(hitId);
                        } else {
                            const text = window.prompt('Region label text (e.g. "Mordor"):')?.trim();
                            if (text && depsRef.current.addRegionLabel) {
                                const newId = depsRef.current.addRegionLabel({ text, x: tileX, y: tileY, z: layerZ, fontSize: 80 });
                                depsRef.current.setSelectedRegionLabelId?.(newId);
                            }
                        }
                    }
                    draggedRegionLabelRef.current = null;
                    draggedMarkerRef.current = null;
                    isDraggingInternalRef.current = false;
                    dragTypeRef.current = null;
                    setIsDragging(false);
                    triggerRender();
                    return;
                }

                if (dragTypeRef.current === 'joystick' || dragTypeRef.current === 'room' || dragTypeRef.current === 'pan') {
                    const isTap = !hasDraggedRef.current;

                    if (isTap && depsRef.current.popoverState && !isMapLongPress) {
                        depsRef.current.setPopoverState(null);
                        if (dragTypeRef.current === 'joystick' && depsRef.current.joystick?.handleJoystickCancel) {
                            depsRef.current.joystick.handleJoystickCancel(e as any);
                        }
                        if (depsRef.current.setIsTrackpadModifierActive) depsRef.current.setIsTrackpadModifierActive(false);
                        isDraggingInternalRef.current = false; dragTypeRef.current = null; setIsDragging(false);
                        return;
                    }

                    const { screenToWorld, getRoomAt, getExitAt, getOccupantAt } = hitTestRef.current;
                    const world = screenToWorld(e.clientX, e.clientY);

                    // Region-label edit mode: tap on empty space drops a new label.
                    // (Tap on existing label takes the 'region-label' branch above.)
                    if (isTap && depsRef.current.regionLabelEditMode) {
                        const tileX = world.x / GRID_SIZE;
                        const tileY = world.y / GRID_SIZE;
                        const layerZ = depsRef.current.viewZ !== null && depsRef.current.viewZ !== undefined
                            ? depsRef.current.viewZ
                            : (depsRef.current.currentRoomId
                                ? (depsRef.current.rooms[depsRef.current.currentRoomId]?.z || 0)
                                : 0);
                        const text = window.prompt('Region label text (e.g. "Mordor"):')?.trim();
                        if (text && depsRef.current.addRegionLabel) {
                            const newId = depsRef.current.addRegionLabel({ text, x: tileX, y: tileY, z: layerZ, fontSize: 80 });
                            depsRef.current.setSelectedRegionLabelId?.(newId);
                        }
                        if (dragTypeRef.current === 'joystick' && depsRef.current.joystick?.handleJoystickCancel) {
                            depsRef.current.joystick.handleJoystickCancel(e as any);
                        }
                        if (depsRef.current.setIsTrackpadModifierActive) depsRef.current.setIsTrackpadModifierActive(false);
                        isDraggingInternalRef.current = false;
                        dragTypeRef.current = null;
                        setIsDragging(false);
                        triggerRender();
                        return;
                    }

                    if (isMapLongPress) {
                        didHandleMapLongPressRelease = fireMapLongPressAtLogTarget(e);
                    }

                    // Priority 1: Check for Exit/Door Click (on ANY tap)
                    const exitHit = !didHandleMapLongPressRelease && isTap ? getExitAt?.(world.x, world.y) : null;

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
                                    // console.log(`[MapperInteractions] Corrected direction: ${dirName} -> ${finalDirName} (via ${exitHit.roomId})`);
                                }
                            }
                        }

                        if (isMapLongPress) {
                            const doorTarget = {
                                commandTarget: `exit ${finalDirName}`,
                                name: `exit ${finalDirName}`,
                                kind: 'door',
                                category: 'doors'
                            } as any;

                            didHandleMapLongPressRelease = fireHeldCommandAtMapOccupant(depsRef.current, doorTarget);
                            depsRef.current.triggerRender();
                        } else if (wasLongPress && mode === 'edit') {
                            setPopoverState({
                                x: e.clientX,
                                y: e.clientY,
                                setId: 'doors',
                                direction: finalDirName,
                                accentColor: '#78350f' 
                            });
                        } else {
                            // Short Tap -> Open or Close
                            const activeHeldButton = depsRef.current.heldButtonRef?.current || depsRef.current.heldButton;
                            if (activeHeldButton && !activeHeldButton.didFire && !activeHeldButton.id?.startsWith('log-inline-')) {
                                const doorTarget = {
                                    commandTarget: `exit ${finalDirName}`,
                                    name: `exit ${finalDirName}`,
                                    kind: 'door',
                                    category: 'doors'
                                } as any;

                                if (fireHeldCommandAtMapOccupant(depsRef.current, doorTarget)) {
                                    depsRef.current.triggerRender();
                                    return;
                                }
                            }

                            // Short Tap -> Open or Close
                            depsRef.current.executeCommand(`${finalAction} exit ${finalDirName}`, false, false, false, false, { fromUi: true });
                            depsRef.current.playClickSound?.();
                        }
                        if (!isMapLongPress) depsRef.current.triggerHaptic(40);
                    } else if (!didHandleMapLongPressRelease) {
                        const occupantHit = isTap ? getOccupantAt?.(world.x, world.y) : null;
                        if (occupantHit) {
                            if (dragTypeRef.current === 'joystick' && depsRef.current.joystick?.handleJoystickCancel) {
                                depsRef.current.joystick.handleJoystickCancel(e as any);
                            }

                            if (fireHeldCommandAtMapOccupant(depsRef.current, occupantHit)) {
                                registerOccupantTap(occupantHit.id, occupantHit.name, occupantHit.kind === 'player');
                                depsRef.current.triggerRender();
                                if (isMapLongPress) {
                                    didHandleMapLongPressRelease = true;
                                } else {
                                    return;
                                }
                            } else {
                                registerOccupantTap(occupantHit.id, occupantHit.name, occupantHit.kind === 'player');
                                depsRef.current.triggerRender();

                                const entityId = occupantHit.id !== undefined
                                    ? `roomchars:${occupantHit.id}`
                                    : `map-${occupantHit.kind}:${occupantHit.name.toLowerCase()}`;

                                depsRef.current.setPopoverState({
                                    x: e.clientX,
                                    y: e.clientY,
                                    setId: occupantHit.category,
                                    kind: occupantHit.kind,
                                    location: 'room',
                                    category: occupantHit.category,
                                    context: occupantHit.commandTarget || occupantHit.name,
                                    entityId,
                                    menuDisplay: 'list',
                                    accentColor: occupantHit.color
                                });
                                depsRef.current.playClickSound?.();
                                depsRef.current.triggerHaptic(40);
                                return;
                            }
                        }

                        const clickedRoomId = isTap ? getRoomAt(world.x, world.y) : null;
                        if (clickedRoomId && depsRef.current.activeMapFilter) {
                            const rawRoomId = clickedRoomId.replace(/^m_/, '');
                            const localRoom = roomsRef.current[clickedRoomId] || roomsRef.current[`m_${rawRoomId}`] || roomsRef.current[rawRoomId];
                            const preloadedRoom = depsRef.current.preloadedCoordsRef.current?.[rawRoomId];
                            const isFilteredRoom = checkRoomFilter(
                                clickedRoomId,
                                localRoom,
                                preloadedRoom,
                                depsRef.current.activeMapFilter,
                                depsRef.current.mapSearchQuery || ''
                            );

                            if (isFilteredRoom) {
                                const containerRect = depsRef.current.canvasRef.current?.parentElement?.getBoundingClientRect();
                                const localX = containerRect ? e.clientX - containerRect.left : e.clientX;
                                const localY = containerRect ? e.clientY - containerRect.top : e.clientY;
                                const menuWidth = 176;
                                const menuHeight = depsRef.current.mode === 'edit' ? 194 : 108;
                                const maxX = Math.max(8, (containerRect?.width || window.innerWidth) - menuWidth - 8);
                                const maxY = Math.max(8, (containerRect?.height || window.innerHeight) - menuHeight - 8);

                                depsRef.current.setContextMenu({
                                    x: Math.min(Math.max(localX, 8), maxX),
                                    y: Math.min(Math.max(localY, 8), maxY),
                                    wx: Math.round(world.x / GRID_SIZE),
                                    wy: Math.round(world.y / GRID_SIZE),
                                    roomId: clickedRoomId
                                });
                                depsRef.current.playClickSound?.();
                                depsRef.current.triggerHaptic(40);
                                return;
                            }
                        }
                    }

                    if (!exitHit && !didHandleMapLongPressRelease && !isMapLongPress && dragTypeRef.current === 'joystick') {
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
                                    isJoyTap,
                                    activeHeldButton.commandPrefixes || []
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
                                                executeAndAssign: result.actionType === 'select-assign',
                                                menuDisplay: button.menuDisplay,
                                                accentColor: button.style.borderColor || button.style.backgroundColor,
                                                type: result.actionType === 'select-recipient' ? 'give-recipient-select' : undefined
                                            });
                                        } else {
                                            depsRef.current.executeCommand(result.cmd, false, false, false, false, { fromUi: true });
                                            depsRef.current.playClickSound?.();
                                        }
                                    } else if (comboDir) {
                                        depsRef.current.executeCommand(result.cmd, false, false, false, false, { fromUi: true });
                                        depsRef.current.playClickSound?.();
                                    }
                                    depsRef.current.setHeldButton?.((prev: any) => prev ? { ...prev, lastTargetFireAt: Date.now() } : null);
                                    comboFiredRef.current = true;
                                    depsRef.current.triggerHaptic(60);
                                }
                            }
                        }
                    } else if (depsRef.current.isTracingMode && isTap) {
                        depsRef.current.onTraceClick?.(world.x, world.y);
                    } else if (!exitHit && isTap && !wasLongPress && mode === 'edit') {
                        // Priority 3: Standard Room Info
                        const clickedRoomId = getRoomAt(world.x, world.y);
                        if (clickedRoomId) {
                            setInfoRoomId(clickedRoomId);
                            depsRef.current.playClickSound?.();
                        }
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
                if (isMapLongPress) {
                    const latestHeld = depsRef.current.heldButtonRef?.current || depsRef.current.heldButton;
                    if (!didHandleMapLongPressRelease && !latestHeld?.didFire) {
                        depsRef.current.executeCommand('look', false, false, false, false, { fromUi: true });
                        depsRef.current.playClickSound?.();
                    }
                    resetMapLookGestureState();
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
                // Cancel map long-press targeting mode without firing any command
                clearMapLongPressHold();
                contextMenuTriggeredRef.current = false;
                mapLookActivatedRef.current = false;
                isDraggingInternalRef.current = false;
                dragTypeRef.current = null;
                setIsDragging(false);
                setMarqueeStart(null);
                setMarqueeEnd(null);
            }
        };

        const onHover = (e: PointerEvent) => {
            if (depsRef.current.isTracingMode) {
                const { screenToWorld } = hitTestRef.current;
                const world = screenToWorld(e.clientX, e.clientY);
                depsRef.current.onTraceHover?.(world.x, world.y);
            }
        };

        cvs.addEventListener('pointerdown', onDown, { passive: false });
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onCancel, { passive: false });
        cvs.addEventListener('wheel', onWheel, { passive: false });
        cvs.addEventListener('pointermove', onHover, { passive: true });

        return () => {
            cvs.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            cvs.removeEventListener('wheel', onWheel);
            cvs.removeEventListener('pointermove', onHover);
            // DO NOT clear activePointersRef or isDraggingInternal here if it's just a re-render
        };
    }, [canvasRef]); // Stable effect

    const outputMarquee = useMemo(() => ({ start: marqueeStart, end: marqueeEnd }), [marqueeStart, marqueeEnd]);

    return { marquee: outputMarquee };
};
