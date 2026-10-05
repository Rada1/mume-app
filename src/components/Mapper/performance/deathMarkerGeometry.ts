/**
 * @file Builds the pulsing death-room highlight and its off-screen direction arrow.
 */
// --- Logic Section ---

import type { FastMapView } from './protocol';

const DEATH_RED = [239 / 255, 68 / 255, 68 / 255] as const;

function triangle(
  out: number[],
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  z: number,
  alpha: number,
): void {
  for (const [x, y] of [a, b, c]) out.push(x, y, z, ...DEATH_RED, alpha);
}

function circle(out: number[], x: number, y: number, z: number, radius: number, alpha: number): void {
  const segments = 32;
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    triangle(out, [x, y], [x + Math.cos(a1) * radius, y + Math.sin(a1) * radius], [x + Math.cos(a2) * radius, y + Math.sin(a2) * radius], z, alpha);
  }
}

export function buildDeathMarkerGeometry(
  room: { x: number; y: number; z: number } | null | undefined,
  view: FastMapView,
  width: number,
  height: number,
  now: number,
): Float32Array {
  if (!room || width <= 0 || height <= 0) return new Float32Array();
  const floorAlpha = Math.max(0, 1 - Math.abs(room.z - view.layer));
  if (floorAlpha <= 0.01) return new Float32Array();

  const perspective = Math.max(1, 60 - 7 * view.layer);
  const pixelsPerRoom = (5280 * view.zoom) / (2 * perspective);
  const targetX = width / 2 + (room.x + 0.5 - view.x) * pixelsPerRoom;
  const targetY = height / 2 - (room.y + 0.5 - view.y) * pixelsPerRoom;
  const pulse = (Math.sin(now / 350) + 1) / 2;
  const output: number[] = [];

  if (targetX >= 0 && targetX <= width && targetY >= 0 && targetY <= height) {
    const x = room.x + 0.5;
    const y = room.y + 0.5;
    circle(output, x, y, room.z, 0.45 + pulse * 0.1, floorAlpha * (0.3 + pulse * 0.4));
    circle(output, x, y, room.z, Math.max(0.04, 4 / pixelsPerRoom), floorAlpha * 0.8);
    return Float32Array.from(output);
  }

  const dx = targetX - width / 2;
  const dy = targetY - height / 2;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return new Float32Array();
  const ux = dx / length;
  const uy = dy / length;
  const edgeScale = Math.min((width / 2 - 15) / Math.abs(ux || 1e-9), (height / 2 - 15) / Math.abs(uy || 1e-9));
  const px = width / 2 + ux * edgeScale;
  const py = height / 2 + uy * edgeScale;
  const point = (sx: number, sy: number): readonly [number, number] => [
    view.x + (sx - width / 2) / pixelsPerRoom,
    view.y - (sy - height / 2) / pixelsPerRoom,
  ];
  const tip = point(px + ux * 8, py + uy * 8);
  const left = point(px - ux * 2 - uy * 6, py - uy * 2 + ux * 6);
  const right = point(px - ux * 2 + uy * 6, py - uy * 2 - ux * 6);
  const tailLeft = point(px - ux * 8 - uy * 2, py - uy * 8 + ux * 2);
  const tailRight = point(px - ux * 8 + uy * 2, py - uy * 8 - ux * 2);
  const alpha = floorAlpha * (0.4 + pulse * 0.6);
  triangle(output, tip, left, tailLeft, view.layer, alpha);
  triangle(output, tip, tailLeft, tailRight, view.layer, alpha);
  triangle(output, tip, tailRight, right, view.layer, alpha);
  triangle(output, tip, right, left, view.layer, alpha);
  return Float32Array.from(output);
}
