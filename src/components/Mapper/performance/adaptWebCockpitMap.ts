/**
 * @file Converts WebCockpit's canonical MMapper model to worker-owned fast-map buffers.
 */
// --- Logic Section ---

import type { MapData } from './webcockpit/model';
import type { AdaptedFastMap } from './mapAdapter';
import type { FastMapData } from './model';

/** Builds fresh transferable arrays, leaving the canonical imported map intact. */
export function adaptWebCockpitMap(source: MapData, floorHeight = 1): AdaptedFastMap {
  const roomIds = Array.from(source.extId, id => String(id));
  const serverIds = Array.from(source.serverId, id => id ? String(id) : '');
  const roomIndexById = new Map<string, number>();
  roomIds.forEach((id, index) => roomIndexById.set(id, index));
  serverIds.forEach((id, index) => { if (id) roomIndexById.set(id, index); });

  const x = new Int32Array(source.roomCount);
  const y = new Int32Array(source.roomCount);
  const z = new Int32Array(source.roomCount);
  const terrain = new Uint8Array(source.terrain);
  const light = new Uint8Array(source.light);
  const align = new Uint8Array(source.align);
  const portable = new Uint8Array(source.portable);
  const ridable = new Uint8Array(source.ridable);
  const sundeath = new Uint8Array(source.sundeath);
  const mobFlags = new Uint32Array(source.mobFlags);
  const loadFlags = new Uint32Array(source.loadFlags);
  const doorOpen = new Uint8Array(source.roomCount * 7);
  const doorFlags = new Uint16Array(source.doorFlags);
  const exitFlags = new Uint16Array(source.exitFlags);
  const exitTargetStarts = new Uint32Array(source.outStart);
  const exitTargets = new Uint32Array(source.outTo);
  for (let room = 0; room < source.roomCount; room++) {
    x[room] = source.x[room]! + 1;
    y[room] = source.y[room]! - 1;
    z[room] = source.z[room]! * floorHeight;
  }

  const map: FastMapData = {
    roomCount: source.roomCount,
    roomIds,
    serverIds,
    names: [...source.names],
    descriptions: [...source.descs],
    x,
    y,
    z,
    terrain,
    light,
    align,
    portable,
    ridable,
    sundeath,
    mobFlags,
    loadFlags,
    doorOpen,
    doorFlags,
    doorNames: new Map(source.doorNames),
    infomarks: {
      count: source.infomarks.count,
      type: new Uint8Array(source.infomarks.type),
      cls: new Uint8Array(source.infomarks.cls),
      angle: new Int32Array(source.infomarks.angle),
      x1: new Int32Array(source.infomarks.x1),
      y1: new Int32Array(source.infomarks.y1),
      z1: new Int32Array(source.infomarks.z1),
      x2: new Int32Array(source.infomarks.x2),
      y2: new Int32Array(source.infomarks.y2),
      z2: new Int32Array(source.infomarks.z2),
      text: [...source.infomarks.text],
    },
    exitFlags,
    exitTargetStarts,
    exitTargets,
  };

  return {
    map,
    roomIndexById,
    transferables: [x.buffer, y.buffer, z.buffer, terrain.buffer, light.buffer, align.buffer, portable.buffer, ridable.buffer, sundeath.buffer,
      mobFlags.buffer, loadFlags.buffer, doorOpen.buffer, doorFlags.buffer, exitFlags.buffer, exitTargetStarts.buffer, exitTargets.buffer,
      map.infomarks.type.buffer, map.infomarks.cls.buffer, map.infomarks.angle.buffer, map.infomarks.x1.buffer, map.infomarks.y1.buffer, map.infomarks.z1.buffer,
      map.infomarks.x2.buffer, map.infomarks.y2.buffer, map.infomarks.z2.buffer],
  };
}
