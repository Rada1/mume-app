/**
 * @file apply_shaper_room_prose.js
 * @description Patch room name/description fields in an exported Shaper project JSON file.
 */

import { readFileSync, writeFileSync } from 'node:fs';

// --- Argument Section ---
const args = process.argv.slice(2);

const takeValue = flag => {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
};

const hasFlag = flag => args.includes(flag);

const projectPath = takeValue('--project');
const roomRef = takeValue('--room');
const outPath = takeValue('--out');
const name = takeValue('--name');
const preposition = takeValue('--prep');
const desc = takeValue('--desc');
const descFile = takeValue('--desc-file');

if (hasFlag('--help') || !projectPath || !roomRef) {
  console.log([
    'Usage:',
    '  node scripts/apply_shaper_room_prose.js --project zone.shaper.json --room 31:00 --name "A quiet road" --desc-file room.txt',
    '',
    'Options:',
    '  --project    Exported Shaper project JSON file.',
    '  --room       Room id or room number, such as room-0-0-0 or 31:00.',
    '  --name       Replacement room name.',
    '  --prep       Replacement room preposition.',
    '  --desc       Replacement room description text.',
    '  --desc-file  File containing replacement room description.',
    '  --out        Optional output path. Defaults to overwriting --project.'
  ].join('\n'));
  process.exit(hasFlag('--help') ? 0 : 1);
}

if (desc && descFile) throw new Error('Use either --desc or --desc-file, not both.');

// --- Patch Section ---
const doc = JSON.parse(readFileSync(projectPath, 'utf8'));
const roomEntry = Object.entries(doc.rooms ?? {}).find(([id, room]) =>
  id === roomRef || room?.roomNumber === roomRef
);

if (!roomEntry) throw new Error(`Room not found: ${roomRef}`);

const [roomId, room] = roomEntry;
const description = descFile ? readFileSync(descFile, 'utf8') : desc;
const nextRoom = {
  ...room,
  name: name !== null ? name.trim() : room.name,
  preposition: preposition !== null ? preposition.trim() : room.preposition,
  description: description !== null ? description.replace(/\r\n/g, '\n').trim() : room.description
};

const nextDoc = {
  ...doc,
  shared: false,
  updatedAt: Date.now(),
  rooms: {
    ...doc.rooms,
    [roomId]: nextRoom
  }
};

const targetPath = outPath ?? projectPath;
writeFileSync(targetPath, `${JSON.stringify(nextDoc, null, 2)}\n`);
console.log(`Updated ${nextRoom.roomNumber} (${roomId}) in ${targetPath}`);
