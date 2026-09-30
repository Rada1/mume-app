/**
 * @file Performance Mode canvas bridge to the worker-owned WebGL2 map.
 */
// --- Logic Section ---

import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MapCanvasProps } from '../MapCanvas';
import { perfMonitor } from '../../../utils/perfMonitor';
import { FastMapWorkerClient } from './client';
import { centerPixelCameraOnRoom, mapWheelTarget, snapPixelCamera } from './cameraAdapter';
import { adaptMumeMap } from './mapAdapter';
import { adaptWebCockpitMap } from './adaptWebCockpitMap';
import { labelsFrom } from './canvasDataAdapters';
import { clearFastMapMetrics, setFastMapMetrics } from './fastMapTelemetry';
import { gmcpBus } from '../../../events/gmcpBus';
import { useModeStore } from '../../../stores/useModeStore';
import { DEFAULT_MAP_BACKGROUND, readMapBackground } from './mapBackground';
import { applyDoorCommandToSnapshot, createDoorStateSnapshot, updateDoorStateSnapshot, type DoorStateSnapshot } from './doorStateAdapter';
import { buildSearchOverlay } from './searchOverlayAdapter';
import { FastMapGroupMemberSync } from './FastMapGroupMemberSync';
import type { DoorCommandUpdate } from '../doorCommand';
import { sendFastMapExploration, sendFastMapFrame } from './sendFastMapFrame';

interface FastMapCanvasProps {
  mapProps: MapCanvasProps;
  transparentBackground: boolean;
  onFallback: (reason: string) => void;
}

type CameraState = Parameters<typeof snapPixelCamera>[0];

