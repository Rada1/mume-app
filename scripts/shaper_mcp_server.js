#!/usr/bin/env node
/**
 * @file shaper_mcp_server.js
 * @description Local Model Context Protocol (MCP) server for Shaper.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Configuration Section ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(__dirname, '..');
const defaultProjectPath = join(workspaceRoot, 'projects', 'active.shaper.json');
const aiRequestPath = join(workspaceRoot, 'src', 'shaper', 'ai_request.json');
const aiResponsePath = join(workspaceRoot, 'src', 'shaper', 'ai_response.json');

// --- Helper Constants & Utils ---
const directions = ['n', 'e', 's', 'w', 'u', 'd'];
const opposite = { n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u' };
const roomPatchFields = [
  'name', 'preposition', 'description', 'sector', 'flags', 'owner',
  'keywords', 'notes', 'status', 'inactive'
];

const fail = message => { throw new Error(message); };
const asArray = value => Array.isArray(value) ? value : [];
const nowId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const clean = value => String(value ?? '').trim();
const normalizeText = value => String(value ?? '').replace(/\r\n/g, '\n').trim();
const zoneFromRoomNumber = roomNumber => Number(String(roomNumber).split(':')[0]);

const validateProjectForMcp = doc => Object.values(doc.rooms ?? {}).flatMap(room => {
  const issues = [];
  if (!clean(room.roomNumber)) issues.push({ severity: 'error', roomId: room.id, message: 'Room number is required.' });
  if (!clean(room.name)) issues.push({ severity: 'error', roomId: room.id, message: 'Room name is required.' });
  if (!clean(room.description)) issues.push({ severity: 'warning', roomId: room.id, message: 'Room description is empty.' });
  return issues;
});

const roomMatchesZone = (room, zoneNumber) =>
  !zoneNumber || String(room.roomNumber ?? '').startsWith(`${zoneNumber}:`);

const roomSummary = room => ({
  id: room.id,
  roomNumber: room.roomNumber,
  name: room.name,
  preposition: room.preposition,
  kind: room.kind,
  x: room.x,
  y: room.y,
  z: room.z,
  sector: room.sector,
  flags: room.flags ?? [],
  status: room.status,
  hasDescription: Boolean(clean(room.description)),
  inactive: !!room.inactive
});

const zoneLoreEntries = doc => Object.values(doc.zoneInfoKeywords ?? {})
  .filter(item => ['lore', 'story', 'history', 'map', 'asciimap'].includes(clean(item.keyword || item.id).toLowerCase()))
  .map(item => ({ keyword: item.keyword, body: item.body }));

const zoneCoverage = (doc, zoneNumber) => {
  const rooms = Object.values(doc.rooms ?? {}).filter(room => roomMatchesZone(room, zoneNumber));
  const baseRoomNumbers = new Set(rooms
    .map(room => String(room.roomNumber ?? '').match(/^\d+:(\d{1,2})$/)?.[1])
    .filter(Boolean)
    .map(offset => Number(offset)));
  const missingBaseOffsets = [];
  for (let offset = 0; offset < 100; offset += 1) {
    if (!baseRoomNumbers.has(offset)) missingBaseOffsets.push(`${zoneNumber}:${String(offset).padStart(2, '0')}`);
  }
  return {
    zoneNumber,
    roomsCount: rooms.length,
    baseRoomsCount: baseRoomNumbers.size,
    expectedBaseRooms: 100,
    likelyIncomplete: baseRoomNumbers.size < 100,
    missingBaseOffsets,
    note: baseRoomNumbers.size < 100
      ? 'Snapshot is incomplete for a normal 100-room zone; refresh from live /misc build before treating missing-field results as authoritative.'
      : 'Snapshot has all normal base room offsets for this zone.'
  };
};

const missingFieldRooms = (doc, fields, zoneNumber) => {
  const wanted = asArray(fields).length ? asArray(fields).map(clean) : ['name', 'description', 'sector'];
  return Object.values(doc.rooms ?? {})
    .filter(room => roomMatchesZone(room, zoneNumber))
    .map(room => ({
      ...roomSummary(room),
      missing: wanted.filter(field => {
        if (field === 'description') return !clean(room.description);
        if (field === 'name') return !clean(room.name);
        if (field === 'sector') return !clean(room.sector);
        if (field === 'preposition') return !clean(room.preposition);
        return false;
      })
    }))
    .filter(room => room.missing.length > 0);
};

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
    else if (key === 'name') {
      // Auto-split MUME's raw prep@name format (e.g. "on@a Brambly Slope")
      // so agents can pass either the raw format or pre-split values.
      const raw = clean(spec.name);
      const atIdx = raw.indexOf('@');
      if (atIdx >= 0 && !('preposition' in spec)) {
        // Only auto-split if preposition not explicitly provided
        room.preposition = raw.slice(0, atIdx).trim();
        room.name = raw.slice(atIdx + 1).trim();
      } else {
        room.name = raw;
      }
    }
    else room[key] = typeof spec[key] === 'string' ? clean(spec[key]) : spec[key];
  }
};

const exitKey = (roomId, direction) => `${roomId}:${direction}`;

// Resolve a room ref to its internal ID. If the room number isn't in the project
// yet (e.g. it exists in MUME but hasn't been imported), auto-create a minimal
// stub so exits can still be recorded without a full zone import.
const resolveRoomId = (doc, ref) => {
  const entry = findRoomEntry(doc, clean(ref));
  if (entry) return entry[0];

  // Auto-stub: create a placeholder room for any valid-looking room number
  const roomNumber = clean(ref);
  if (!roomNumber.match(/^\d+:\d+$/)) fail(`Invalid room reference: ${ref}`);
  const stub = makeRoom(doc, { roomNumber, status: 'stub' });
  doc.rooms = { ...(doc.rooms ?? {}), [stub.id]: stub };
  console.error(`[shaper-mcp] Auto-stubbed missing room ${roomNumber} to satisfy exit link.`);
  return stub.id;
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
      doorPickPercent: spec.doorPickPercent ?? existing.doorPickPercent,
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
  commands.push(...editorBlock(room.roomNumber, '/room desc', room.description));
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
  Object.values(doc.exits ?? {}).filter(exit => exit.fromRoomId === roomId && exit.doorPickPercent !== undefined).forEach(exit => {
    const pick = Math.max(0, Math.min(100, Math.round(exit.doorPickPercent || 0)));
    commands.push(wrapAt(room.roomNumber, `/com add door ${exit.direction} lock ${pick} ${pick}`));
  });
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

// --- Storage API Section ---
function loadProject() {
  if (!existsSync(defaultProjectPath)) {
    const dir = dirname(defaultProjectPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const doc = {
      id: 'active-project',
      name: 'Active Project',
      zoneNumber: 0,
      updatedAt: Date.now(),
      selectedRoomId: '',
      rooms: {},
      exits: {},
      commandNodes: {},
      libraries: {},
      zoneInfoKeywords: {},
      shared: false
    };
    writeFileSync(defaultProjectPath, JSON.stringify(doc, null, 2) + '\n');
    return doc;
  }
  return JSON.parse(readFileSync(defaultProjectPath, 'utf8'));
}

function saveProject(doc) {
  doc.updatedAt = Date.now();
  writeFileSync(defaultProjectPath, JSON.stringify(doc, null, 2) + '\n');
}

const readAiRequest = () => {
  if (!existsSync(aiRequestPath)) return null;
  return JSON.parse(readFileSync(aiRequestPath, 'utf8'));
};

const writeAiResponse = response => {
  writeFileSync(aiResponsePath, JSON.stringify(response, null, 2) + '\n');
};

// --- Tool Execution Section ---
function executeTool(name, args) {
  try {
    const doc = loadProject();
    if (name === 'shaper_get_ai_request') {
      const request = readAiRequest();
      return { data: { pending: Boolean(request), request } };
    }

    if (name === 'shaper_submit_ai_response') {
      const response = args.response;
      if (!response || typeof response !== 'object') fail('response object is required.');
      writeAiResponse(response);
      return { data: { success: true } };
    }

    if (name === 'shaper_get_workspace_snapshot') {
      const zoneNumber = Number(args.zoneNumber ?? doc.zoneNumber ?? 0);
      const rooms = Object.values(doc.rooms ?? {}).filter(room => roomMatchesZone(room, zoneNumber));
      return {
        data: {
          id: doc.id,
          name: doc.name,
          zoneNumber: doc.zoneNumber,
          updatedAt: doc.updatedAt,
          selectedRoomId: doc.selectedRoomId,
          coverage: zoneCoverage(doc, zoneNumber),
          rooms: rooms.map(roomSummary),
          exits: Object.values(doc.exits ?? {}),
          commandNodes: Object.values(doc.commandNodes ?? {}),
          libraries: Object.values(doc.libraries ?? {}),
          zoneInfoKeywords: doc.zoneInfoKeywords ?? {},
          validation: validateProjectForMcp(doc)
        }
      };
    }

    if (name === 'shaper_find_rooms') {
      const zoneNumber = Number(args.zoneNumber ?? doc.zoneNumber ?? 0);
      const query = clean(args.query).toLowerCase();
      const rooms = Object.values(doc.rooms ?? {})
        .filter(room => roomMatchesZone(room, zoneNumber))
        .filter(room => !query || [room.roomNumber, room.name, room.sector, ...(room.flags ?? [])]
          .some(value => clean(value).toLowerCase().includes(query)));
      return { data: { rooms: rooms.map(roomSummary) } };
    }

    if (name === 'shaper_get_missing_fields') {
      const zoneNumber = Number(args.zoneNumber ?? doc.zoneNumber ?? 0);
      return { data: { coverage: zoneCoverage(doc, zoneNumber), rooms: missingFieldRooms(doc, args.fields, zoneNumber) } };
    }

    if (name === 'shaper_get_zone_lore') {
      return { data: { zoneNumber: doc.zoneNumber, entries: zoneLoreEntries(doc) } };
    }

    if (name === 'shaper_get_validation_issues') {
      return { data: { issues: validateProjectForMcp(doc) } };
    }

    if (name === 'shaper_get_context') {
      const roomList = Object.values(doc.rooms ?? {}).map(room => ({
        id: room.id,
        roomNumber: room.roomNumber,
        name: room.name,
        preposition: room.preposition,
        kind: room.kind,
        x: room.x,
        y: room.y,
        z: room.z,
        sector: room.sector,
        status: room.status,
        inactive: !!room.inactive
      }));
      const exitList = Object.values(doc.exits ?? {}).map(exit => ({
        id: exit.id,
        fromRoomNumber: doc.rooms[exit.fromRoomId]?.roomNumber,
        direction: exit.direction,
        toRoomNumber: doc.rooms[exit.toRoomId]?.roomNumber,
        hasDoor: !!exit.hasDoor,
        doorName: exit.doorName,
        doorPickPercent: exit.doorPickPercent
      }));
      return {
        data: {
          id: doc.id,
          name: doc.name,
          zoneNumber: doc.zoneNumber,
          updatedAt: doc.updatedAt,
          roomsCount: roomList.length,
          exitsCount: exitList.length,
          rooms: roomList,
          exits: exitList
        }
      };
    }

    if (name === 'shaper_get_room_detail') {
      const roomNum = args.roomNumber;
      const found = findRoomEntry(doc, roomNum);
      if (!found) {
        return { error: `Room not found in project: ${roomNum}` };
      }
      const [roomId, room] = found;
      const roomExits = Object.values(doc.exits ?? {}).filter(exit => exit.fromRoomId === roomId).map(exit => ({
        direction: exit.direction,
        toRoomNumber: doc.rooms[exit.toRoomId]?.roomNumber,
        exitDescription: exit.exitDescription,
        hasDoor: !!exit.hasDoor,
        doorName: exit.doorName,
        doorPickPercent: exit.doorPickPercent,
        doorFlags: exit.doorFlags,
        isClimb: !!exit.isClimb
      }));
      const roomLibs = Object.values(doc.libraries ?? {}).filter(lib => lib.targetType === 'room' && lib.targetId === roomId).map(lib => ({
        name: lib.name,
        parameters: lib.parameters,
        notes: lib.notes
      }));
      const roomComs = Object.values(doc.commandNodes ?? {}).filter(node => node.roomId === roomId).sort((a, b) => a.order - b.order);

      return {
        data: {
          id: room.id,
          roomNumber: room.roomNumber,
          name: room.name,
          preposition: room.preposition,
          description: room.description,
          sector: room.sector,
          flags: room.flags,
          keywords: room.keywords,
          notes: room.notes,
          status: room.status,
          inactive: !!room.inactive,
          exits: roomExits,
          libraries: roomLibs,
          resets: roomComs
        }
      };
    }

    if (name === 'shaper_apply_patch') {
      const patch = args.patch;
      const touched = new Set();
      doc.zoneNumber = patch.zoneNumber ?? doc.zoneNumber ?? zoneFromRoomNumber(Object.values(doc.rooms ?? {})[0]?.roomNumber ?? '0:00');

      asArray(patch.rooms).forEach(spec => {
        const [roomId, room] = ensureRoom(doc, spec, touched);
        patchRoomFields(room, spec);
        asArray(spec.exits).forEach(exit => upsertExit(doc, roomId, exit, touched));
        asArray(spec.libraries).forEach(lib => addLibrary(doc, 'room', roomId, lib));
        asArray(spec.com).forEach(node => addCom(doc, roomId, node));
      });

      if (!doc.selectedRoomId || !doc.rooms[doc.selectedRoomId]) {
        doc.selectedRoomId = [...touched][0] ?? Object.keys(doc.rooms)[0];
      }

      saveProject(doc);

      const previews = [...touched].map(roomId => ({
        roomId,
        roomNumber: doc.rooms[roomId].roomNumber,
        commands: roomPreview(doc, roomId)
      }));

      const allIssues = validateProjectForMcp(doc);
      const validationIssues = allIssues.map(issue => ({
        severity: issue.severity,
        roomId: issue.roomId,
        roomNumber: issue.roomId ? doc.rooms[issue.roomId]?.roomNumber : null,
        message: issue.message
      }));

      return {
        data: {
          success: true,
          touchedRooms: previews.map(item => item.roomNumber),
          previews,
          validation: validationIssues
        }
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: err.message };
  }
}

// --- JSON-RPC Stdio Server Section ---
let buffer = '';

process.stdin.on('data', chunk => {
  buffer += chunk.toString('utf8');
  let lineEndIndex;
  while ((lineEndIndex = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, lineEndIndex).trim();
    buffer = buffer.slice(lineEndIndex + 1);
    if (line) {
      handleMessage(line);
    }
  }
});

function sendResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', result, id }) + '\n');
}

function sendError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id }) + '\n');
}

function handleMessage(line) {
  try {
    const message = JSON.parse(line);
    if (message.method === 'initialize') {
      sendResponse(message.id, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        serverInfo: { name: 'shaper-mcp-server', version: '1.0.0' }
      });
    } else if (message.method === 'tools/list') {
      sendResponse(message.id, {
        tools: [
          {
            name: 'shaper_get_ai_request',
            description: 'Read the pending Shaper AI generation request from the client, including target, prompt, schema, and room context.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'shaper_submit_ai_response',
            description: 'Submit a generated Shaper AI response for the client to poll and apply.',
            inputSchema: {
              type: 'object',
              properties: {
                response: {
                  type: 'object',
                  description: 'For room-description use { "description": "..." }; for room-name use { "name": "...", "preposition": "..." }; for door-description use { "exitDescription": "..." }.'
                }
              },
              required: ['response']
            }
          },
          {
            name: 'shaper_get_workspace_snapshot',
            description: 'Get the current synced Shaper workspace snapshot for a zone, including rooms, exits, resets, libraries, zone info, and validation.',
            inputSchema: {
              type: 'object',
              properties: {
                zoneNumber: { type: 'number', description: 'Optional zone number to filter room summaries.' }
              }
            }
          },
          {
            name: 'shaper_find_rooms',
            description: 'Search synced Shaper rooms by room number, name, sector, or flag.',
            inputSchema: {
              type: 'object',
              properties: {
                zoneNumber: { type: 'number' },
                query: { type: 'string' }
              }
            }
          },
          {
            name: 'shaper_get_missing_fields',
            description: 'List rooms missing builder-critical fields such as name, description, sector, or preposition.',
            inputSchema: {
              type: 'object',
              properties: {
                zoneNumber: { type: 'number' },
                fields: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          {
            name: 'shaper_get_zone_lore',
            description: 'Get lore/story/history/map/asciimap zone info entries from the synced Shaper project.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'shaper_get_validation_issues',
            description: 'Get validation issues from the synced Shaper project.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'shaper_get_context',
            description: 'Get an overview of the active Shaper project, including zone number, project name, and list of rooms.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'shaper_get_room_detail',
            description: 'Get detailed fields of a specific room, including descriptions, sector, flags, keywords, exits, libraries, and resets.',
            inputSchema: {
              type: 'object',
              properties: {
                roomNumber: { type: 'string', description: 'The room number, e.g. "31:04" or room ID.' }
              },
              required: ['roomNumber']
            }
          },
          {
            name: 'shaper_apply_patch',
            description: 'Apply a structured patch to add/update rooms, exits, libraries, and resets in the active project.',
            inputSchema: {
              type: 'object',
              properties: {
                patch: {
                  type: 'object',
                  description: 'The patch object containing rooms to update/create.',
                  properties: {
                    rooms: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          room: { type: 'string', description: 'Room number or ID.' },
                          create: { type: 'boolean', description: 'Whether to create the room if missing.' },
                          x: { type: 'number' },
                          y: { type: 'number' },
                          z: { type: 'number' },
                          kind: { type: 'string', enum: ['grid', 'extra'] },
                          name: { type: 'string' },
                          preposition: { type: 'string' },
                          description: { type: 'string' },
                          sector: { type: 'string' },
                          flags: { type: 'array', items: { type: 'string' } },
                          exits: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                direction: { type: 'string', enum: ['n', 'e', 's', 'w', 'u', 'd'] },
                                to: { type: 'string', description: 'Target room number.' },
                                twoWay: { type: 'boolean' },
                                hasDoor: { type: 'boolean' },
                                doorName: { type: 'string' },
                                doorPickPercent: { type: 'number' },
                                doorFlags: { type: 'array', items: { type: 'string' } }
                              },
                              required: ['direction', 'to']
                            }
                          },
                          libraries: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                params: { type: 'object' }
                              },
                              required: ['name']
                            }
                          },
                          com: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                type: { type: 'string' },
                                vnum: { type: 'string' },
                                limit: { type: 'object' },
                                children: { type: 'array' }
                              },
                              required: ['type', 'vnum']
                            }
                          }
                        },
                        required: ['room']
                      }
                    }
                  },
                  required: ['rooms']
                }
              },
              required: ['patch']
            }
          }
        ]
      });
    } else if (message.method === 'tools/call') {
      const { name, arguments: args } = message.params;
      const result = executeTool(name, args);
      if (result.error) {
        sendError(message.id, -32603, result.error);
      } else {
        sendResponse(message.id, { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] });
      }
    } else {
      // Ignored / notifications
    }
  } catch (err) {
    sendError(null, -32700, err.message);
  }
}
