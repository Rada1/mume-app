/**
 * @file Builds the queued movement line and endpoint for the fast map overlay.
 */
// --- Logic Section ---

import { FAST_MAP_PREDICTION_COLOR } from './fastMapStyle';
import type { FastMapPoint } from './predictionPath';

export function buildPredictionOverlayGeometry(points: readonly FastMapPoint[]): {
  vertices: Float32Array;
  ranges: Map<number, { first: number; count: number }>;
} {
  const byFloor = new Map<number, number[]>();
  const appendVertex = (vertices: number[], x: number, y: number, z: number) => {
    vertices.push(x, y, z, FAST_MAP_PREDICTION_COLOR[0], FAST_MAP_PREDICTION_COLOR[1], FAST_MAP_PREDICTION_COLOR[2], 0.95);
  };
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1]!;
    const to = points[index]!;
    if (from.z !== to.z) continue;
    const vertices = byFloor.get(from.z) ?? [];
    byFloor.set(from.z, vertices);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const ox = (-dy / length) * 0.05;
    const oy = (dx / length) * 0.05;
    appendVertex(vertices, from.x + ox, from.y + oy, from.z);
    appendVertex(vertices, to.x + ox, to.y + oy, to.z);
    appendVertex(vertices, from.x - ox, from.y - oy, from.z);
    appendVertex(vertices, from.x - ox, from.y - oy, from.z);
    appendVertex(vertices, to.x + ox, to.y + oy, to.z);
    appendVertex(vertices, to.x - ox, to.y - oy, to.z);
  }

  if (points.length >= 2) {
    const endpoint = points[points.length - 1]!;
    const vertices = byFloor.get(endpoint.z) ?? [];
    byFloor.set(endpoint.z, vertices);
    for (let segment = 0; segment < 12; segment++) {
      const angleA = (segment / 12) * Math.PI * 2;
      const angleB = ((segment + 1) / 12) * Math.PI * 2;
      appendVertex(vertices, endpoint.x, endpoint.y, endpoint.z);
      appendVertex(vertices, endpoint.x + Math.cos(angleA) * 0.09, endpoint.y + Math.sin(angleA) * 0.09, endpoint.z);
      appendVertex(vertices, endpoint.x + Math.cos(angleB) * 0.09, endpoint.y + Math.sin(angleB) * 0.09, endpoint.z);
    }
  }

  const ranges = new Map<number, { first: number; count: number }>();
  const vertices: number[] = [];
  for (const [floor, floorVertices] of byFloor) {
    ranges.set(floor, { first: vertices.length / 7, count: floorVertices.length / 7 });
    vertices.push(...floorVertices);
  }
  return { vertices: Float32Array.from(vertices), ranges };
}
