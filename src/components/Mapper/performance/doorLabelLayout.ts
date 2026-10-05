/**
 * @file Hides crowded door labels at each zoom level while preserving other map text.
 */
// --- Logic Section ---

import type { FastMapTextLabel } from './model';

const CELL_SIZE = 64;
const GAP = 3;

export function declutterDoorLabels(labels: readonly FastMapTextLabel[], zoom: number): FastMapTextLabel[] {
  const visible: FastMapTextLabel[] = [];
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
  const cells = new Map<string, number[]>();

  for (const label of labels) {
    if (label.kind !== 'door') { visible.push(label); continue; }
    const pixelsPerRoom = zoom * 2640 / Math.max(1, 60 - 7 * label.z);
    const size = label.fontSize ?? 17;
    const width = label.text.length * size * 0.36 + 6 + GAP;
    const height = size + 4 + GAP;
    const box = { x: label.x * pixelsPerRoom, y: label.y * pixelsPerRoom, width, height };
    const minX = Math.floor((box.x - width / 2) / CELL_SIZE);
    const maxX = Math.floor((box.x + width / 2) / CELL_SIZE);
    const minY = Math.floor((box.y - height / 2) / CELL_SIZE);
    const maxY = Math.floor((box.y + height / 2) / CELL_SIZE);
    const keys: string[] = [];
    const nearby = new Set<number>();
    for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
      const key = `${Math.round(label.z)}:${x}:${y}`;
      keys.push(key);
      for (const index of cells.get(key) ?? []) nearby.add(index);
    }
    const overlaps = [...nearby].some(index => {
      const prior = occupied[index]!;
      return Math.abs(box.x - prior.x) < (box.width + prior.width) / 2
        && Math.abs(box.y - prior.y) < (box.height + prior.height) / 2;
    });
    if (overlaps) continue;
    const index = occupied.push(box) - 1;
    for (const key of keys) {
      const bucket = cells.get(key) ?? [];
      bucket.push(index);
      cells.set(key, bucket);
    }
    visible.push(label);
  }
  return visible;
}
