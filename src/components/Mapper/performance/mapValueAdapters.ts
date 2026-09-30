/**
 * @file Normalizes room and exit flags from the bundled and live map formats.
 */
// --- Logic Section ---

import { DOOR_FLAG, EXIT_FLAG, type FastRoomExit } from './model';

type ExitRecord = Readonly<Record<string, unknown>>;

const exitFlagByName: Readonly<Record<string, number>> = {
  exit: EXIT_FLAG.EXIT, door: EXIT_FLAG.DOOR, road: EXIT_FLAG.ROAD, climb: EXIT_FLAG.CLIMB,
  random: EXIT_FLAG.RANDOM, special: EXIT_FLAG.SPECIAL, nomatch: EXIT_FLAG.NO_MATCH,
  flow: EXIT_FLAG.FLOW, noflee: EXIT_FLAG.NO_FLEE, damage: EXIT_FLAG.DAMAGE,
  fall: EXIT_FLAG.FALL, guarded: EXIT_FLAG.GUARDED, unmapped: EXIT_FLAG.UNMAPPED,
};
const doorFlagByName = Object.fromEntries(Object.entries(DOOR_FLAG).map(([name, bit]) => [normalizeFlag(name), bit]));

function normalizeFlag(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function asRecord(value: unknown): ExitRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ExitRecord : null;
}

function namedFlagBits(value: unknown, names: Readonly<Record<string, number>>): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
  if (!Array.isArray(value)) return 0;
  let bits = 0;
  for (const raw of value) if (typeof raw === 'string') bits |= names[normalizeFlag(raw)] ?? 0;
  return bits >>> 0;
}

export function mapFlagBits(value: unknown, names: readonly string[]): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
  if (!Array.isArray(value)) return 0;
  let bits = 0;
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const key = normalizeFlag(raw);
    const index = names.findIndex(name => normalizeFlag(name) === key);
    if (index >= 0) bits |= 1 << index;
  }
  return bits >>> 0;
}

export function roomEnumCode(value: unknown, values: Readonly<Record<string, number>>, max: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(max, Math.round(value)));
  if (typeof value !== 'string') return 0;
  const key = normalizeFlag(value);
  const match = Object.entries(values).find(([name]) => normalizeFlag(name) === key);
  return match?.[1] ?? 0;
}

export function ridableCode(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(2, Math.round(value)));
  if (typeof value === 'boolean') return value ? 1 : 2;
  if (typeof value !== 'string') return 0;
  const normalized = normalizeFlag(value);
  if (normalized.includes('notrid') || normalized.includes('norid')) return 2;
  return normalized.includes('rid') ? 1 : 0;
}

export function doorFlagBits(value: unknown): number {
  return namedFlagBits(value, doorFlagByName);
}

export function exitFlagsFor(value: unknown): number {
  if (value === false || value == null) return 0;
  const exit = asRecord(value);
  let flags = EXIT_FLAG.EXIT;
  if (exit?.hasDoor === true || exit?.door === true || typeof exit?.name === 'string' && exit.name.length > 0) flags |= EXIT_FLAG.DOOR;
  flags |= namedFlagBits(exit?.flags ?? exit?.exitFlags, exitFlagByName);
  if (doorFlagBits(exit?.doorFlags ?? exit?.flags) !== 0) flags |= EXIT_FLAG.DOOR;
  if (Array.isArray(exit?.flags) && exit.flags.some(flag => typeof flag === 'string' && /^(door|gate|portcullis|secret)$/i.test(flag))) flags |= EXIT_FLAG.DOOR;
  if (/^(gate|portcullis|secret)$/.test(String(exit?.name ?? '').toLowerCase())) flags |= EXIT_FLAG.DOOR;
  return flags;
}

export function liveDoorFlagBits(exit: FastRoomExit | undefined): number {
  return exit ? doorFlagBits(exit.doorFlags ?? exit.flags) : 0;
}
