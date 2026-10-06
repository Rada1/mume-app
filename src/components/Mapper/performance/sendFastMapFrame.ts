/**
 * @file Builds and sends the latest camera, player, and room overlay frame.
 */
// --- Logic Section ---

import type { MapCanvasProps } from '../MapCanvas';
import type { FastMapWorkerClient } from './client';
import { snapPixelCamera, toFastMapView } from './cameraAdapter';
import { adaptLiveRoom } from './mapAdapter';
import { mergeRoomExits, preferLiveFlags } from './canvasDataAdapters';
import { createFastMapPrediction } from './predictionPath';
import { GRID_SIZE } from '../mapperUtils';
import { toSearchPoint } from './searchOverlayAdapter';
import type { FastMapBackground } from './mapBackground';
import type { FastMapFrame } from './protocol';

function deathRoomPosition(mapProps: MapCanvasProps): { x: number; y: number; z: number } | null {
  const deathRoomId = mapProps.deathRoomId?.trim();
  if (!deathRoomId) return null;
  const id = deathRoomId.replace(/^(?:m_|r_)/i, '');
  const room = mapProps.rooms[`m_${id}`]
    || mapProps.rooms[deathRoomId]
    || mapProps.stableRoomsRef.current[`m_${id}`]
    || mapProps.stableRoomsRef.current[deathRoomId]
    || Object.values(mapProps.rooms).find(candidate => String(candidate?.gmcpId ?? '') === id);
  if (room && Number.isFinite(Number(room.x)) && Number.isFinite(Number(room.y))) {
    return { x: Number(room.x), y: -Number(room.y), z: Number(room.z) || 0 };
  }
  const tuple = mapProps.preloadedCoordsRef.current[id] ?? mapProps.preloadedCoordsRef.current[deathRoomId];
  if (!tuple || !Number.isFinite(Number(tuple[0])) || !Number.isFinite(Number(tuple[1]))) return null;
  return { x: Number(tuple[0]), y: -Number(tuple[1]), z: Number(tuple[2]) || 0 };
}

export function sendFastMapFrame(
  mapProps: MapCanvasProps,
  canvas: HTMLCanvasElement | null,
  client: FastMapWorkerClient | null,
  background: FastMapBackground,
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
  const predictions = mapProps.clientPredictionsRef?.current ?? [];
  const plannedTargetId = mapProps.walkTargetId ? mapProps.walkPath?.[1] ?? null : null;
  const frame: FastMapFrame = {
    view: { ...toFastMapView({ x: camera.x, y: camera.y, zoom: appZoom }, width, height, layer) },
    player: player ? { x: player.x, y: -player.y, z: player.z } : null,
    deathRoom: deathRoomPosition(mapProps),
    liveRoom,
    prediction: createFastMapPrediction(mapProps.currentRoomId, predictions, mapProps.preMoveRef?.current ?? null, plannedTargetId),
    background,
    brightness: Math.max(50, Math.min(100, mapProps.mapBrightness ?? 50)) / 100,
  };
  client.update(frame);

  const parent = canvas.parentElement;
  if (parent) {
    if (player) {
      const playerSx = (player.x * GRID_SIZE + GRID_SIZE / 2 - camera.x) * appZoom;
      const playerSy = (player.y * GRID_SIZE - GRID_SIZE / 2 - camera.y) * appZoom;
      parent.style.setProperty('--player-cx', `${Math.round(playerSx)}px`);
      parent.style.setProperty('--player-cy', `${Math.round(playerSy)}px`);
    }
    const targetRoomId = mapProps.closestRoomId;
    if (targetRoomId) {
      const targetPoint = toSearchPoint({
        rooms: mapProps.rooms,
        preloaded: mapProps.preloadedCoordsRef.current,
        canonical: mapProps.performanceMapRef?.current ?? null,
      }, targetRoomId);
      if (targetPoint) {
        const targetSx = (targetPoint.x * GRID_SIZE - camera.x) * appZoom;
        const targetSy = (-targetPoint.y * GRID_SIZE - camera.y) * appZoom;
        parent.style.setProperty('--filter-target-cx', `${Math.round(targetSx)}px`);
        parent.style.setProperty('--filter-target-cy', `${Math.round(targetSy)}px`);
      } else {
        parent.style.removeProperty('--filter-target-cx');
        parent.style.removeProperty('--filter-target-cy');
      }
    } else {
      parent.style.removeProperty('--filter-target-cx');
      parent.style.removeProperty('--filter-target-cy');
    }
  }
}

export function sendFastMapExploration(mapProps: MapCanvasProps, client: FastMapWorkerClient | null): void {
  if (!client) return;
  const roomIds = new Set(mapProps.exploredRef.current);
  if (mapProps.currentRoomId) roomIds.add(mapProps.currentRoomId);
  client.setExploredRooms([...roomIds], Boolean(mapProps.unveilMap || mapProps.treatMapAsExplored));
}
