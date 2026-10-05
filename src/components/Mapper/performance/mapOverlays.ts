/**
 * @file Builds static text and line overlays from MMapper labels and door metadata.
 * Overlay data is kept separate from room meshes so the terrain path stays compact.
 */
// --- Logic Section ---

import { DIR_COUNT, DOOR_FLAG, EXIT_FLAG, type FastMapData, type FastMapTextLabel, type FastRoomOverlay } from './model';
import { INFOMARK_CLASS_COLORS, WATER, WHITE, type RGBA } from './vendor/palette';
import { infomarkLabelStyle } from './infomarkStyle';
import { buildExitConnectionGeometry } from './exitConnectionGeometry';
import { ROOM_VISITED } from './roomExploration';
const INFOMARK_LABEL_FONT_SIZE = 18;
const DOOR_LABEL_FONT_SIZE = 17;
const DOOR_LABEL_COLOR = 0xffffff;
const DOOR_LABEL_OFFSETS = [
  [0.6, 0.85], [0.6, 0.35], [0.6, 0.55], [0.6, 0.7],
  [0.6, 1.05], [0.6, 0.2],
] as const;
const OPPOSITE_DOOR_SLOT = [1, 0, 3, 2, 5, 4] as const;

function hiddenNamedDoor(map: FastMapData, slot: number): string {
  if (!(map.exitFlags[slot]! & EXIT_FLAG.DOOR) || !(map.doorFlags?.[slot]! & DOOR_FLAG.HIDDEN)) return '';
  const name = map.doorNames?.get(slot)?.trim() ?? '';
  if (!name) return '';
  const flags = map.doorFlags?.[slot] ?? 0;
  const suffix = `${flags & DOOR_FLAG.NEED_KEY ? 'L' : ''}${flags & DOOR_FLAG.NO_PICK ? '/NP' : ''}${flags & DOOR_FLAG.DELAYED ? 'd' : ''}`;
  return suffix ? `${name} [${suffix}]` : name;
}

function doorLabelStyle(): Pick<FastMapTextLabel, 'fontSize' | 'color' | 'backgroundColor' | 'backgroundAlpha'> {
  return { fontSize: DOOR_LABEL_FONT_SIZE, color: DOOR_LABEL_COLOR, backgroundColor: 0x000000, backgroundAlpha: 0.4 };
}

function appendDoorLabels(out: FastMapTextLabel[], map: FastMapData): void {
  for (let room = 0; room < map.roomCount; room++) {
    for (let direction = 0; direction < 6; direction++) {
      const slot = room * DIR_COUNT + direction;
      const name = hiddenNamedDoor(map, slot);
      if (!name) continue;
      const start = map.exitTargetStarts[slot]!;
      const end = map.exitTargetStarts[slot + 1]!;
      for (let edge = start; edge < end; edge++) {
        const target = map.exitTargets[edge]!;
        if (target >= map.roomCount) continue;
        const reverseName = hiddenNamedDoor(map, target * DIR_COUNT + OPPOSITE_DOOR_SLOT[direction]!);
        const near = Math.abs(map.x[room]! - map.x[target]!) <= 1
          && Math.abs(map.y[room]! - map.y[target]!) <= 1;
        const paired = Boolean(reverseName && near);
        if (paired && map.z[room] === map.z[target] && room > target) continue;
        const text = paired && reverseName !== name ? `${name}/${reverseName}` : name;
        const [dx, dy] = DOOR_LABEL_OFFSETS[direction]!;
        const x = paired ? (map.x[room]! + map.x[target]!) / 2 + 0.6 : map.x[room]! + dx;
        const y = paired ? (map.y[room]! + map.y[target]!) / 2 + 0.7 : map.y[room]! + dy;
        appendLabel(out, { x, y, z: map.z[room]!, text, kind: 'door', roomIndex: room, ...doorLabelStyle() });
      }
    }
  }
}

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

  appendDoorLabels(labels, map);
  return labels;
}

