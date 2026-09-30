/**
 * @file Builds and sends the latest camera, player, and room overlay frame.
 */
// --- Logic Section ---

import type { MapCanvasProps } from '../MapCanvas';
import type { FastMapWorkerClient } from './client';
import { snapPixelCamera, toFastMapView } from './cameraAdapter';
import { adaptLiveRoom } from './mapAdapter';
import type { DoorCommandUpdate } from '../doorCommand';
import { DIR_SLOT } from './model';
import { mergeRoomExits, preferLiveFlags } from './canvasDataAdapters';
import { createFastMapPrediction } from './predictionPath';
import type { FastMapBackground } from './mapBackground';
import type { FastMapFrame } from './protocol';

export function sendFastMapFrame(
  mapProps: MapCanvasProps,
  canvas: HTMLCanvasElement | null,
  client: FastMapWorkerClient | null,
  background: FastMapBackground,
  doorOverride?: DoorCommandUpdate,
): void {
  if (!canvas || !client) return;
  const camera = mapProps.camera.current as Parameters<typeof snapPixelCamera>[0];
  snapPixelCamera(camera);
  const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
  const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
  const rawRoom = mapProps.currentRoomId
    ? mapProps.rooms[mapProps.currentRoomId] || mapProps.stableRoomsRef.current[mapProps.currentRoomId]
    : undefined;
  const tupleId = mapProps.currentRoomId?.replace(/^m_/, '') ?? '';
  const bundledTuple = mapProps.preloadedCoordsRef.current[tupleId];
  const bundledRoomFields = bundledTuple as readonly unknown[] | undefined;
  const player = mapProps.playerPosRef.current || (rawRoom ? { x: rawRoom.x, y: rawRoom.y, z: rawRoom.z } : null);
  const layer = Math.round(mapProps.viewZ ?? player?.z ?? 0);
  const appZoom = Math.max(0.01, camera.zoom || 1);
  const liveRoom = rawRoom
    ? adaptLiveRoom({
      x: rawRoom.x, y: rawRoom.y, z: rawRoom.z, terrain: rawRoom.terrain, exits: mergeRoomExits(rawRoom.exits, bundledTuple?.[4]),
      mobFlags: preferLiveFlags(rawRoom.mobFlags, bundledTuple?.[7]),
      loadFlags: preferLiveFlags(rawRoom.loadFlags, bundledTuple?.[8]),
      light: rawRoom.light ?? bundledRoomFields?.[10] as number | string | null | undefined,
      sundeath: rawRoom.sundeath ?? bundledRoomFields?.[11] as number | string | null | undefined,
      align: rawRoom.align ?? bundledRoomFields?.[12] as number | string | null | undefined,
      portable: rawRoom.portable ?? bundledRoomFields?.[13] as number | string | boolean | null | undefined,
      ridable: rawRoom.ridable ?? (typeof bundledRoomFields?.[14] === 'string' || typeof bundledRoomFields?.[14] === 'number' || typeof bundledRoomFields?.[14] === 'boolean' ? bundledRoomFields[14] : undefined),
    })
    : null;
  const overrideRoomId = doorOverride?.roomId ?? mapProps.currentRoomId;
  const normalizeId = (roomId: string | null) => roomId?.replace(/^m_/, '') ?? '';
  if (liveRoom && doorOverride && normalizeId(overrideRoomId) === normalizeId(mapProps.currentRoomId)) {
    const doorSlot = DIR_SLOT[doorOverride.direction as keyof typeof DIR_SLOT];
    if (doorSlot !== undefined && doorSlot < liveRoom.doorOpen.length) liveRoom.doorOpen[doorSlot] = doorOverride.closed ? 0 : 1;
  }
  const predictions = mapProps.clientPredictionsRef?.current ?? [];
  const plannedTargetId = mapProps.walkTargetId ? mapProps.walkPath?.[1] ?? null : null;
  const frame: FastMapFrame = {
    view: { ...toFastMapView({ x: camera.x, y: camera.y, zoom: appZoom }, width, height, layer) },
    player: player ? { x: player.x, y: -player.y, z: player.z } : null,
    liveRoom,
    prediction: createFastMapPrediction(mapProps.currentRoomId, predictions, mapProps.preMoveRef?.current ?? null, plannedTargetId),
    background,
  };
  client.update(frame);
}

export function sendFastMapExploration(mapProps: MapCanvasProps, client: FastMapWorkerClient | null): void {
  if (!client) return;
  const roomIds = new Set(mapProps.exploredRef.current);
  if (mapProps.currentRoomId) roomIds.add(mapProps.currentRoomId);
  client.setExploredRooms([...roomIds], Boolean(mapProps.unveilMap || mapProps.treatMapAsExplored));
}
