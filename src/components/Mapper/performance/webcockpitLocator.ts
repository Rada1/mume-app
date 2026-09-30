/**
 * @file Fast-mode room locator adapted from WebCockpit's MMapper tracker.
 * Uses server IDs first, then directed exits, then room name and description.
 */
// --- Logic Section ---

type RoomTuple = readonly unknown[];
type RoomIndex = Readonly<Record<string, RoomTuple>>;
type RawExit = { target?: unknown; targets?: unknown; id?: unknown; to_vnum?: unknown; to?: unknown };
export interface PreparedRoomIndex {
  source: RoomIndex;
  roomCount: number;
  byId: ReadonlyMap<string, string>;
  byServerId: ReadonlyMap<string, string>;
  byNameDesc: ReadonlyMap<string, readonly string[]>;
}

const DIRS = ['n', 's', 'e', 'w', 'u', 'd'] as const;
const OPPOSITE: Readonly<Record<string, string>> = { n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u' };
const EXIT_ALIASES: Readonly<Record<string, string>> = {
  north: 'n', south: 's', east: 'e', west: 'w', up: 'u', down: 'd',
};

export interface RoomObservation {
  id?: number | string;
  num?: number | string;
  vnum?: number | string;
  name?: string;
  desc?: string;
  exits?: Readonly<Record<string, unknown>>;
}

export interface LocationResult {
  roomId: string | null;
  matchedBy: 'id' | 'learned' | 'direction' | 'text' | 'none';
}

export interface LocatorState {
  lastRoomId: string | null;
  pendingDirection: string | null;
  learnedIds: Map<string, string>;
}

export function createLocatorState(): LocatorState {
  return { lastRoomId: null, pendingDirection: null, learnedIds: new Map() };
}

const preparedIndexes = new WeakMap<object, PreparedRoomIndex>();

export function prepareRoomIndex(source: RoomIndex): PreparedRoomIndex {
  const cached = preparedIndexes.get(source);
  if (cached) return cached;
  const byId = new Map<string, string>();
  const byServerId = new Map<string, string>();
  const names = new Map<string, string[]>();
  for (const key of Object.keys(source)) {
    const tuple = source[key];
    byId.set(normalizeRoomId(key), key);
    const sid = normalizeRoomId(tuple?.[6]);
    if (sid && sid !== '0') byServerId.set(sid, key);
    const hash = `${normalizedText(tuple?.[5])}\n${normalizedText(tuple?.[17])}`;
    const matches = names.get(hash);
    if (matches) matches.push(key);
    else names.set(hash, [key]);
  }
  const prepared = { source, roomCount: byId.size, byId, byServerId, byNameDesc: names };
  preparedIndexes.set(source, prepared);
  return prepared;
}

export function parseMovedDirection(payload: unknown): string | null {
  const raw = typeof payload === 'string'
    ? payload
    : typeof payload === 'object' && payload !== null
      ? (payload as { dir?: unknown; direction?: unknown }).dir ?? (payload as { direction?: unknown }).direction
      : null;
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  const dir = EXIT_ALIASES[normalized] ?? normalized.slice(0, 1);
  return DIRS.includes(dir as (typeof DIRS)[number]) ? dir : null;
}

function normalizedText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().toLowerCase() : '';
}

function normalizeRoomId(value: unknown): string {
  return String(value ?? '').trim().replace(/^(m_|r_)/, '');
}

function roomExits(tuple: RoomTuple | undefined): Readonly<Record<string, unknown>> {
  const value = tuple?.[4];
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}

export function exitTargetIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(exitTargetIds);
  if (typeof value === 'string' || typeof value === 'number') {
    const target = normalizeRoomId(value);
    return target ? [target] : [];
  }
  if (value === null || typeof value !== 'object') return [];
  const exit = value as RawExit;
  if (Array.isArray(exit.targets)) return exit.targets.flatMap(exitTargetIds);
  const target = exit.target ?? exit.id ?? exit.to_vnum ?? exit.to;
  return target === undefined || target === null ? [] : exitTargetIds(target);
}

function directionEntries(exits: Readonly<Record<string, unknown>>): Array<[string, unknown]> {
  return Object.entries(exits).flatMap(([key, value]) => {
    const dir = EXIT_ALIASES[key.toLowerCase()] ?? key.toLowerCase().slice(0, 1);
    return DIRS.includes(dir as (typeof DIRS)[number]) && value !== false && value != null ? [[dir, value]] : [];
  });
}

