/**
 * @file Builds MMapper-style exit connection lines and directional triangles.
 * Geometry follows MMapper's ConnectionLineBuilder.cpp and Connections.cpp.
 * MMapper source is GPL-2.0-or-later.
 */
// --- Logic Section ---

import { DIR_COUNT, type FastMapData } from './model';
import { rgb, type RGBA } from './vendor/palette';

const CONNECTION_COLOR = rgb(0xffffff, 0.5);
const CONNECTION_DASH_LENGTH = 0.12;
const CONNECTION_DASH_GAP = 0.12;
const OPPOSITE_DIR = [1, 0, 3, 2, 5, 4, 6] as const;
type Point3 = readonly [number, number, number];

export interface ExitConnectionBatch {
  z: number;
  vertices: Float32Array;
}

export interface ExitConnectionGeometry {
  lines: ExitConnectionBatch[];
  arrows: ExitConnectionBatch[];
}

function appendSegment(out: number[], a: Point3, b: Point3, color: RGBA): void {
  out.push(...a, ...color, ...b, ...color);
}

function appendSegmentedLine(out: number[], a: Point3, b: Point3, color: RGBA): void {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length <= CONNECTION_DASH_LENGTH) {
    appendSegment(out, a, b, color);
    return;
  }
  const period = CONNECTION_DASH_LENGTH + CONNECTION_DASH_GAP;
  for (let start = 0; start < length; start += period) {
    const end = Math.min(start + CONNECTION_DASH_LENGTH, length);
    const pointAt = (distance: number): Point3 => {
      const fraction = distance / length;
      return [
        a[0] + (b[0] - a[0]) * fraction,
        a[1] + (b[1] - a[1]) * fraction,
        a[2] + (b[2] - a[2]) * fraction,
      ];
    };
    appendSegment(out, pointAt(start), pointAt(end), color);
  }
}

function appendTriangle(out: number[], points: readonly Point3[], x: number, y: number, color: RGBA): void {
  for (const [px, py, z] of points) out.push(px + x, py + y, z, ...color);
}

/** MMapper ConnectionLineBuilder start cap in room-local coordinates. */
function mmapperStart(dir: number, z: number): Point3[] {
  const points: Point3[] = [
    [0.75, 0.9, z], [0.75, 1.1, z], [0.25, 0.1, z], [0.25, -0.1, z],
    [0.9, 0.75, z], [1.1, 0.75, z], [0.1, 0.25, z], [-0.1, 0.25, z],
    [0.37, 0.75, z], [0.45, 0.75, z], [0.63, 0.25, z], [0.55, 0.25, z],
    [0.5, 0.5, z], [0.75, 0.25, z],
  ];
  return points.slice(dir * 2, dir * 2 + 2);
}

/** MMapper ConnectionLineBuilder target cap, including its one-way variant. */
function mmapperEnd(dir: number, dx: number, dy: number, z: number, oneWay: boolean): Point3[] {
  const twoWayPoints: Point3[][] = [
    [[0.75, 1.1, z], [0.75, 0.9, z]], [[0.25, -0.1, z], [0.25, 0.1, z]],
    [[1.1, 0.75, z], [0.9, 0.75, z]], [[-0.1, 0.25, z], [0.1, 0.25, z]],
    [[0.45, 0.75, z], [0.37, 0.75, z]], [[0.55, 0.25, z], [0.63, 0.25, z]],
    [[0.75, 0.25, z], [0.5, 0.5, z]],
  ];
  const oneWayPoints: Point3[][] = [
    [[0.32, 0.9, z], [0.18, 0.9, z]], [[0.68, 0.1, z], [0.82, 0.1, z]],
    [[0.9, 0.18, z], [0.9, 0.32, z]], [[0.1, 0.82, z], [0.1, 0.68, z]],
    [[0.25, 0.75, z], [0.45, 0.55, z]], [[0.75, 0.25, z], [0.55, 0.45, z]],
    [[0.75, 0.25, z], [0.5, 0.5, z]],
  ];
  return (oneWay ? oneWayPoints : twoWayPoints)[dir]!.map(([x, y, pointZ]) => [x + dx, y + dy, pointZ]);
}

