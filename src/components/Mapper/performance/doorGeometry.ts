/**
 * @file Builds the client's open/closed door artwork for the worker renderer.
 */
// --- Logic Section ---

import { rgb, type RGBA } from './vendor/palette';

export const DOOR_VERTEX_COUNT = 24;
const DOOR_COLOR = rgb(0xffcc00);
const REMOTE_DOOR_COLOR = rgb(0x000000);
const POST_COLOR = rgb(0x000000);
const DOOR_LINE_WIDTH = 0.07;
const POST_LINE_WIDTH = 0.056;
const MARK_SIZE = 0.1;

type Point = readonly [number, number];

function pushVertex(out: number[], x: number, y: number, z: number, color: RGBA): void {
  out.push(x, y, z, color[0], color[1], color[2], color[3]);
}

function appendQuad(out: number[], corners: readonly [Point, Point, Point, Point], z: number, color: RGBA): void {
  const [a, b, c, d] = corners;
  pushVertex(out, a[0], a[1], z, color);
  pushVertex(out, b[0], b[1], z, color);
  pushVertex(out, c[0], c[1], z, color);
  pushVertex(out, b[0], b[1], z, color);
  pushVertex(out, d[0], d[1], z, color);
  pushVertex(out, c[0], c[1], z, color);
}

function appendRect(out: number[], x1: number, y1: number, x2: number, y2: number, z: number, color: RGBA): void {
  appendQuad(out, [[x1, y1], [x2, y1], [x1, y2], [x2, y2]], z, color);
}

function appendStroke(out: number[], a: Point, b: Point, z: number, width: number, color: RGBA): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const ox = -dy / length * width / 2;
  const oy = dx / length * width / 2;
  appendQuad(out, [
    [a[0] + ox, a[1] + oy], [a[0] - ox, a[1] - oy],
    [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy],
  ], z, color);
}

function appendTriangle(out: number[], points: readonly [Point, Point, Point], z: number, color: RGBA): void {
  for (const point of points) pushVertex(out, point[0], point[1], z, color);
}

function appendHorizontalDoor(out: number[], x: number, y: number, direction: number, open: boolean, z: number, doorColor: RGBA): void {
  const north = direction === 0;
  const edgeY = y + (north ? 1 : 0);
  const insetY = edgeY + (north ? -0.03 : 0.03);
  appendRect(out, x, edgeY - POST_LINE_WIDTH / 2, x + 0.25, edgeY + POST_LINE_WIDTH / 2, z, POST_COLOR);
  appendRect(out, x + 0.75, edgeY - POST_LINE_WIDTH / 2, x + 1, edgeY + POST_LINE_WIDTH / 2, z, POST_COLOR);
  if (open) {
    appendRect(out, x + 0.2, north ? y + 1 - MARK_SIZE : y, x + 0.2 + MARK_SIZE, north ? y + 1 : y + MARK_SIZE, z, doorColor);
    appendRect(out, x + 0.7, north ? y + 1 - MARK_SIZE : y, x + 0.7 + MARK_SIZE, north ? y + 1 : y + MARK_SIZE, z, doorColor);
    return;
  }
  appendRect(out, x + 0.25, insetY - DOOR_LINE_WIDTH / 2, x + 0.75, insetY + DOOR_LINE_WIDTH / 2, z, doorColor);
}

function appendVerticalDoor(out: number[], x: number, y: number, direction: number, open: boolean, z: number, doorColor: RGBA): void {
  const east = direction === 2;
  const edgeX = x + (east ? 1 : 0);
  const insetX = edgeX + (east ? -0.03 : 0.03);
  appendRect(out, edgeX - POST_LINE_WIDTH / 2, y, edgeX + POST_LINE_WIDTH / 2, y + 0.25, z, POST_COLOR);
  appendRect(out, edgeX - POST_LINE_WIDTH / 2, y + 0.75, edgeX + POST_LINE_WIDTH / 2, y + 1, z, POST_COLOR);
  if (open) {
    appendRect(out, east ? x + 1 - MARK_SIZE : x, y + 0.2, east ? x + 1 : x + MARK_SIZE, y + 0.3, z, doorColor);
    appendRect(out, east ? x + 1 - MARK_SIZE : x, y + 0.7, east ? x + 1 : x + MARK_SIZE, y + 0.8, z, doorColor);
    return;
  }
  appendRect(out, insetX - DOOR_LINE_WIDTH / 2, y + 0.25, insetX + DOOR_LINE_WIDTH / 2, y + 0.75, z, doorColor);
}

function appendVerticalExitDoor(out: number[], x: number, y: number, direction: number, open: boolean, z: number, doorColor: RGBA): void {
  const up = direction === 4;
  const cx = x + (up ? 0.26 : 0.74);
  const cy = y + (up ? 0.74 : 0.26);
  const points: [Point, Point, Point] = up
    ? [[cx, cy + 0.18], [cx - 0.18, cy - 0.15], [cx + 0.18, cy - 0.15]]
    : [[cx, cy - 0.18], [cx + 0.18, cy + 0.15], [cx - 0.18, cy + 0.15]];
  if (!open) {
    appendTriangle(out, points, z, doorColor);
    return;
  }
  appendStroke(out, points[0], points[1], z, 0.043, doorColor);
  appendStroke(out, points[1], points[2], z, 0.043, doorColor);
  appendStroke(out, points[2], points[0], z, 0.043, doorColor);
}

/** Builds a fixed-size color mesh matching the regular mapper's door state marks. */
export function buildDoorVertices(x: number, y: number, z: number, direction: number, open: boolean, style: 'current' | 'remote' = 'current'): Float32Array {
  const out: number[] = [];
  const doorColor = style === 'current' ? DOOR_COLOR : REMOTE_DOOR_COLOR;
  if (direction === 0 || direction === 1) appendHorizontalDoor(out, x, y, direction, open, z, doorColor);
  else if (direction === 2 || direction === 3) appendVerticalDoor(out, x, y, direction, open, z, doorColor);
  else if (direction === 4 || direction === 5) appendVerticalExitDoor(out, x, y, direction, open, z, doorColor);
  while (out.length < DOOR_VERTEX_COUNT * 7) pushVertex(out, x, y, z, [0, 0, 0, 0]);
  return Float32Array.from(out.slice(0, DOOR_VERTEX_COUNT * 7));
}
