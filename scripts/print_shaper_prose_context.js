/**
 * @file print_shaper_prose_context.js
 * @description Print prose-generation context from an exported Shaper project JSON file.
 */

import { readFileSync } from 'node:fs';

// --- Argument Section ---
const args = process.argv.slice(2);

const takeValue = flag => {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
};

const projectPath = takeValue('--project');
const roomRef = takeValue('--room');
const compact = args.includes('--compact');

if (args.includes('--help') || !projectPath) {
  console.log([
    'Usage:',
    '  node scripts/print_shaper_prose_context.js --project zone.shaper.json',
    '  node scripts/print_shaper_prose_context.js --project zone.shaper.json --room 31:00',
    '',
    'Options:',
    '  --project  Exported Shaper project JSON file.',
    '  --room     Optional room id or room number, such as room-0-0-0 or 31:00.',
    '  --compact  Print compact JSON instead of indented JSON.'
  ].join('\n'));
  process.exit(args.includes('--help') ? 0 : 1);
}

// --- Context Section ---
const doc = JSON.parse(readFileSync(projectPath, 'utf8'));

const roomEntities = roomId => {
  const nodes = Object.values(doc.commandNodes ?? {}).filter(node => node.roomId === roomId);
  const roots = nodes.filter(node => !node.parentId);
  return {
    mobs: roots
      .filter(node => node.type === 'mobile' || node.type === 'follow')
      .map(node => ({
        vnum: String(node.fields?.vnum ?? ''),
        name: String(node.fields?.name ?? node.fields?.vnum ?? ''),
        resetType: node.type,
        resetDetail: node.type === 'follow' ? 'follower' : ''
      })),
    objects: roots
      .filter(node => node.type === 'object' || node.type === 'hide')
      .map(node => ({
        vnum: String(node.fields?.vnum ?? ''),
        name: String(node.fields?.name ?? node.fields?.vnum ?? ''),
        resetType: node.type,
        resetDetail: ''
      }))
  };
};

const roomContext = room => {
  const exits = Object.values(doc.exits ?? {}).filter(exit => exit.fromRoomId === room.id);
  const entities = roomEntities(room.id);
  return {
    roomId: room.id,
    roomNumber: room.roomNumber,
    kind: room.kind,
    coordinates: { x: room.x, y: room.y, z: room.z },
    name: room.name,
    preposition: room.preposition,
    description: room.description,
    sector: room.sector,
    flags: room.flags ?? [],
    notes: room.notes ?? '',
    libraries: Object.values(doc.libraries ?? {})
      .filter(install => install.targetType === 'room' && install.targetId === room.id)
      .map(install => ({ name: install.name, parameters: install.parameters ?? {}, notes: install.notes ?? '' })),
    mobs: entities.mobs,
    objects: entities.objects,
    exits: exits.map(exit => {
      const target = exit.toRoomId ? doc.rooms?.[exit.toRoomId] : null;
      return {
        direction: exit.direction,
        toRoomId: exit.toRoomId ?? null,
        toRoomNumber: target?.roomNumber ?? null,
        toName: target?.name ?? '',
        hasDoor: exit.hasDoor ?? false,
        doorName: exit.doorName ?? '',
        doorFlags: exit.doorFlags ?? [],
        exitType: exit.exitType ?? '',
        exitDescription: exit.exitDescription ?? '',
        isClimb: exit.isClimb ?? false
      };
    })
  };
};

const rooms = Object.values(doc.rooms ?? {}).filter(room => !room.inactive);
const selectedRoom = roomRef
  ? rooms.find(room => room.id === roomRef || room.roomNumber === roomRef)
  : null;

if (roomRef && !selectedRoom) throw new Error(`Room not found: ${roomRef}`);

const payload = selectedRoom
  ? roomContext(selectedRoom)
  : {
      projectId: doc.id,
      projectName: doc.name,
      zoneNumber: doc.zoneNumber,
      rooms: rooms
        .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
        .map(roomContext)
    };

console.log(JSON.stringify(payload, null, compact ? 0 : 2));