function triangle(dir: number, z: number, oneWay: boolean): Point3[] {
  if (dir === 4 || dir === 5) return oneWay ? [[0.5, 0.5, z], [0.55, 0.3, z], [0.7, 0.45, z]] : [];
  if (dir === 6) return [[0.5, 0.5, z], [0.55, 0.3, z], [0.7, 0.45, z]];
  if (oneWay) {
    const points: Point3[][] = [
      [[0.32, 0.9, z], [0.18, 0.9, z], [0.25, 0.7, z]],
      [[0.68, 0.1, z], [0.82, 0.1, z], [0.75, 0.3, z]],
      [[0.9, 0.18, z], [0.9, 0.32, z], [0.7, 0.25, z]],
      [[0.1, 0.82, z], [0.1, 0.68, z], [0.3, 0.75, z]],
    ];
    return points[dir]!;
  }
  const points: Point3[][] = [
    [[0.82, 0.9, z], [0.68, 0.9, z], [0.75, 0.7, z]],
    [[0.18, 0.1, z], [0.32, 0.1, z], [0.25, 0.3, z]],
    [[0.9, 0.68, z], [0.9, 0.82, z], [0.7, 0.75, z]],
    [[0.1, 0.32, z], [0.1, 0.18, z], [0.3, 0.25, z]],
  ];
  return points[dir]!;
}

function areNeighbours(dir: number, dx: number, dy: number, dz: number): boolean {
  if (dz !== 0) return false;
  return (dir === 0 && dx === 0 && dy === 1)
    || (dir === 1 && dx === 0 && dy === -1)
    || (dir === 2 && dx === 1 && dy === 0)
    || (dir === 3 && dx === -1 && dy === 0);
}

/** Builds static connector lines plus MMapper's filled direction triangles. */
export function buildExitConnectionGeometry(map: FastMapData, roomStates?: Uint8Array): ExitConnectionGeometry {
  const lineFloors = new Map<number, number[]>();
  const arrowFloors = new Map<number, number[]>();
  const seenTwoWay = new Set<string>();
  for (let room = 0; room < map.roomCount; room++) {
    for (let slot = room * DIR_COUNT; slot < room * DIR_COUNT + DIR_COUNT; slot++) {
      const dir = slot % DIR_COUNT;
      for (let edge = map.exitTargetStarts[slot]!; edge < map.exitTargetStarts[slot + 1]!; edge++) {
        const target = map.exitTargets[edge]!;
        if (target === room || target >= map.roomCount) continue;
        if (roomStates && (roomStates[room] === 0 || roomStates[target] === 0)) continue;
        const targetDir = OPPOSITE_DIR[dir]!;
        const reverseSlot = target * DIR_COUNT + targetDir;
        let twoWay = false;
        for (let reverse = map.exitTargetStarts[reverseSlot]!; reverse < map.exitTargetStarts[reverseSlot + 1]!; reverse++) {
          if (map.exitTargets[reverse] === room) { twoWay = true; break; }
        }
        const pairKey = `${Math.min(room, target)}:${Math.max(room, target)}`;
        if (twoWay) {
          if (seenTwoWay.has(pairKey)) continue;
          seenTwoWay.add(pairKey);
          if (room > target) continue;
        }

        const dx = map.x[target]! - map.x[room]!;
        const dy = map.y[target]! - map.y[room]!;
        const dz = map.z[target]! - map.z[room]!;
        const neighbours = areNeighbours(dir, dx, dy, dz);
        if (twoWay && neighbours) continue;
        const points = [
          ...mmapperStart(dir, map.z[room]!).map(([x, y, z]) => [x + map.x[room]!, y + map.y[room]!, z] as const),
          ...mmapperEnd(targetDir, dx, dy, map.z[target]!, !twoWay)
            .map(([x, y, z]) => [x + map.x[room]!, y + map.y[room]!, z] as const),
        ];
        for (const floor of map.z[room] === map.z[target] ? [map.z[room]!] : [map.z[room]!, map.z[target]!]) {
          const list = lineFloors.get(floor) ?? [];
          lineFloors.set(floor, list);
          for (let index = 1; index < points.length; index++) {
            const append = index === 2 ? appendSegmentedLine : appendSegment;
            append(list, points[index - 1]!, points[index]!, CONNECTION_COLOR);
          }
        }

        const startTriangle = twoWay ? triangle(dir, map.z[room]!, false) : [];
        const endTriangle = triangle(targetDir, map.z[target]!, !twoWay);
        for (const [arrowFloor, arrowPoints, x, y] of [
          [map.z[room]!, startTriangle, map.x[room]!, map.y[room]!],
          [map.z[target]!, endTriangle, map.x[target]!, map.y[target]!],
        ] as const) {
          if (arrowPoints.length === 0) continue;
          const list = arrowFloors.get(arrowFloor) ?? [];
          arrowFloors.set(arrowFloor, list);
          appendTriangle(list, arrowPoints, x, y, CONNECTION_COLOR);
        }
      }
    }
  }
  const batches = (floors: Map<number, number[]>): ExitConnectionBatch[] => [...floors.entries()]
    .map(([z, vertices]) => ({ z, vertices: Float32Array.from(vertices) }));
  return { lines: batches(lineFloors), arrows: batches(arrowFloors) };
}

