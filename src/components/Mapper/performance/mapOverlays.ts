/**
 * @file Builds static text and line overlays from MMapper labels and door metadata.
 * Overlay data is kept separate from room meshes so the terrain path stays compact.
 */
// --- Logic Section ---

import { type FastMapData, type FastMapTextLabel, type FastRoomOverlay } from './model';
import { INFOMARK_CLASS_COLORS, WATER, WHITE, type RGBA } from './vendor/palette';
import { infomarkLabelStyle } from './infomarkStyle';
import { buildExitConnectionGeometry } from './exitConnectionGeometry';
const INFOMARK_LABEL_FONT_SIZE = 18;
const DOOR_LABEL_FONT_SIZE = 18;
const DOOR_LABEL_COLOR = 0xc0c0c0;

export interface MapLineBatch {
  z: number;
  vertices: Float32Array;
}

function colorHex(color: RGBA): number {
  return (Math.round(color[0] * 255) << 16) | (Math.round(color[1] * 255) << 8) | Math.round(color[2] * 255);
}

function infomarkColor(map: FastMapData, index: number): number {
  const cls = map.infomarks?.cls[index] ?? 0;
  const color = INFOMARK_CLASS_COLORS[cls] ?? WHITE;
  return colorHex(color ?? (cls === 2 ? WATER : WHITE));
}

function appendLabel(out: FastMapTextLabel[], label: FastMapTextLabel): void {
  const text = label.text.replace(/[\r\n\t]/g, ' ').trim();
  if (!text) return;
  out.push({ ...label, text: text.slice(0, 120) });
}

/** Returns map notes and named doors as worker-friendly text labels. */
export function buildMapTextLabels(map: FastMapData): FastMapTextLabel[] {
  const labels: FastMapTextLabel[] = [];
  for (const label of map.labels ?? []) appendLabel(labels, label);

  const marks = map.infomarks;
  if (marks) {
    for (let i = 0; i < marks.count; i++) {
      if (marks.type[i] !== 0) continue;
      appendLabel(labels, {
        // Keep the exact MMapper infomark point in the translated room grid.
        x: marks.x1[i]! / 100 + 1,
        y: marks.y1[i]! / 100 - 1,
        z: marks.z1[i]!,
        text: marks.text[i] ?? '',
        anchor: 'mmapper',
        rotation: marks.angle[i] ?? 0,
        fontSize: INFOMARK_LABEL_FONT_SIZE,
        ...infomarkLabelStyle(marks.cls[i] ?? 0),
      });
    }
  }

  map.doorNames?.forEach((text, slot) => {
    const room = Math.floor(slot / 7);
    const direction = slot % 7;
    if (room >= map.roomCount || !text) return;
    const x = map.x[room]!;
    const y = map.y[room]!;
    const offsets = [
      [0.5, 0.78], [0.5, 0.22], [0.78, 0.5], [0.22, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5],
    ] as const;
    const [dx, dy] = offsets[direction]!;
    appendLabel(labels, {
      x: x + dx, y: y + dy, z: map.z[room]!, text,
      fontSize: DOOR_LABEL_FONT_SIZE, color: DOOR_LABEL_COLOR, roomIndex: room,
    });
  });
  return labels;
}

export function buildLiveDoorLabels(room: FastRoomOverlay | null): FastMapTextLabel[] {
  if (!room?.doorNames) return [];
  const offsets = [
    [0.5, 0.78], [0.5, 0.22], [0.78, 0.5], [0.22, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5],
  ] as const;
  const labels: FastMapTextLabel[] = [];
  room.doorNames.forEach((text, direction) => {
    const [dx, dy] = offsets[direction] ?? offsets[6];
    appendLabel(labels, {
      x: room.x + dx, y: room.y + dy, z: room.z, text,
      fontSize: DOOR_LABEL_FONT_SIZE, color: DOOR_LABEL_COLOR,
    });
  });
  return labels;
}

function appendSegment(out: number[], a: readonly [number, number, number], b: readonly [number, number, number], color: RGBA): void {
  out.push(...a, color[0], color[1], color[2], color[3], ...b, color[0], color[1], color[2], color[3]);
}

/** Batches MMapper LINE and ARROW marks plus exit connections by floor. */
export function buildMapOverlayGeometry(map: FastMapData, roomStates?: Uint8Array): MapOverlayGeometry {
  const marks = map.infomarks;
  const floors = new Map<number, number[]>();
  if (marks) for (let i = 0; i < marks.count; i++) {
    const type = marks.type[i]!;
    if (type !== 1 && type !== 2) continue;
    const z1 = marks.z1[i]!;
    const z2 = marks.z2[i]!;
    if (z1 !== z2) continue;
    const list = floors.get(z1) ?? [];
    floors.set(z1, list);
    const a: [number, number, number] = [marks.x1[i]! / 100 + 1, marks.y1[i]! / 100 - 1, z1];
    const b: [number, number, number] = [marks.x2[i]! / 100 + 1, marks.y2[i]! / 100 - 1, z2];
    const cls = marks.cls[i] ?? 0;
    const color = INFOMARK_CLASS_COLORS[cls] ?? WHITE;
    const resolved = color ?? (cls === 2 ? WATER : WHITE);
    appendSegment(list, a, b, resolved);
    if (type === 2) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const head = Math.min(0.18, length * 0.35);
      const backX = b[0] - ux * head;
      const backY = b[1] - uy * head;
      const side = head * 0.55;
      appendSegment(list, [backX - uy * side, backY + ux * side, z1], b, resolved);
      appendSegment(list, [backX + uy * side, backY - ux * side, z1], b, resolved);
    }
  }
  const connections = buildExitConnectionGeometry(map, roomStates);
  for (const batch of connections.lines) {
    const list = floors.get(batch.z) ?? [];
    floors.set(batch.z, list);
    for (const value of batch.vertices) list.push(value);
  }
  return {
    lines: [...floors.entries()].map(([z, vertices]) => ({ z, vertices: Float32Array.from(vertices) })),
    arrows: connections.arrows,
  };
}

export interface MapOverlayGeometry {
  lines: MapLineBatch[];
  arrows: MapLineBatch[];
}

export function buildMapLineBatches(map: FastMapData): MapLineBatch[] {
  return buildMapOverlayGeometry(map).lines;
}
