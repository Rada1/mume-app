/**
 * @file Builds grey vertical-exit arrows and connectors between linked rooms.
 */
// --- Logic Section ---

import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, type FastMapData } from './model';
import { exitFlagColor } from './vendor/exitFlagStyle';
import { NAMED_COLORS, withAlpha } from './vendor/palette';

const ICON_COLOR = [148 / 255, 163 / 255, 184 / 255, 0.4] as const;
type Point = readonly [number, number];

function vertex(out: number[], point: Point, z: number, color: readonly [number, number, number, number] = ICON_COLOR): void {
  out.push(point[0], point[1], z, ...color);
}

function triangle(out: number[], points: readonly [Point, Point, Point], z: number, color: readonly [number, number, number, number] = ICON_COLOR): void {
  for (const point of points) out.push(point[0], point[1], z, ...color);
}

function exitIconColor(flags: number, hidden: boolean): readonly [number, number, number, number] {
  if (hidden) return withAlpha(ICON_COLOR, 0);
  const color = exitFlagColor(flags, true);
  return color === null ? ICON_COLOR : withAlpha(NAMED_COLORS[color] ?? NAMED_COLORS[14]!, 0.7);
}

function appendStroke(out: number[], a: Point, b: Point, z: number, color: readonly [number, number, number, number] = ICON_COLOR): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const ox = -dy / length * 0.009;
  const oy = dx / length * 0.009;
  const corners: readonly [Point, Point, Point, Point] = [
    [a[0] + ox, a[1] + oy], [a[0] - ox, a[1] - oy],
    [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy],
  ];
  vertex(out, corners[0], z, color); vertex(out, corners[1], z, color); vertex(out, corners[2], z, color);
  vertex(out, corners[1], z, color); vertex(out, corners[3], z, color); vertex(out, corners[2], z, color);
}

function appendDottedConnector(out: number[], start: Point, end: Point, z: number, visible: boolean): void {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const color = visible ? ICON_COLOR : withAlpha(ICON_COLOR, 0);
  for (let offset = 0; offset < length; offset += 0.15) {
    const endOffset = Math.min(offset + 0.055, length);
    appendStroke(out, [start[0] + ux * offset, start[1] + uy * offset], [start[0] + ux * endOffset, start[1] + uy * endOffset], z, color);
  }
}

type VerticalDirection = 'u' | 'd';

function hasTarget(map: FastMapData, room: number, direction: VerticalDirection, target: number): boolean {
  const slot = room * DIR_COUNT + DIR_SLOT[direction];
  if ((map.exitFlags[slot]! & EXIT_FLAG.EXIT) === 0) return false;
  const start = map.exitTargetStarts[slot]!;
  const end = map.exitTargetStarts[slot + 1]!;
  for (let index = start; index < end; index++) {
    if (map.exitTargets[index] === target) return true;
  }
  return false;
}

function appendConnectedExitLines(out: number[], map: FastMapData, room: number, direction: VerticalDirection, isVisited: (room: number) => boolean): void {
  const slot = room * DIR_COUNT + DIR_SLOT[direction];
  if ((map.exitFlags[slot]! & EXIT_FLAG.EXIT) === 0) return;

  const start = map.exitTargetStarts[slot]!;
  const end = map.exitTargetStarts[slot + 1]!;
  const otherDirection: VerticalDirection = direction === 'u' ? 'd' : 'u';
  const sourcePoint: Point = direction === 'u'
    ? [map.x[room]! + 0.26, map.y[room]! + 0.74]
    : [map.x[room]! + 0.74, map.y[room]! + 0.26];
  const seenTargets = new Set<number>();

  for (let index = start; index < end; index++) {
    const target = map.exitTargets[index]!;
    if (target >= map.roomCount || target === room || seenTargets.has(target)) continue;
    seenTargets.add(target);
    if (!hasTarget(map, target, otherDirection, room)) continue;

    const targetPoint: Point = otherDirection === 'u'
      ? [map.x[target]! + 0.26, map.y[target]! + 0.74]
      : [map.x[target]! + 0.74, map.y[target]! + 0.26];
    appendDottedConnector(out, sourcePoint, targetPoint, map.z[room]!, isVisited(target));
  }
}

/** Adds small grey ▲/▼ markers over closed-door icons, hiding them while the door is open. */
export function buildVerticalExitGeometry(map: FastMapData, room: number, isVisited: (room: number) => boolean = () => true): Float32Array {
  const out: number[] = [];
  const x = map.x[room]!;
  const y = map.y[room]!;
  const z = map.z[room]!;
  const upFlags = map.exitFlags[room * DIR_COUNT + DIR_SLOT.u]!;
  const downFlags = map.exitFlags[room * DIR_COUNT + DIR_SLOT.d]!;

  if ((upFlags & EXIT_FLAG.EXIT) !== 0) {
    const cx = x + 0.26;
    const cy = y + 0.74;
    const slot = room * DIR_COUNT + DIR_SLOT.u;
    const doorOpen = (upFlags & EXIT_FLAG.DOOR) !== 0 && map.doorOpen?.[slot] === 1;
    triangle(out, [[cx, cy + 0.16], [cx - 0.16, cy - 0.13], [cx + 0.16, cy - 0.13]], z, exitIconColor(upFlags, doorOpen));
  }
  if ((downFlags & EXIT_FLAG.EXIT) !== 0) {
    const cx = x + 0.74;
    const cy = y + 0.26;
    const slot = room * DIR_COUNT + DIR_SLOT.d;
    const doorOpen = (downFlags & EXIT_FLAG.DOOR) !== 0 && map.doorOpen?.[slot] === 1;
    triangle(out, [[cx, cy - 0.16], [cx + 0.16, cy + 0.13], [cx - 0.16, cy + 0.13]], z, exitIconColor(downFlags, doorOpen));
  }
  appendConnectedExitLines(out, map, room, 'u', isVisited);
  appendConnectedExitLines(out, map, room, 'd', isVisited);

  return Float32Array.from(out);
}
