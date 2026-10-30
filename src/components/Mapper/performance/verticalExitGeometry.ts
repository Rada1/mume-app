/**
 * @file Builds vertical-exit arrow icons; exitConnectionGeometry owns connections.
 */
// --- Logic Section ---

import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, type FastMapData } from './model';
import { exitFlagColor } from './vendor/exitFlagStyle';
import { NAMED_COLORS, withAlpha } from './vendor/palette';

const ICON_COLOR = [148 / 255, 163 / 255, 184 / 255, 0.4] as const;
type Point = readonly [number, number];

function triangle(out: number[], points: readonly [Point, Point, Point], z: number, color: readonly [number, number, number, number] = ICON_COLOR): void {
  for (const point of points) out.push(point[0], point[1], z, ...color);
}

function exitIconColor(flags: number, hidden: boolean): readonly [number, number, number, number] {
  if (hidden) return withAlpha(ICON_COLOR, 0);
  const color = exitFlagColor(flags, true);
  return color === null ? ICON_COLOR : withAlpha(NAMED_COLORS[color] ?? NAMED_COLORS[14]!, 0.7);
}

/** Adds small grey ▲/▼ markers over closed-door icons, hiding them while the door is open. */
export function buildVerticalExitGeometry(map: FastMapData, room: number): Float32Array {
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

  return Float32Array.from(out);
}
