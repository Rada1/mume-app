/**
 * @file Tracks visited and adjacent room visibility for the fast map renderer.
 */
// --- Logic Section ---

import { DIR_COUNT, type FastMapData } from './model';

export const ROOM_HIDDEN = 0;
export const ROOM_VISITED = 1;
export const ROOM_ADJACENT = 2;

function normalizeRoomId(roomId: string): string {
  return roomId.trim().replace(/^(m_|r_)/i, '');
}

export class FastMapExploration {
  private map: FastMapData | null = null;
  private readonly indexById = new Map<string, number>();
  private readonly visitedIds = new Set<string>();
  private states = new Uint8Array();
  private revealAll = false;

  setMap(map: FastMapData): number[] {
    this.map = map;
    this.indexById.clear();
    for (let room = 0; room < map.roomCount; room++) {
      this.addRoomAlias(map.roomIds[room] ?? '', room);
      this.addRoomAlias(map.serverIds[room] ?? '', room);
    }
    // New meshes start hidden, so only upload rooms that are actually revealed.
    this.states = new Uint8Array(map.roomCount);
    return this.rebuild();
  }

  setVisitedRooms(roomIds: readonly string[], revealAll: boolean): number[] {
    this.visitedIds.clear();
    for (const id of roomIds) this.remember(id);
    this.revealAll = revealAll;
    return this.rebuild();
  }

  visitRoom(roomId: string): number[] {
    const key = normalizeRoomId(roomId);
    if (!key || this.visitedIds.has(key)) return [];
    this.remember(roomId);
    const map = this.map;
    if (!map || this.revealAll) return [];
    const room = this.resolveRoom(roomId);
    if (room === undefined) return [];
    const changed: number[] = [];
    if (this.states[room] !== ROOM_VISITED) {
      this.states[room] = ROOM_VISITED;
      changed.push(room);
    }
    for (let direction = 0; direction < DIR_COUNT; direction++) {
      const slot = room * DIR_COUNT + direction;
      for (let edge = map.exitTargetStarts[slot]!; edge < map.exitTargetStarts[slot + 1]!; edge++) {
        const target = map.exitTargets[edge]!;
        if (target < map.roomCount && this.states[target] === ROOM_HIDDEN) {
          this.states[target] = ROOM_ADJACENT;
          changed.push(target);
        }
      }
    }
    return changed;
  }

  getRoomState(room: number): number {
    return this.states[room] ?? ROOM_HIDDEN;
  }

  getRoomStates(): Uint8Array {
    return this.states;
  }

  private remember(roomId: string): void {
    const raw = roomId.trim();
    if (raw) this.visitedIds.add(raw);
    const normalized = normalizeRoomId(roomId);
    if (normalized) this.visitedIds.add(normalized);
  }

  private addRoomAlias(value: string, room: number): void {
    const raw = value.trim();
    if (!raw) return;
    this.indexById.set(raw, room);
    this.indexById.set(normalizeRoomId(raw), room);
  }

  private resolveRoom(roomId: string): number | undefined {
    return this.indexById.get(roomId.trim()) ?? this.indexById.get(normalizeRoomId(roomId));
  }

  private rebuild(): number[] {
    const map = this.map;
    const previous = this.states;
    const next = new Uint8Array(map?.roomCount ?? 0);
    if (map && this.revealAll) next.fill(ROOM_VISITED);
    else if (map) {
      const visited = new Set<number>();
      for (const id of this.visitedIds) {
        const room = this.resolveRoom(id);
        if (room !== undefined) visited.add(room);
      }
      for (const room of visited) next[room] = ROOM_VISITED;
      for (const room of visited) {
        for (let direction = 0; direction < DIR_COUNT; direction++) {
          const slot = room * DIR_COUNT + direction;
          for (let edge = map.exitTargetStarts[slot]!; edge < map.exitTargetStarts[slot + 1]!; edge++) {
            const target = map.exitTargets[edge]!;
            if (target < map.roomCount && next[target] === ROOM_HIDDEN) next[target] = ROOM_ADJACENT;
          }
        }
      }
    }
    this.states = next;
    const changed: number[] = [];
    for (let room = 0; room < next.length; room++) {
      if (next[room] !== (previous[room] ?? ROOM_HIDDEN)) changed.push(room);
    }
    return changed;
  }
}
