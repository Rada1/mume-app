/**
 * @file Builds procedural directional flow sprites for the fast map texture atlas.
 */
// --- Logic Section ---

import { L128 } from './textures';

const FLOW_IN_START = L128.streamIn(0);
const FLOW_OUT_START = L128.streamOut(0);
const FLOW_DIRECTION: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0, -1], [1, 0], [-1, 0], [0, 1], [0, -1],
];

/** Creates one transparent RGBA arrow image for a stream-in or stream-out atlas layer. */
export function createFlowFlagPixels(layer: number, size: number): Uint8Array<ArrayBuffer> | null {
  const incoming = layer >= FLOW_IN_START && layer < FLOW_OUT_START;
  const start = incoming ? FLOW_IN_START : FLOW_OUT_START;
  const directionIndex = layer - start;
  const direction = FLOW_DIRECTION[directionIndex];
  if (!direction || size < 16) return null;

  const [dx, dy] = direction;
  const flowX = incoming ? -dx : dx;
  const flowY = incoming ? -dy : dy;
  const sideX = -flowY;
  const sideY = flowX;
  const center = (size - 1) / 2;
  const scale = size * 0.31;
  const point = (along: number, across: number): readonly [number, number] => [
    center + flowX * along * scale + sideX * across * scale,
    center + flowY * along * scale + sideY * across * scale,
  ];
  const polygon = [
    point(1, 0), point(0.34, 0.34), point(0.34, 0.15), point(-0.65, 0.15),
    point(-0.65, -0.15), point(0.34, -0.15), point(0.34, -0.34),
  ];
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!containsPoint(polygon, x + 0.5, y + 0.5)) continue;
      const offset = (y * size + x) * 4;
      pixels[offset] = 76;
      pixels[offset + 1] = 216;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = 230;
    }
  }
  return pixels;
}

function containsPoint(polygon: ReadonlyArray<readonly [number, number]>, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const crosses = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
