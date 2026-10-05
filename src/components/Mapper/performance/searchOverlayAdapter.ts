/**
 * @file Converts shared mapper search results into worker-friendly room coordinates.
 */
// --- Logic Section ---

import type { FastMapSearchOverlay, FastMapSearchPoint } from './protocol';

interface SearchRoom {
  x?: unknown;
  y?: unknown;
  z?: unknown;
}

export interface SearchOverlayInput {
  activeMapFilter?: string | null;
  mapSearchQuery?: string;
  matchedRoomIds?: ReadonlySet<string>;
  closestRoomId?: string | null;
  selectedRoomId?: string | null;
  hoveredSearchRoomId?: string | null;
  filterPathIds?: readonly string[];
  rooms: Readonly<Record<string, unknown>>;
  preloaded: Readonly<Record<string, readonly unknown[]>>;
  canonical?: {
    x: Int32Array;
    y: Int32Array;
    z: Int32Array;
    byServerId: ReadonlyMap<number, number>;
  } | null;
}

const FILTER_COLORS: Readonly<Record<string, readonly [number, number, number]>> = {
  mounts: [0.9, 0.49, 0.13], shops: [0.95, 0.77, 0.06], guilds: [0.61, 0.35, 0.72],
  travel: [0.16, 0.5, 0.73], resources: [0.18, 0.8, 0.44], services: [1, 0.41, 0.71],
  danger: [0.91, 0.3, 0.24], mobs: [0.75, 0.22, 0.17], quests: [0.1, 0.74, 0.61],
};

const FLAG_CATEGORIES: Readonly<Record<string, string>> = {
  HORSE: 'mounts', MULE: 'mounts', PACK_HORSE: 'mounts', TRAINED_HORSE: 'mounts', ROHIRRIM: 'mounts', WARG: 'mounts', STABLE: 'mounts',
  SHOP: 'shops', WEAPON_SHOP: 'shops', ARMOUR_SHOP: 'shops', FOOD_SHOP: 'shops', PET_SHOP: 'shops',
  GUILD: 'guilds', WARRIOR_GUILD: 'guilds', CLERIC_GUILD: 'guilds', RANGER_GUILD: 'guilds', MAGE_GUILD: 'guilds', SCOUT_GUILD: 'guilds',
  BOAT: 'travel', FERRY: 'travel', COACH: 'travel', HERB: 'resources', WATER: 'resources', FOOD: 'resources', RENT: 'services', MAIL: 'services',
  DEATHTRAP: 'danger', AGGRESSIVE_MOB: 'mobs', ELITE_MOB: 'mobs', SUPER_MOB: 'mobs', QUEST_MOB: 'quests',
};

function normalizeId(roomId: string): string {
  return roomId.trim().replace(/^(m_|r_)/, '');
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toPoint(input: SearchOverlayInput, roomId: string): FastMapSearchPoint | null {
  const key = normalizeId(roomId);
  const canonicalIndex = input.canonical?.byServerId.get(Number(key));
  if (canonicalIndex !== undefined) {
    return { x: input.canonical!.x[canonicalIndex]! + 1.5, y: input.canonical!.y[canonicalIndex]! - 0.5, z: input.canonical!.z[canonicalIndex]! };
  }
  const local = input.rooms[roomId] ?? input.rooms[`m_${key}`] ?? input.rooms[key];
  if (typeof local === 'object' && local !== null) {
    const room = local as SearchRoom;
    if (finite(room.x) && finite(room.y)) return { x: room.x + 0.5, y: -room.y + 0.5, z: finite(room.z) ? room.z : 0 };
  }
  const tuple = input.preloaded[key];
  if (!tuple || !finite(tuple[0]) || !finite(tuple[1])) return null;
  return { x: tuple[0] + 0.5, y: -tuple[1] + 0.5, z: finite(tuple[2]) ? tuple[2] : 0 };
}

function getColor(filter: string | null | undefined): readonly [number, number, number] {
  const key = filter || 'resources';
  return FILTER_COLORS[key] ?? FILTER_COLORS[FLAG_CATEGORIES[key.toUpperCase()]] ?? [1, 1, 1];
}

export function buildSearchOverlay(input: SearchOverlayInput): FastMapSearchOverlay {
  const active = Boolean(input.activeMapFilter || input.mapSearchQuery?.trim());
  const matches = active ? [...(input.matchedRoomIds ?? [])].map(id => toPoint(input, id)).filter((point): point is FastMapSearchPoint => point !== null) : [];
  const path = active ? (input.filterPathIds ?? []).map(id => toPoint(input, id)) : [];
  return {
    matches,
    path,
    target: active && input.closestRoomId ? toPoint(input, input.closestRoomId) : null,
    selectedRoom: input.selectedRoomId ? toPoint(input, input.selectedRoomId) : null,
    hovered: active && input.hoveredSearchRoomId ? toPoint(input, input.hoveredSearchRoomId) : null,
    color: getColor(input.activeMapFilter),
  };
}
