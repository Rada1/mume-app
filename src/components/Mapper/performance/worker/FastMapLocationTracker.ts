/**
 * @file Worker-owned MUME room tracking adapted from WebCockpit's MMapper locator.
 * Builds the lookup index once per map; game events only update navigation state.
 */
// --- Logic Section ---

import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, type FastMapData } from '../model';
import { createLocatorState, exitTargetIds, learnRoomIds, locateRoom, parseMovedDirection, prepareRoomIndex, type LocationResult, type LocatorState, type PreparedRoomIndex, type RoomObservation } from '../webcockpitLocator';

const DIRECTIONS = ['n', 's', 'e', 'w', 'u', 'd'] as const;
const DIRECTION_ALIASES: Readonly<Record<string, string>> = {
  north: 'n', south: 's', east: 'e', west: 'w', up: 'u', down: 'd',
};

export class FastMapLocationTracker {
  private index: PreparedRoomIndex | null = null;
  private state: LocatorState = createLocatorState();

  setMap(map: FastMapData): void {
    const rooms: Record<string, readonly unknown[]> = {};
    for (let room = 0; room < map.roomCount; room++) {
      const exits: Record<string, { target?: string; targets?: string[] }> = {};
      for (const direction of DIRECTIONS) {
        const slot = room * DIR_COUNT + DIR_SLOT[direction];
        if ((map.exitFlags[slot]! & EXIT_FLAG.EXIT) === 0) continue;
        const start = map.exitTargetStarts[slot]!;
        const end = map.exitTargetStarts[slot + 1]!;
        const targets = Array.from(map.exitTargets.subarray(start, end), index => map.roomIds[index]).filter((id): id is string => !!id);
        if (targets.length === 1) exits[direction] = { target: targets[0]! };
        else if (targets.length > 1) exits[direction] = { targets };
      }
      const id = map.roomIds[room] ?? String(room);
      const tuple = [map.x[room], -map.y[room]!, map.z[room], map.terrain[room], exits, map.names[room], map.serverIds[room], [], [], '', 0, 1, '', '', '', '', '', map.descriptions[room]];
      rooms[id] = tuple;
    }
    this.index = prepareRoomIndex(rooms);
    this.state = createLocatorState();
  }

  seedRoom(roomId: string | null): void {
    if (!this.index || !roomId) return;
    const normalized = roomId.trim().replace(/^(m_|r_)/, '');
    this.state.lastRoomId = this.index.byId.get(normalized) ?? null;
  }

  apply(event: 'moved' | 'room-info', data: unknown): LocationResult | null {
    const index = this.index;
    if (!index) return null;
    if (event === 'moved') {
      let steppedRoom: string | null = null;
      if (this.state.pendingDirection && this.state.lastRoomId) {
        steppedRoom = this.followExit(this.state.lastRoomId, this.state.pendingDirection);
        if (steppedRoom) this.state.lastRoomId = steppedRoom;
      }
      this.state.pendingDirection = parseMovedDirection(data);
      return steppedRoom ? { roomId: steppedRoom, matchedBy: 'direction' } : null;
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
    const info = data as RoomObservation;
    const result = locateRoom(index, this.state, info);
    const roomNumber = info.id ?? info.num ?? info.vnum;
    const normalizedRoomNumber = String(roomNumber ?? '').trim();
    const hasRoomNumber = normalizedRoomNumber !== '' && normalizedRoomNumber !== '0';
    const pendingDirection = this.state.pendingDirection;
    this.state.pendingDirection = null;
    if (result.roomId) {
      this.state.lastRoomId = result.roomId;
      learnRoomIds(index, this.state, info, result.roomId);
      return result;
    }

    // MUME reports room number 0 in darkness. When its room name and exits are
    // hidden too, keep MMapper-style direction tracking alive through a unique
    // mapped exit instead of losing the player's location on the first dark step.
    const darkStep = !hasRoomNumber && this.state.lastRoomId && pendingDirection
      ? this.followExit(this.state.lastRoomId, pendingDirection)
      : null;
    if (!darkStep) return result;
    this.state.lastRoomId = darkStep;
    return { roomId: darkStep, matchedBy: 'direction' };
  }

  private followExit(roomId: string, direction: string): string | null {
    const tuple = this.index?.source[roomId];
    const exits = tuple?.[4];
    if (!exits || typeof exits !== 'object' || Array.isArray(exits)) return null;
    const exitRecord = exits as Readonly<Record<string, unknown>>;
    const alias = Object.keys(DIRECTION_ALIASES).find(key => DIRECTION_ALIASES[key] === direction);
    const raw = exitRecord[direction] ?? exitRecord[alias ?? ''];
    const targets = exitTargetIds(raw);
    if (targets.length !== 1) return null;
    const normalized = targets[0]!;
    return this.index?.byId.get(normalized) ?? this.index?.byServerId.get(normalized) ?? null;
  }
}