export function buildLiveDoorLabels(room: FastRoomOverlay | null): FastMapTextLabel[] {
  if (!room?.doorNames) return [];
  const labels: FastMapTextLabel[] = [];
  room.doorNames.forEach((text, direction) => {
    if (direction >= DOOR_LABEL_OFFSETS.length || !(room.exitFlags[direction]! & EXIT_FLAG.DOOR)
      || !(room.doorFlags?.[direction]! & DOOR_FLAG.HIDDEN)) return;
    const [dx, dy] = DOOR_LABEL_OFFSETS[direction]!;
    const flags = room.doorFlags?.[direction] ?? 0;
    const suffix = `${flags & DOOR_FLAG.NEED_KEY ? 'L' : ''}${flags & DOOR_FLAG.NO_PICK ? '/NP' : ''}${flags & DOOR_FLAG.DELAYED ? 'd' : ''}`;
    appendLabel(labels, {
      x: room.x + dx, y: room.y + dy, z: room.z, text: suffix ? `${text} [${suffix}]` : text, kind: 'door',
      ...doorLabelStyle(),
    });
  });
  return labels;
}

function appendSegment(out: number[], a: readonly [number, number, number], b: readonly [number, number, number], color: RGBA): void {
  out.push(...a, color[0], color[1], color[2], color[3], ...b, color[0], color[1], color[2], color[3]);
}

function buildVisitedRoomIndex(map: FastMapData, roomStates: Uint8Array): Map<string, number> {
  const index = new Map<string, number>();
  for (let room = 0; room < map.roomCount; room++) {
    if (roomStates[room] === ROOM_VISITED) index.set(`${Math.round(map.z[room]!)}:${map.x[room]}:${map.y[room]}`, room);
  }
  return index;
}

function pointNearVisitedRoom(map: FastMapData, visitedRooms: ReadonlyMap<string, number>, x: number, y: number, z: number): boolean {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const floor = Math.round(z);
  for (let roomX = cellX - 2; roomX <= cellX + 2; roomX++) for (let roomY = cellY - 2; roomY <= cellY + 2; roomY++) {
    const room = visitedRooms.get(`${floor}:${roomX}:${roomY}`);
    if (room !== undefined && Math.hypot(x - (map.x[room]! + 0.5), y - (map.y[room]! + 0.5)) <= 1.5) return true;
  }
  return false;
}

function appendVisibleSegment(
  out: number[], map: FastMapData, visitedRooms: ReadonlyMap<string, number>,
  a: readonly [number, number, number], b: readonly [number, number, number], color: RGBA,
): void {
  if (a[2] !== b[2]) return;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const pieces = Math.max(1, Math.ceil(length / 0.25));
  for (let piece = 0; piece < pieces; piece++) {
    const start = piece / pieces;
    const end = (piece + 1) / pieces;
    const pointAt = (fraction: number): readonly [number, number, number] => [
      a[0] + (b[0] - a[0]) * fraction,
      a[1] + (b[1] - a[1]) * fraction,
      a[2],
    ];
    const middle = (start + end) / 2;
    if (pointNearVisitedRoom(map, visitedRooms, a[0] + (b[0] - a[0]) * middle, a[1] + (b[1] - a[1]) * middle, a[2])) {
      appendSegment(out, pointAt(start), pointAt(end), color);
    }
  }
}

/** Batches MMapper LINE and ARROW marks plus exit connections by floor. */
export function buildMapOverlayGeometry(map: FastMapData, roomStates?: Uint8Array): MapOverlayGeometry {
  const marks = map.infomarks;
  const hasExploration = roomStates !== undefined;
  const states = roomStates ?? new Uint8Array();
  const revealAll = hasExploration && states.length > 0 && states.every(state => state === ROOM_VISITED);
  const visitedRooms = hasExploration && !revealAll ? buildVisitedRoomIndex(map, states) : new Map<string, number>();
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
    if (!hasExploration || revealAll) appendSegment(list, a, b, resolved);
    else appendVisibleSegment(list, map, visitedRooms, a, b, resolved);
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
      const arrowA: readonly [number, number, number] = [backX - uy * side, backY + ux * side, z1];
      const arrowB: readonly [number, number, number] = [backX + uy * side, backY - ux * side, z1];
      if (!hasExploration || revealAll) {
        appendSegment(list, arrowA, b, resolved);
        appendSegment(list, arrowB, b, resolved);
      } else {
        appendVisibleSegment(list, map, visitedRooms, arrowA, b, resolved);
        appendVisibleSegment(list, map, visitedRooms, arrowB, b, resolved);
      }
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
