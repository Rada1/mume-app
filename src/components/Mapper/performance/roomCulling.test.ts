/**
 * @file Tests immutable room chunk building and viewport culling for the worker renderer.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { EXIT_FLAG, type FastMapData } from './model';
import { buildRoomMeshes, isRoomMeshVisible, roomMeshPixmaps } from './vendor/rooms';
import { L128 } from './vendor/textures';

function mapAt(positions: ReadonlyArray<{ x: number; y: number; z: number }>): FastMapData {
  const count = positions.length;
  return {
    roomCount: count,
    roomIds: positions.map((_, index) => String(index)),
    serverIds: positions.map(() => ''),
    names: positions.map(() => ''),
    descriptions: positions.map(() => ''),
    x: Int32Array.from(positions.map(room => room.x)),
    y: Int32Array.from(positions.map(room => room.y)),
    z: Int32Array.from(positions.map(room => room.z)),
    terrain: new Uint8Array(count),
    exitFlags: new Uint16Array(count * 7),
    exitTargetStarts: new Uint32Array(count * 7 + 1),
    exitTargets: new Uint32Array(),
  };
}

describe('Fast map room chunks', () => {
  it('builds static meshes once per floor and spatial chunk', () => {
    const meshes = buildRoomMeshes(mapAt([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 32, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]));

    expect(meshes).toHaveLength(3);
    expect(meshes[0]?.bounds).toEqual({ minX: 0, maxX: 1, minY: 0, maxY: 1 });
    expect(meshes[0]?.ranges.terrain.count).toBe(2);
  });

  it('draws only chunks intersecting the projected viewport on the selected floor', () => {
    const visible = { minX: 0, maxX: 15, minY: 0, maxY: 15 };
    const distant = { minX: 64, maxX: 79, minY: 64, maxY: 79 };
    const view = { x: 8, y: 8, zoom: 1.136, layer: 0 };

    expect(isRoomMeshVisible(visible, 0, view, 800, 600)).toBe(true);
    expect(isRoomMeshVisible(distant, 0, view, 800, 600)).toBe(false);
    expect(isRoomMeshVisible(visible, 1, view, 800, 600)).toBe(false);
  });

  it('keeps the MMapper wall out of the app door gap whether the door is open or closed', () => {
    for (const open of [0, 1]) {
      const map = mapAt([{ x: 0, y: 0, z: 0 }]);
      map.exitFlags[0] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
      map.doorOpen = new Uint8Array(7);
      map.doorOpen[0] = open;
      const mesh = buildRoomMeshes(map)[0];
      expect(mesh).toBeDefined();
      const walls = mesh!.ranges.walls;
      const wallLayers = Array.from({ length: walls.count }, (_, index) => mesh!.inst[(walls.first + index) * 4 + 3]! & 0xff);

      expect(wallLayers).not.toContain(L128.wall(0));
      expect(wallLayers).toContain(L128.wall(1));
      expect(mesh!.doorSlots).toEqual(new Uint32Array([0]));
      expect(mesh!.doorVertices.length).toBeGreaterThan(0);
    }
  });

  it('keeps live-room doors gold while map doors are black', () => {
    const map = mapAt([{ x: 0, y: 0, z: 0 }]);
    map.exitFlags[0] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
    const remoteDoor = buildRoomMeshes(map)[0]!.doorVertices;
    const currentDoor = buildRoomMeshes(map, 'current')[0]!.doorVertices;
    const colorOffset = 17 * 7 + 3;

    expect(Array.from(remoteDoor.slice(colorOffset, colorOffset + 4))).toEqual([0, 0, 0, 1]);
    expect(currentDoor[colorOffset]).toBeCloseTo(0xc9 / 255);
    expect(currentDoor[colorOffset + 1]).toBeCloseTo(0xa8 / 255);
    expect(currentDoor[colorOffset + 2]).toBeCloseTo(0x4c / 255);
    expect(currentDoor[colorOffset + 3]).toBe(1);
  });

  it('creates app door overlays for vertical exits too', () => {
    const map = mapAt([{ x: 0, y: 0, z: 0 }]);
    map.exitFlags[4] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
    map.exitFlags[5] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
    const mesh = buildRoomMeshes(map)[0];
    expect(mesh?.doorSlots).toEqual(new Uint32Array([4, 5]));
    expect(mesh?.ranges.upDown.count).toBe(0);
    expect(mesh?.doorVertices.length).toBe(2 * 24 * 7);
  });

  it('uses grey arrow geometry and a dotted connector for ordinary vertical exits', () => {
    const map = mapAt([{ x: 0, y: 0, z: 0 }]);
    map.exitFlags[4] = EXIT_FLAG.EXIT;
    map.exitFlags[5] = EXIT_FLAG.EXIT;

    const mesh = buildRoomMeshes(map)[0];
    expect(mesh?.ranges.upDown.count).toBe(0);
    expect(mesh?.verticalExitVertices.length).toBeGreaterThan(42);
  });

  it('batches MOB and LOAD flag sprites into the static room mesh', () => {
    const map = mapAt([{ x: 0, y: 0, z: 0 }]);
    map.mobFlags = new Uint32Array([1 << 1]);
    map.loadFlags = new Uint32Array([1 << 5]);
    const mesh = buildRoomMeshes(map)[0];
    const vertices = mesh!.flagVertices;
    const layers = new Set(Array.from({ length: vertices.length / 6 }, (_, index) => vertices[index * 6 + 5]));

    expect(vertices).toHaveLength(12 * 6);
    expect(layers).toEqual(new Set([L128.mob(1), L128.load(5)]));
    expect(vertices[6]! - vertices[0]!).toBeCloseTo(0.9);
    expect(vertices[0]).toBeCloseTo(0.05);
    expect(vertices[36]).toBeCloseTo(0.05);
  });

  it('draws a slightly inset no-ride overlay on the room tile', () => {
    const map = mapAt([{ x: 0, y: 0, z: 0 }]);
    map.ridable = new Uint8Array([2]);
    const mesh = buildRoomMeshes(map)[0];
    expect(mesh?.flagVertices[5]).toBe(L128.noRide);
    expect(mesh?.flagVertices[0]).toBeCloseTo(0.05);
    expect(mesh?.flagVertices[6]).toBeCloseTo(0.95);
    expect(roomMeshPixmaps([mesh!])).toContain('pixmaps/no-ride.png');
  });
});
