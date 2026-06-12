/**
 * @file apply_shaper_patch.js
 * @description Apply structured agent patches to exported Shaper project JSON.
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
const patchPath = takeValue('--patch');
const outPath = takeValue('--out');
const dryRun = hasFlag('--dry-run');
const compact = hasFlag('--compact');

if (hasFlag('--help') || !projectPath || !patchPath) {
  console.log([
    'Usage:',
    '  node scripts/apply_shaper_patch.js --project zone.shaper.json --patch patch.json --out next.shaper.json',
    '',
    'Patch JSON shape:',
    '  { "rooms": [{ "room": "300:00", "name": "...", "sector": "forest",',
    '    "flags": ["dark"], "exits": [...], "libraries": [...], "com": [...] }] }',
    '',
    'Options:',
    '  --project  Exported Shaper project JSON file.',
    '  --patch    Structured Shaper patch JSON file.',
    '  --out      Optional output path. Defaults to overwriting --project.',
    '  --dry-run  Print result without writing the project file.',
    '  --compact  Print compact JSON summary.'
  ].join('\n'));
  process.exit(hasFlag('--help') ? 0 : 1);
}

// --- Constants Section ---
const directions = ['n', 'e', 's', 'w', 'u', 'd'];
const opposite = { n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u' };
const roomPatchFields = [
  'name', 'preposition', 'description', 'sector', 'flags', 'owner',
  'keywords', 'notes', 'status', 'inactive'
];

// --- Utility Section ---
const fail = message => { throw new Error(message); };
const asArray = value => Array.isArray(value) ? value : [];
const nowId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const clean = value => String(value ?? '').trim();
const normalizeText = value => String(value ?? '').replace(/\r\n/g, '\n').trim();
const zoneFromRoomNumber = roomNumber => Number(String(roomNumber).split(':')[0]);
const findRoomEntry = (doc, ref) => Object.entries(doc.rooms ?? {}).find(([id, room]) =>
  id === ref || room?.roomNumber === ref
);
const nextExtraRoomNumber = doc => {
  const prefix = `${doc.zoneNumber}:`;
  const used = Object.values(doc.rooms ?? {})
    .map(room => String(room.roomNumber ?? '').startsWith(prefix) ? Number(String(room.roomNumber).slice(prefix.length)) : 0)
    .filter(number => Number.isFinite(number) && number >= 101);
  return `${doc.zoneNumber}:${Math.max(100, ...used) + 1}`;
};
const makeRoom = (doc, spec) => {
  const roomNumber = clean(spec.roomNumber ?? spec.room ?? nextExtraRoomNumber(doc));
  const id = clean(spec.id) || `room-${roomNumber.replace(/[^a-zA-Z0-9]+/g, '-')}-${nowId('agent')}`;
  return {
    id,
    x: Number(spec.x ?? 0),
    y: Number(spec.y ?? 0),
    z: Number(spec.z ?? 0),
    kind: spec.kind === 'grid' ? 'grid' : 'extra',
    anchorRoomId: clean(spec.anchorRoomId) || null,
    roomNumber,
    status: clean(spec.status) || 'new-draft',
    name: '',
    preposition: 'in',
    description: '',
    sector: '',
    flags: [],
    owner: '',
    keywords: [],
    notes: '',
    annotations: [],
    mobs: [],
    objects: []
  };
};

// --- Room Section ---
const ensureRoom = (doc, spec, touched) => {
  const ref = clean(spec.room ?? spec.roomNumber ?? spec.id);
  const found = ref ? findRoomEntry(doc, ref) : null;
  if (found) {
    touched.add(found[0]);
    return found;
  }
  if (spec.create === false) fail(`Room not found: ${ref}`);
  const room = makeRoom(doc, spec);
  doc.rooms = { ...(doc.rooms ?? {}), [room.id]: room };
  touched.add(room.id);
  return [room.id, room];
};

const patchRoomFields = (room, spec) => {
  for (const key of roomPatchFields) {
    if (!(key in spec)) continue;
    if (key === 'description') room.description = normalizeText(spec.description);
    else if (key === 'flags') room.flags = asArray(spec.flags).map(clean).filter(Boolean);
    else if (key === 'keywords') room.keywords = asArray(spec.keywords).map((item, index) => ({
      id: clean(item.id) || `keyword-${index + 1}-${nowId('kw')}`,
      keywords: asArray(item.keywords).map(clean).filter(Boolean),
      description: normalizeText(item.description)
    })).filter(item => item.keywords.length > 0);
    else room[key] = typeof spec[key] === 'string' ? clean(spec[key]) : spec[key];
  }
};

// --- Exit Section ---
const exitKey = (roomId, direction) => `${roomId}:${direction}`;
const resolveRoomId = (doc, ref) => {
  const entry = findRoomEntry(doc, clean(ref));
  if (!entry) fail(`Target room not found: ${ref}`);
  return entry[0];
};
const upsertExit = (doc, fromId, spec, touched) => {
  const direction = clean(spec.direction);
  if (!directions.includes(direction)) fail(`Invalid exit direction: ${direction}`);
  const toId = resolveRoomId(doc, spec.to);
  const key = exitKey(fromId, direction);
  const existing = doc.exits?.[key] ?? {};
  doc.exits = {
    ...(doc.exits ?? {}),
    [key]: {
      ...existing,
      id: key,
      fromRoomId: fromId,
      direction,
      toRoomId: toId,
      isTwoWay: false,
      exitType: spec.exitType ?? existing.exitType,
      exitDescription: spec.exitDescription !== undefined ? normalizeText(spec.exitDescription) : existing.exitDescription,
      hasDoor: spec.hasDoor ?? existing.hasDoor,
      doorName: spec.doorName !== undefined ? clean(spec.doorName) : existing.doorName,
      keyMode: spec.keyMode ?? existing.keyMode,
      keyVnum: spec.keyVnum !== undefined ? clean(spec.keyVnum) : existing.keyVnum,
      doorFlags: spec.doorFlags ? asArray(spec.doorFlags).map(clean).filter(Boolean) : existing.doorFlags,
      doorWeight: spec.doorWeight ?? existing.doorWeight,
      isClimb: spec.isClimb ?? existing.isClimb,
      climbDifficulty: spec.climbDifficulty ?? existing.climbDifficulty,
      climbDamage: spec.climbDamage ?? existing.climbDamage,
      climbDirection: spec.climbDirection ?? existing.climbDirection
    }
  };
  touched.add(fromId);
  if (spec.twoWay) upsertExit(doc, toId, { ...spec, direction: opposite[direction], to: doc.rooms[fromId].roomNumber, twoWay: false }, touched);
};

// --- Library Section ---
const addLibrary = (doc, targetType, targetId, spec) => {
  const name = clean(spec.name);
  if (!name) return;
  const exists = Object.values(doc.libraries ?? {}).some(install =>
    install.targetType === targetType && install.targetId === targetId && install.name === name
  );
  if (exists && !spec.params && !spec.parameters) return;
  const id = exists ? Object.keys(doc.libraries).find(key => {
    const install = doc.libraries[key];
    return install.targetType === targetType && install.targetId === targetId && install.name === name;
  }) : nowId('lib');
  const install = doc.libraries?.[id] ?? {
    id,
    targetType,
    targetId,
    name,
    parameters: {},
    requiresSupervisorReview: Boolean(spec.requiresSupervisorReview),
    requiresLoad: spec.requiresLoad !== false,
    notes: ''
  };
  doc.libraries = {
    ...(doc.libraries ?? {}),
    [id]: {
      ...install,
      parameters: { ...(install.parameters ?? {}), ...(spec.parameters ?? spec.params ?? {}) },
      notes: spec.notes !== undefined ? String(spec.notes) : install.notes
    }
  };
};

// --- Com Section ---
const nextOrder = (doc, roomId, parentId) => Math.max(-1, ...Object.values(doc.commandNodes ?? {})
  .filter(node => node.roomId === roomId && (node.parentId ?? null) === (parentId ?? null))
  .map(node => Number(node.order ?? 0))) + 1;
const limitObject = value => {
  if (value && typeof value === 'object') {
    const chance = Number(value.chancePercent ?? 100);
    const parts = [value.world ?? 0, value.zone ?? 0, value.room ?? 0, chance >= 100 ? 0 : chance]
      .map(item => String(item).padStart(2, '0'));
    return { world: value.world ?? null, zone: value.zone ?? null, room: value.room ?? null, chancePercent: chance, raw: clean(value.raw) || parts.join('').replace(/^0+/, '') || '0' };
  }
  return { world: null, zone: null, room: null, chancePercent: 100, raw: clean(value) || '0' };
};
const addCom = (doc, roomId, spec, parentId = null) => {
  const id = clean(spec.id) || nowId('com');
  doc.commandNodes = {
    ...(doc.commandNodes ?? {}),
    [id]: {
      id,
      roomId,
      parentId,
      order: spec.order ?? nextOrder(doc, roomId, parentId),
      type: clean(spec.type || 'mobile'),
      limit: limitObject(spec.limit),
      fields: { vnum: clean(spec.vnum), name: clean(spec.name), target: 'parent', container: 'parent', position: '', ...(spec.fields ?? {}) },
      notes: String(spec.notes ?? '')
    }
  };
  asArray(spec.children).forEach(child => addCom(doc, roomId, child, id));
};

// --- Preview Section ---
const wrapAt = (roomNumber, command) => `/at ${roomNumber} ${command}`;
const editorBlock = (roomNumber, command, text) => {
  const body = normalizeText(text);
  return body ? [wrapAt(roomNumber, command), ...body.split('\n').map(line => `  ${line}`), '  [save editor]'] : [];
};
const formatCom = node => {
  const f = key => clean(node.fields?.[key]);
  const limit = node.limit?.raw || '0';
  const prefix = node.parentId ? '/com add +' : '/com add';
  if (node.type === 'equip') return [prefix, 'equip', f('vnum'), limit, f('target') || 'parent', f('position') || '<position>'].filter(Boolean).join(' ');
  if (node.type === 'give' || node.type === 'put') return [prefix, node.type, f('vnum'), limit, f(node.type === 'put' ? 'container' : 'target') || 'parent'].filter(Boolean).join(' ');
  if (node.type === 'door') return [prefix, 'door', f('direction') || 'n', f('doorAction') || 'close'].filter(Boolean).join(' ');
  return [prefix, node.type, f('vnum'), limit].filter(Boolean).join(' ');
};
const roomPreview = (doc, roomId) => {
  const room = doc.rooms[roomId];
  const commands = [];
  if (clean(room.name)) commands.push(wrapAt(room.roomNumber, `/room name ${clean(room.preposition) || 'in'}@${clean(room.name)}`));
  if (room.sector) commands.push(wrapAt(room.roomNumber, `/room sector ${room.sector}`));
  if (room.flags?.length) commands.push(wrapAt(room.roomNumber, `/room flag @${room.flags.join(' ')}`));
  commands.push(...editorBlock(room.roomNumber, '/room description', room.description));
  asArray(room.keywords).forEach(keyword => {
    const keys = asArray(keyword.keywords).map(clean).filter(Boolean);
    if (keys.length) commands.push(wrapAt(room.roomNumber, `/room kadd ${keys.join(' ')}`));
    commands.push(...editorBlock(room.roomNumber, `/room kdescription ${keys[0]}`, keyword.description));
  });
  Object.values(doc.exits ?? {}).filter(exit => exit.fromRoomId === roomId).forEach(exit => {
    const target = doc.rooms[exit.toRoomId];
    if (!target) return;
    commands.push(wrapAt(room.roomNumber, `/room exit ${exit.direction} ${target.roomNumber}`));
    if (exit.doorFlags?.length) commands.push(wrapAt(room.roomNumber, `/room dset ${exit.direction} @${exit.doorFlags.join(' ')}`));
    if ((exit.hasDoor || exit.doorFlags?.includes('door')) && clean(exit.doorName)) commands.push(wrapAt(room.roomNumber, `/room dadd ${exit.direction} ${clean(exit.doorName)}`));
    commands.push(...editorBlock(room.roomNumber, `/room edescription ${exit.direction}`, exit.exitDescription));
  });
  const nodes = Object.values(doc.commandNodes ?? {}).filter(node => node.roomId === roomId).sort((a, b) => a.order - b.order);
  if (nodes.length) commands.push(wrapAt(room.roomNumber, '/com kill all'), ...nodes.map(node => wrapAt(room.roomNumber, formatCom(node))));
  const libs = Object.values(doc.libraries ?? {}).filter(lib => lib.targetType === 'room' && lib.targetId === roomId);
  libs.forEach((lib, index) => {
    commands.push(`/lib room ${room.roomNumber} add ${lib.name}`);
    Object.entries(lib.parameters ?? {}).forEach(([key, value]) => {
      commands.push(`/lib room ${room.roomNumber} set ${index + 1} ${key} ${value}`);
    });
  });
  if (libs.some(lib => lib.requiresLoad)) commands.push(`/lib room ${room.roomNumber} load`);
  if (commands.length) commands.push(wrapAt(room.roomNumber, '/room save'));
  return commands;
};

// --- Apply Section ---
const doc = JSON.parse(readFileSync(projectPath, 'utf8'));
const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
const touched = new Set();
doc.zoneNumber = patch.zoneNumber ?? doc.zoneNumber ?? zoneFromRoomNumber(Object.values(doc.rooms ?? {})[0]?.roomNumber ?? '0:00');

asArray(patch.rooms).forEach(spec => {
  const [roomId, room] = ensureRoom(doc, spec, touched);
  patchRoomFields(room, spec);
  asArray(spec.exits).forEach(exit => upsertExit(doc, roomId, exit, touched));
  asArray(spec.libraries).forEach(lib => addLibrary(doc, 'room', roomId, lib));
  asArray(spec.com).forEach(node => addCom(doc, roomId, node));
});

doc.shared = false;
doc.updatedAt = Date.now();
if (!doc.selectedRoomId || !doc.rooms[doc.selectedRoomId]) doc.selectedRoomId = [...touched][0] ?? Object.keys(doc.rooms)[0];

const previews = [...touched].map(roomId => ({ roomId, roomNumber: doc.rooms[roomId].roomNumber, commands: roomPreview(doc, roomId) }));
const summary = { project: outPath ?? projectPath, dryRun, touchedRooms: previews.map(item => item.roomNumber), previews };
if (!dryRun) writeFileSync(outPath ?? projectPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(JSON.stringify(summary, null, compact ? 0 : 2));