export const FastMapCanvas = React.memo(forwardRef<HTMLCanvasElement, FastMapCanvasProps>((props, forwardedRef) => {
  const activeView = useModeStore(state => state.activeView);
  const [workerReady, setWorkerReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (forwardedRef as React.RefObject<HTMLCanvasElement>) || internalRef;
  const clientRef = useRef<FastMapWorkerClient | null>(null);
  const didInitialCenterRef = useRef(false);
  const sourceRef = useRef<{ tuples: object; canonical: object | null; revision: number } | null>(null);
  const doorStateRef = useRef<DoorStateSnapshot | null>(null);
  const labelSourceRef = useRef<{ labels: object; regionLabels: object | null } | null>(null);
  const lastRoomIdRef = useRef<string | null>(null);
  const fallbackRef = useRef(props.onFallback);
  const mapPropsRef = useRef(props.mapProps);
  const backgroundRef = useRef(DEFAULT_MAP_BACKGROUND);
  fallbackRef.current = props.onFallback;
  mapPropsRef.current = props.mapProps;

  const sendLatestFrame = useCallback((doorOverride?: DoorCommandUpdate) => {
    sendFastMapFrame(mapPropsRef.current, canvasRef.current, clientRef.current, backgroundRef.current, doorOverride);
  }, []);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const measure = () => {
      const width = Math.max(1, Math.round(parent.clientWidth));
      const height = Math.max(1, Math.round(parent.clientHeight));
      // One device pixel per CSS pixel is intentional in Performance Mode.
      const current = mapPropsRef.current;
      backgroundRef.current = readMapBackground(canvas);
      if (current.autoCenter && current.playerPosRef.current) {
        const camera = current.camera.current as CameraState;
        snapPixelCamera(camera);
        centerPixelCameraOnRoom(camera, current.playerPosRef.current, width, height, mapWheelTarget(canvas, width, height));
      }
      if (!clientRef.current) {
        canvas.width = width;
        canvas.height = height;
        try {
          clientRef.current = new FastMapWorkerClient(canvas, event => {
            if (event.type === 'ready') setWorkerReady(true);
            if (event.type === 'map-loaded') setMapLoaded(true);
            if (event.type === 'metrics') setFastMapMetrics(event.stats);
            if (event.type === 'location') {
              const id = event.roomId.startsWith('m_') ? event.roomId : `m_${event.roomId}`;
              clientRef.current?.visitRoom(id);
              mapPropsRef.current.onPlayerRoom?.(id);
            }
          }, reason => fallbackRef.current(reason), props.transparentBackground);
        } catch (error) {
          fallbackRef.current(error instanceof Error ? error.message : String(error));
          return;
        }
      }
      clientRef.current.resize(width, height, 1);
      sendLatestFrame();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    measure();
    return () => {
      observer.disconnect();
      clientRef.current?.dispose();
      clientRef.current = null;
      sourceRef.current = null;
      doorStateRef.current = null;
      clearFastMapMetrics();
    };
  }, [canvasRef, sendLatestFrame]);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    backgroundRef.current = readMapBackground(canvas);
    sendLatestFrame();
  }, [canvasRef, props.mapProps.isDarkMode, sendLatestFrame]);

  useEffect(() => {
    const unsubscribeMoved = gmcpBus.on('Event.Moved', data => {
      const spectating = typeof data === 'object' && data !== null && 'spectating' in data
        ? (data as { spectating?: unknown }).spectating === true
        : false;
      if (spectating !== (activeView === 'target')) return;
      clientRef.current?.sendGameEvent({ kind: 'moved', data });
    });
    const unsubscribeRoom = gmcpBus.on('Room.Info', data => {
      if ((data.spectating === true) !== (activeView === 'target')) return;
      clientRef.current?.sendGameEvent({ kind: 'room-info', data });
    });
    return () => {
      unsubscribeMoved();
      unsubscribeRoom();
    };
  }, [activeView]);

  useEffect(() => {
    const onDoorCommand = (event: Event) => {
      const update = (event as CustomEvent<DoorCommandUpdate>).detail;
      if (!update) return;
      const roomId = update.roomId ?? mapPropsRef.current.currentRoomId;
      if (roomId && doorStateRef.current) {
        const changes = applyDoorCommandToSnapshot(doorStateRef.current, roomId, update.direction, update.closed);
        if (changes.length) clientRef.current?.setDoorStates(changes);
      }
      sendLatestFrame(update);
    };

    window.addEventListener('mume-door-command-sent', onDoorCommand);
    return () => window.removeEventListener('mume-door-command-sent', onDoorCommand);
  }, [sendLatestFrame]);

  useEffect(() => {
    const tryLoadMap = (): boolean => {
      const source = props.mapProps.preloadedCoordsRef.current as Readonly<Record<string, readonly unknown[]>>;
      const canonical = props.mapProps.performanceMapRef?.current ?? null;
      const labels = props.mapProps.markers;
      const regionLabels = props.mapProps.regionLabels ?? null;
      const revision = props.mapProps.performanceMapRevision ?? 0;
      const loaded = sourceRef.current;
      const labelsChanged = labelSourceRef.current?.labels !== labels || labelSourceRef.current?.regionLabels !== regionLabels;
      if (loaded?.tuples === source && loaded.canonical === canonical && loaded.revision === revision) {
        if (doorStateRef.current) {
          const changes = updateDoorStateSnapshot(doorStateRef.current, props.mapProps.rooms, source, props.mapProps.currentRoomId);
          if (changes.length) clientRef.current?.setDoorStates(changes);
        }
        if (labelsChanged) {
          clientRef.current?.setLabels([...labelsFrom(labels, { fontSizeScale: 1.8, markerStyle: true, excludeIdPrefix: canonical ? 'mm2_' : undefined }), ...labelsFrom(regionLabels)]);
          labelSourceRef.current = { labels, regionLabels };
        }
        sendLatestFrame();
        return true;
      }
      if (!canonical && Object.keys(source).length === 0) return false;
      try {
        const adapted = canonical ? adaptWebCockpitMap(canonical) : adaptMumeMap(source);
        const doors = createDoorStateSnapshot(adapted.map, props.mapProps.rooms, source);
        adapted.map.doorOpen?.set(doors.open);
        doorStateRef.current = doors;
        setMapLoaded(false);
        clientRef.current?.syncRoom(props.mapProps.currentRoomId);
        clientRef.current?.loadMap(adapted);
        sendFastMapExploration(props.mapProps, clientRef.current);
        clientRef.current?.setLabels([...labelsFrom(labels, { fontSizeScale: 1.8, markerStyle: true, excludeIdPrefix: canonical ? 'mm2_' : undefined }), ...labelsFrom(regionLabels)]);
        sourceRef.current = { tuples: source, canonical, revision };
        labelSourceRef.current = { labels, regionLabels };
        sendLatestFrame();
        return true;
      } catch (error) {
        fallbackRef.current(error instanceof Error ? error.message : String(error));
        return true;
      }
    };
    tryLoadMap();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts++;
      if (tryLoadMap() || attempts >= 40) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [props.mapProps.renderVersion, props.mapProps.rooms, props.mapProps.preloadedCoordsRef, props.mapProps.performanceMapRef, props.mapProps.performanceMapRevision, props.mapProps.currentRoomId, sendLatestFrame]);

  useEffect(() => sendFastMapExploration(props.mapProps, clientRef.current), [props.mapProps.exploredVnums, props.mapProps.unveilMap, props.mapProps.treatMapAsExplored]);

  useEffect(() => {
    const onPerfToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      clientRef.current?.setMetricsEnabled(detail?.enabled === true);
    };
    const canvas = canvasRef.current;
    let pendingFrame = 0;
    const onWheel = () => {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        sendLatestFrame();
      });
    };
    canvas?.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('mume-perf-hud-toggle', onPerfToggle);
    clientRef.current?.setMetricsEnabled(perfMonitor.enabled);
    return () => {
      canvas?.removeEventListener('wheel', onWheel);
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      window.removeEventListener('mume-perf-hud-toggle', onPerfToggle);
    };
  }, [canvasRef, sendLatestFrame]);

  useEffect(() => {
    const roomId = props.mapProps.currentRoomId;
    const canvas = canvasRef.current;
    if (!roomId || roomId === lastRoomIdRef.current || !canvas) return;
    lastRoomIdRef.current = roomId;
    clientRef.current?.visitRoom(roomId);
    const rawId = roomId.replace(/^m_/, '');
    const tuple = props.mapProps.preloadedCoordsRef.current[rawId];
    const room = props.mapProps.rooms[roomId] || props.mapProps.stableRoomsRef.current[roomId];
    const position = room
      ? { x: room.x, y: room.y, z: room.z }
      : tuple ? { x: Number(tuple[0]) || 0, y: Number(tuple[1]) || 0, z: Number(tuple[2]) || 0 } : null;
    if (position) {
      props.mapProps.playerPosRef.current = position;
      const camera = props.mapProps.camera.current as CameraState;
      if (props.mapProps.autoCenter || props.mapProps.walkTargetId || !didInitialCenterRef.current) {
        snapPixelCamera(camera);
        const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
        const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
        centerPixelCameraOnRoom(camera, position, width, height, mapWheelTarget(canvas, width, height));
      }
      didInitialCenterRef.current = true;
    }
    sendLatestFrame();
  }, [canvasRef, props.mapProps.currentRoomId, props.mapProps.renderVersion, sendLatestFrame]);

  useEffect(() => {
    clientRef.current?.setSearchOverlay(buildSearchOverlay({
      activeMapFilter: props.mapProps.activeMapFilter,
      mapSearchQuery: props.mapProps.mapSearchQuery,
      matchedRoomIds: props.mapProps.matchedRoomIds,
      closestRoomId: props.mapProps.closestRoomId,
      hoveredSearchRoomId: props.mapProps.hoveredSearchRoomId,
      filterPathIds: props.mapProps.filterPathIds,
      rooms: props.mapProps.rooms,
      preloaded: props.mapProps.preloadedCoordsRef.current,
      canonical: props.mapProps.performanceMapRef?.current ?? null,
    }));
  }, [props.mapProps.activeMapFilter, props.mapProps.mapSearchQuery, props.mapProps.matchedRoomIds, props.mapProps.closestRoomId, props.mapProps.hoveredSearchRoomId, props.mapProps.filterPathIds, props.mapProps.rooms, props.mapProps.preloadedCoordsRef, props.mapProps.performanceMapRef, props.mapProps.performanceMapRevision]);

  const cameraState = props.mapProps.camera.current as CameraState;
  useEffect(() => { sendLatestFrame(); }, [
    props.mapProps.renderVersion,
    props.mapProps.viewZ,
    props.mapProps.currentRoomId,
    props.mapProps.walkTargetId,
    props.mapProps.autoCenter,
    cameraState.x,
    cameraState.y,
    cameraState.zoom,
    cameraState.targetZoom,
    cameraState.zoomTransition?.endZoom,
    sendLatestFrame,
  ]);

  const callHandler = useCallback(<T extends React.MouseEvent | React.PointerEvent>(handler: ((event: T) => void) | undefined) => (event: T) => {
    handler?.(event);
    sendLatestFrame();
  }, [sendLatestFrame]);
  return (
    <>
      <FastMapGroupMemberSync mapProps={props.mapProps} clientRef={clientRef} workerReady={workerReady} />
    <canvas
      ref={canvasRef}
      className="map-canvas"
      data-map-renderer={props.transparentBackground ? 'immersion-worker' : 'performance-worker'}
      data-worker-ready={workerReady ? 'true' : 'false'}
      data-map-loaded={mapLoaded ? 'true' : 'false'}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: props.mapProps.isDragging ? 'grabbing' : props.mapProps.hoveredSearchRoomId ? 'pointer' : 'crosshair' }}
      onMouseDown={callHandler(props.mapProps.onMouseDown)}
      onMouseMove={callHandler(props.mapProps.onMouseMove)}
      onMouseUp={callHandler(props.mapProps.onMouseUp)}
      onPointerDown={callHandler(props.mapProps.onPointerDown)}
      onPointerMove={callHandler(props.mapProps.onPointerMove)}
      onPointerUp={callHandler(props.mapProps.onPointerUp)}
    />
    </>
  );
}));

FastMapCanvas.displayName = 'FastMapCanvas';
