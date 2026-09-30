/**
 * @file Applies an immediate door-state update after a map tap.
 */
// --- Logic Section ---

import type { MapperRoom } from './mapperTypes';

const OPPOSITE: Record<string, string> = {
  n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u',
  ne: 'sw', sw: 'ne', nw: 'se', se: 'nw',
};

function findRoomKey(rooms: Record<string, MapperRoom>, id: string): string | null {
  const normalized = id.replace(/^m_/, '');
  if (rooms[id]) return id;
  if (rooms[`m_${normalized}`]) return `m_${normalized}`;
  return rooms[normalized] ? normalized : null;
}

/** Keeps the next tap and both sides of a shared wall in sync while GMCP catches up. */
export function updateDoorInteractionState(
  rooms: Record<string, MapperRoom>,
  roomId: string,
  direction: string,
  closed: boolean,
): Record<string, MapperRoom> {
  const roomKey = findRoomKey(rooms, roomId);
  const room = roomKey ? rooms[roomKey] : null;
  if (!roomKey || !room) return rooms;
  const exit = room.exits[direction] ?? { target: '', closed, hasDoor: true };

  const nextRooms = { ...rooms };
  nextRooms[roomKey] = {
    ...room,
    exits: { ...room.exits, [direction]: { ...exit, closed, hasDoor: true } },
  };

  const target = exit.target || (exit.gmcpDestId ? `m_${exit.gmcpDestId}` : '');
  const opposite = OPPOSITE[direction];
  const targetKey = target ? findRoomKey(rooms, target) : null;
  const reverseExit = targetKey && opposite ? rooms[targetKey]?.exits[opposite] : null;
  if (targetKey && opposite && reverseExit?.target) {
    const targetRoom = rooms[targetKey]!;
    nextRooms[targetKey] = {
      ...targetRoom,
      exits: { ...targetRoom.exits, [opposite]: { ...reverseExit, closed, hasDoor: true } },
    };
  }

  return nextRooms;
}