function compatibleId(tuple: RoomTuple, id: string | null): boolean {
  const serverId = normalizeRoomId(tuple[6]);
  return id === null || !serverId || serverId === '0' || serverId === id;
}

function infoExitSet(exits: RoomObservation['exits']): Set<string> | null {
  if (!exits) return null;
  return new Set(directionEntries(exits).map(([dir]) => dir));
}

function sameExitSet(tuple: RoomTuple, expected: Set<string>): boolean {
  const actual = new Set(directionEntries(roomExits(tuple)).map(([dir]) => dir));
  return actual.size === expected.size && [...expected].every(dir => actual.has(dir));
}

export function locateRoom(index: PreparedRoomIndex, state: LocatorState, info: RoomObservation): LocationResult {
  const { source, byId, byServerId } = index;
  const idValue = info.id ?? info.num ?? info.vnum;
  const id = idValue == null || String(idValue) === '0' ? null : normalizeRoomId(idValue);

  if (id) {
    const direct = byServerId.get(id) ?? byId.get(id);
    if (direct) return { roomId: direct, matchedBy: 'id' };
    const learned = state.learnedIds.get(id);
    if (learned) {
      const tuple = source[learned];
      if (tuple && normalizedText(tuple[5]) === normalizedText(info.name)) return { roomId: learned, matchedBy: 'learned' };
      state.learnedIds.delete(id);
    }
  }

  const name = normalizedText(info.name);
  if (state.lastRoomId && state.pendingDirection) {
    const exits = roomExits(source[state.lastRoomId]);
    const raw = exits[state.pendingDirection] ?? exits[Object.keys(EXIT_ALIASES).find(k => EXIT_ALIASES[k] === state.pendingDirection) ?? ''];
    const keys = [...new Set(exitTargetIds(raw).map(dest => byId.get(dest) ?? byServerId.get(dest)).filter((key): key is string => !!key))];
    const matches = keys.filter(key => {
      const tuple = source[key];
      return !!tuple && normalizedText(tuple[5]) === name && compatibleId(tuple, id);
    });
    if (matches.length === 1) return { roomId: matches[0]!, matchedBy: 'direction' };
  }

  const desc = normalizedText(info.desc);
  let candidates = [...(index.byNameDesc.get(`${name}\n${desc}`) ?? [])]
    .filter(key => compatibleId(source[key] ?? [], id));
  if (candidates.length > 1 && state.lastRoomId && state.pendingDirection) {
    const exits = roomExits(source[state.lastRoomId]);
    const raw = exits[state.pendingDirection];
    const matches = [...new Set(exitTargetIds(raw)
      .map(dest => byId.get(dest) ?? byServerId.get(dest))
      .filter((key): key is string => !!key && candidates.includes(key)))];
    if (matches.length === 1) candidates = [matches[0]!];
  }
  if (candidates.length > 1) {
    const expected = infoExitSet(info.exits);
    if (expected) {
      const exact = candidates.filter(key => sameExitSet(source[key]!, expected));
      if (exact.length === 1) candidates = exact;
    }
  }
  return candidates.length === 1
    ? { roomId: candidates[0]!, matchedBy: 'text' }
    : { roomId: null, matchedBy: 'none' };
}

/** Learns server IDs for rooms identified through movement or matching text. */
export function learnRoomIds(index: PreparedRoomIndex, state: LocatorState, info: RoomObservation, roomId: string): void {
  const { source, byId, byServerId } = index;
  const add = (serverId: unknown, target: string | null) => {
    if (serverId == null || !target || String(serverId) === '0') return;
    const id = normalizeRoomId(serverId);
    const resolved = byId.get(target) ?? byServerId.get(target);
    const room = resolved ? source[resolved] : undefined;
    if (id && room && resolved && normalizeRoomId(room[6]) !== id) state.learnedIds.set(id, resolved);
  };
  add(info.id ?? info.num ?? info.vnum, roomId);
  if (!info.exits) return;
  const exits = roomExits(source[roomId]);
  for (const [dir, value] of directionEntries(info.exits)) {
    const raw = exits[dir];
    const targets = exitTargetIds(raw);
    const serverId = value !== null && typeof value === 'object' ? (value as { id?: unknown }).id : undefined;
    if (targets.length === 1) {
      add(serverId, targets[0]!);
      continue;
    }
    if (serverId == null) continue;
    const id = normalizeRoomId(serverId);
    const matches = targets.filter(target => {
      const key = byId.get(target) ?? byServerId.get(target);
      return !!key && normalizeRoomId(source[key]?.[6]) === id;
    });
    if (matches.length === 1) add(serverId, matches[0]!);
  }
}
