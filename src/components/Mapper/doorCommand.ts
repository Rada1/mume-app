/**
 * @file Recognizes explicit door commands so the mapper can update optimistically.
 */
// --- Logic Section ---

export type DoorDirection = 'n' | 's' | 'e' | 'w' | 'u' | 'd' | 'ne' | 'nw' | 'se' | 'sw';

export interface DoorCommandUpdate {
  direction: DoorDirection;
  closed: boolean;
  roomId?: string | null;
}

interface DoorExitName {
  name?: string;
  doorName?: string;
  hasDoor?: boolean;
  flags?: readonly string[];
}

const DIRECTION_ALIASES: Record<string, DoorDirection> = {
  n: 'n', north: 'n',
  s: 's', south: 's',
  e: 'e', east: 'e',
  w: 'w', west: 'w',
  u: 'u', up: 'u',
  d: 'd', down: 'd',
  ne: 'ne', northeast: 'ne',
  nw: 'nw', northwest: 'nw',
  se: 'se', southeast: 'se',
  sw: 'sw', southwest: 'sw',
};

function normalizeDirection(value: string): DoorDirection | null {
  return DIRECTION_ALIASES[value.trim().toLowerCase()] ?? null;
}

function normalizeDoorName(value: string): string {
  return value.trim().replace(/^the\s+/i, '').replace(/["']/g, '').toLowerCase();
}

function directionForNamedDoor(target: string, exits: Readonly<Record<string, DoorExitName>>): DoorDirection | null {
  const normalizedTarget = normalizeDoorName(target);
  const matches = new Set<DoorDirection>();
  Object.entries(exits).forEach(([direction, exit]) => {
    const resolvedDirection = normalizeDirection(direction);
    if (!resolvedDirection || !exit) return;
    const isDoor = exit.hasDoor || exit.doorName || exit.flags?.some(flag => /door|gate|portcullis|secret/i.test(flag));
    if (!isDoor) return;
    const nameMatches = [exit.doorName, exit.name]
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .some(name => normalizeDoorName(name) === normalizedTarget);
    if (nameMatches) matches.add(resolvedDirection);
  });

  return matches.size === 1 ? [...matches][0]! : null;
}

export function parseDoorCommand(
  command: string,
  currentRoomExits?: Readonly<Record<string, DoorExitName>>,
): DoorCommandUpdate | null {
  const normalized = command.trim().toLowerCase();
  const match = normalized.match(/^(open|close)\s+(?:(?:the\s+)?exit\s+)?(.+)$/);
  if (!match) return null;

  const target = match[2]!.trim();
  const direction = normalizeDirection(target)
    ?? directionForNamedDoor(target.replace(/^(?:the\s+)?exit\s+/i, ''), currentRoomExits ?? {});
  if (!direction) return null;

  return { direction, closed: match[1] === 'close' };
}
