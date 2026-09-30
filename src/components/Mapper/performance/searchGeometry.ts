/**
 * @file Builds one-shot WebGL geometry for search beacons and result paths.
 */
// --- Logic Section ---

import type { FastMapSearchOverlay, FastMapSearchPoint } from './protocol';

export interface SearchFloorGeometry {
  floor: number;
  vertices: Float32Array;
}

type Color = readonly [number, number, number];

function appendVertex(vertices: number[], point: FastMapSearchPoint, color: Color, alpha: number): void {
  vertices.push(point.x, point.y, point.z, color[0], color[1], color[2], alpha);
}

function appendTriangle(vertices: number[], center: FastMapSearchPoint, a: FastMapSearchPoint, b: FastMapSearchPoint, color: Color, alpha: number): void {
  appendVertex(vertices, center, color, alpha);
  appendVertex(vertices, a, color, alpha);
  appendVertex(vertices, b, color, alpha);
}

function appendDisk(vertices: number[], center: FastMapSearchPoint, radius: number, color: Color, alpha: number, segments = 16): void {
  for (let index = 0; index < segments; index++) {
    const angleA = index / segments * Math.PI * 2;
    const angleB = (index + 1) / segments * Math.PI * 2;
    const a = { ...center, x: center.x + Math.cos(angleA) * radius, y: center.y + Math.sin(angleA) * radius };
    const b = { ...center, x: center.x + Math.cos(angleB) * radius, y: center.y + Math.sin(angleB) * radius };
    appendTriangle(vertices, center, a, b, color, alpha);
  }
}

function appendRing(vertices: number[], center: FastMapSearchPoint, radius: number, width: number, color: Color, alpha: number): void {
  const segments = 20;
  for (let index = 0; index < segments; index++) {
    const angleA = index / segments * Math.PI * 2;
    const angleB = (index + 1) / segments * Math.PI * 2;
    const outerA = { ...center, x: center.x + Math.cos(angleA) * radius, y: center.y + Math.sin(angleA) * radius };
    const outerB = { ...center, x: center.x + Math.cos(angleB) * radius, y: center.y + Math.sin(angleB) * radius };
    const innerA = { ...center, x: center.x + Math.cos(angleA) * (radius - width), y: center.y + Math.sin(angleA) * (radius - width) };
    const innerB = { ...center, x: center.x + Math.cos(angleB) * (radius - width), y: center.y + Math.sin(angleB) * (radius - width) };
    appendTriangle(vertices, outerA, innerA, outerB, color, alpha);
    appendTriangle(vertices, outerB, innerA, innerB, color, alpha);
  }
}

function appendSegment(vertices: number[], from: FastMapSearchPoint, to: FastMapSearchPoint, color: Color): void {
  if (from.z !== to.z) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!length) return;
  const ox = -dy / length * 0.055;
  const oy = dx / length * 0.055;
  const a = { ...from, x: from.x + ox, y: from.y + oy };
  const b = { ...to, x: to.x + ox, y: to.y + oy };
  const c = { ...from, x: from.x - ox, y: from.y - oy };
  const d = { ...to, x: to.x - ox, y: to.y - oy };
  appendTriangle(vertices, a, b, c, color, 0.78);
  appendTriangle(vertices, c, b, d, color, 0.78);
}

export function buildSearchGeometry(overlay: FastMapSearchOverlay): SearchFloorGeometry[] {
  const floors = new Map<number, number[]>();
  const floorVertices = (floor: number) => {
    const vertices = floors.get(floor) ?? [];
    floors.set(floor, vertices);
    return vertices;
  };

  for (const point of overlay.matches) {
    if (overlay.target?.x === point.x && overlay.target.y === point.y && overlay.target.z === point.z) continue;
    const vertices = floorVertices(point.z);
    appendDisk(vertices, point, 0.28, overlay.color, 0.12);
    appendRing(vertices, point, 0.22, 0.045, overlay.color, 0.92);
    appendDisk(vertices, point, 0.065, overlay.color, 1);
    appendDisk(vertices, point, 0.025, [1, 1, 1], 1, 10);
  }

  let previous: FastMapSearchPoint | null = null;
  for (const point of overlay.path) {
    if (point && previous) appendSegment(floorVertices(point.z), previous, point, overlay.color);
    if (point) appendDisk(floorVertices(point.z), point, 0.075, overlay.color, 0.95, 12);
    previous = point;
  }

  if (overlay.target) {
    const vertices = floorVertices(overlay.target.z);
    appendDisk(vertices, overlay.target, 0.34, overlay.color, 0.14);
    appendRing(vertices, overlay.target, 0.3, 0.065, overlay.color, 1);
    appendRing(vertices, overlay.target, 0.17, 0.035, [1, 1, 1], 0.95);
    appendDisk(vertices, overlay.target, 0.055, overlay.color, 1, 12);
  }

  if (overlay.hovered) appendRing(floorVertices(overlay.hovered.z), overlay.hovered, 0.4, 0.04, [1, 1, 1], 1);
  return [...floors].map(([floor, vertices]) => ({ floor, vertices: Float32Array.from(vertices) }));
}
