/**
 * @file shaperLiveImport.ts
 * @description Applies copied live MUME read transcripts to Shaper documents.
 */

import { createGridRoom, createShaperRoomId } from '../model/shaperDocument';
import { formatShaperLimitRaw } from '../model/shaperComCommands';
import { decodeZoneInfoText } from '../model/shaperZoneInfo';
import type {
    ShaperCommandLimit,
    ShaperCommandNode,
    ShaperCommandType,
    ShaperDirection,
    ShaperDoorFlag,
    ShaperExitDraft,
    ShaperLibraryInstall,
    ShaperRoomDraft,
    ShaperRoomFlag,
    ShaperRoomId,
    ShaperSector,
    ShaperWorkspaceDoc
} from '../model/shaperTypes';
import { parseShaperLiveTranscript } from './shaperLiveTranscript';

export interface ShaperLiveImportSummary {
    roomsTouched: number;
    zoneInfoKeywords: number;
    commandNodes: number;
    libraries: number;
    warnings: string[];
}

export interface ShaperLiveImportResult {
    doc: ShaperWorkspaceDoc;
    summary: ShaperLiveImportSummary;
}

const sectorValues = new Set<ShaperSector>([
    'inside', 'building', 'city', 'field', 'forest', 'hills', 'mountain',
    'shallows', 'water', 'road', 'rapids', 'underwater', 'brush',
    'tunnel', 'cavern'
]);

const sectorAliases: Record<string, ShaperSector> = {
    mountains: 'mountain'
};

const flagValues = new Set<ShaperRoomFlag>([
    'dark', 'death', 'no_mob', 'indoors', 'no_ride', 'no_freeze',
    'open_root', 'no_magic', 'isolated', 'private', 'random_exits',
    'map_toggle', 'hide_map_id', 'security', 'peaceful', 'build',
    'water', 'no_shout', 'silent', 'sunlit', 'trail'
]);

const commandTypes = new Set<ShaperCommandType>([
    'mobile', 'follow', 'object', 'hide', 'put', 'give', 'equip',
    'find', 'door', 'container', 'repeat', 'eqclass', 'exec',
    'liquid', 'money', 'months'
]);

const directionMap: Record<string, ShaperDirection> = {
    north: 'n',
    n: 'n',
    east: 'e',
    e: 'e',
    south: 's',
    s: 's',
    west: 'w',
    w: 'w',
    up: 'u',
    u: 'u',
    down: 'd',
    d: 'd'
};

const doorFlagValues = new Set<ShaperDoorFlag>([
    'broken', 'build', 'climb_down', 'climb_up', 'closed', 'door',
    'hidden', 'locked', 'nobash', 'noblock', 'nobreak', 'noflee',
    'not_shown', 'no_mob', 'pickproof', 'plural', 'stream',
    'transient'
]);

// Live `/com list -commands` output abbreviates type names, e.g.
// `/com add mob 8008 20200` and `/com add obj 2012 ...`. Map the short forms
// MUME emits back to the canonical ShaperCommandType.
const commandTypeAliases: Record<string, ShaperCommandType> = {
    mob: 'mobile',
    obj: 'object',
    cont: 'container',
    eq: 'equip',
    rep: 'repeat'
};

const resolveCommandType = (raw: string): ShaperCommandType | null => {
    const lower = raw.toLowerCase();
    if (commandTypes.has(lower as ShaperCommandType)) return lower as ShaperCommandType;
    return commandTypeAliases[lower] ?? null;
};

// --- Room Lookup Section ---
// Discovery keys rooms zero-padded (`31:00`); live commands may carry the
// canonical unpadded id (`31:0`). Pad so both resolve to the same room.
const padRoomNumber = (roomNumber: string): string => {
    const [zone, room] = roomNumber.split(':');
    return room !== undefined && /^\d+$/.test(room) ? `${zone}:${room.padStart(2, '0')}` : roomNumber;
};

const inferRoomNumber = (output: string): string => {
    const explicit = output.match(/\b(?:Commands on room|Room)\s+(\d+:\d+)\b/i)?.[1];
    if (explicit) return explicit;
    const prompt = output.match(/\[(\d+:\d+)\]/g)?.at(-1);
    return prompt ? prompt.slice(1, -1) : '';
};

const gridCoordsFromRoomNumber = (doc: ShaperWorkspaceDoc, roomNumber: string): { x: number; y: number } | null => {
    const match = roomNumber.match(new RegExp(`^${doc.zoneNumber}:(\\d)(\\d)$`));
    if (!match) return null;
    return { x: Number(match[1]), y: Number(match[2]) };
};

const findRoomByNumber = (doc: ShaperWorkspaceDoc, roomNumber: string): ShaperRoomDraft | null =>
    Object.values(doc.rooms).find(room => room.roomNumber === roomNumber) ?? null;

const ensureRoom = (doc: ShaperWorkspaceDoc, roomNumber: string): { doc: ShaperWorkspaceDoc; room: ShaperRoomDraft } => {
    const existing = findRoomByNumber(doc, roomNumber);
    if (existing) return { doc, room: existing };

    const coords = gridCoordsFromRoomNumber(doc, roomNumber);
    const room = coords
        ? createGridRoom(doc.zoneNumber, coords.x, coords.y)
        : { ...createGridRoom(doc.zoneNumber, 0, 0), id: createShaperRoomId(), kind: 'extra' as const, roomNumber };
    const nextDoc = { ...doc, rooms: { ...doc.rooms, [room.id]: room } };
    return { doc: nextDoc, room };
};

// --- Stat Parser Section ---
const bracketValue = (output: string, label: string): string => {
    const match = output.match(new RegExp(`\\b${label}:\\s*\\[([^\\]\\n]+)\\]`, 'i'));
    return match?.[1]?.trim() ?? '';
};

const plainValue = (output: string, label: string): string => {
    const match = output.match(new RegExp(`\\b${label}:\\s*([^,\\n]+)`, 'i'));
    return match?.[1]?.trim() ?? '';
};

const parseRoomName = (output: string): string => {
    const statLine = output.match(/\bRoom\s+\S+\s+\([^)]+\)\s+-\s*([^\n]+)/i)?.[1]?.trim();
    return bracketValue(output, 'Name') || bracketValue(output, 'Room name') || statLine || '';
};

const statValue = (output: string, label: string): string =>
    bracketValue(output, label) || plainValue(output, label);

const parseSector = (output: string, fallback: ShaperSector | ''): ShaperSector | '' => {
    const raw = statValue(output, 'Sector').toLowerCase().replace(/-/g, '_');
    const sector = sectorAliases[raw] ?? raw;
    return sectorValues.has(sector as ShaperSector) ? sector as ShaperSector : fallback;
};

const parseFlags = (output: string): ShaperRoomFlag[] => {
    const line = output.match(/\bRoom permanent flags:\s*([^\n]+)/i)?.[1] ??
        output.match(/\bFlags:\s*([^\n]+)/i)?.[1] ?? '';
    return line
        .split(/[\s,]+/)
        .map(flag => flag.trim().toLowerCase().replace(/-/g, '_'))
        .filter((flag): flag is ShaperRoomFlag => flagValues.has(flag as ShaperRoomFlag));
};

// MUME `/stat room full` prints the description as a free-text block under a
// `Description:` line (`Description: <none>` inline when empty). The body is NOT
// reliably indented — it begins at column 0 — so it cannot be detected by
// indentation. Instead it runs until the next structured line: the
// `Extra description keywords:` field, a `------- ... -------` section separator,
// or any other room-stat field label.
const DESCRIPTION_TERMINATOR =
    /^(Extra description keywords|Exits|Flags|Sector|Owner|Keywords|Room|Zone|Commands|Light sources|Entrances|Magic|Magical key):/i;

const parseDescription = (output: string): string => {
    const lines = output.split('\n');
    const exitsStart = lines.findIndex(line => /^-+\s*Exits\s*-+$/i.test(line.trim()) || /^Exits:/i.test(line.trim()));
    const searchLines = exitsStart >= 0 ? lines.slice(0, exitsStart) : lines;
    const start = searchLines.findIndex(line => /^Description:/i.test(line.trim()));
    if (start < 0) return '';

    const inline = searchLines[start].replace(/^\s*Description:\s*/i, '').trim();
    if (/^<none>$/i.test(inline)) return '';

    const body: string[] = [];
    if (inline) body.push(inline);
    for (const line of searchLines.slice(start + 1)) {
        const trimmed = line.trim();
        if (DESCRIPTION_TERMINATOR.test(trimmed) || /^-{3,}/.test(trimmed)) break;
        body.push(line.trim());
    }
    return body.join('\n').trim();
};

const parseExtraDescriptionKeywords = (output: string): string[] => {
    const match = output.match(/^Extra description keywords:\s*(.*)$/im);
    const raw = match?.[1]?.trim() ?? '';
    if (!raw || /^none$/i.test(raw)) return [];
    return raw
        .split(/[\s,]+/)
        .map(keyword => keyword.trim())
        .filter(Boolean);
};

const normalizeRoomNumber = (value: string): string =>
    value.replace(/\s+/g, '');

const parseDoorFlags = (value: string): ShaperDoorFlag[] =>
    value
        .split(/[\s,]+/)
        .map(flag => flag.trim().toLowerCase().replace(/-/g, '_'))
        .filter((flag): flag is ShaperDoorFlag => doorFlagValues.has(flag as ShaperDoorFlag));

interface ParsedLiveExit {
    direction: ShaperDirection;
    targetRoomNumber: string;
    doorFlags: ShaperDoorFlag[];
    doorName?: string;
    keyMode?: 'latch' | 'no_keyhole' | 'none';
    doorPickPercent?: number;
    doorWeight?: number;
    exitDescription?: string;
}

const EXIT_ROW_PATTERN =
    /^(North|East|South|West|Up|Down|N|E|S|W|U|D)\s+(\d+\s*:\s*\d+)\s*,?\s*(?:flags:\s*([^,\n]*))?(.*)$/i;

const applyExitMetadata = (exit: ParsedLiveExit, text: string): void => {
    const name = text.match(/\bname:\s*([^,]+)/i)?.[1]?.trim();
    const key = text.match(/\bkey:\s*([^,]+)/i)?.[1]?.trim();
    const pick = text.match(/\bpick:\s*(\d+)%/i)?.[1];
    const weight = text.match(/\bweight:\s*(\d+)/i)?.[1];
    if (name) exit.doorName = name;
    if (key === 'no-keyhole' || key === 'no_keyhole') exit.keyMode = 'no_keyhole';
    else if (key === 'latch') exit.keyMode = 'latch';
    else if (key === 'none') exit.keyMode = 'none';
    if (pick) exit.doorPickPercent = Number(pick);
    if (weight) exit.doorWeight = Number(weight);
};

const parseLiveExits = (output: string): ParsedLiveExit[] => {
    const exits: ParsedLiveExit[] = [];
    let active: ParsedLiveExit | null = null;
    let readingDescription = false;
    output.split('\n').forEach(line => {
        const trimmed = line.trim();
        const match = trimmed.match(EXIT_ROW_PATTERN);
        if (match) {
            const direction = directionMap[match[1].toLowerCase()];
            if (!direction) return;
            readingDescription = false;
            active = {
                direction,
                targetRoomNumber: normalizeRoomNumber(match[2]),
                doorFlags: parseDoorFlags(match[3] ?? 'none'),
            };
            applyExitMetadata(active, match[4] ?? '');
            exits.push(active);
            return;
        }
        if (!active) return;
        if (/^-{3,}/.test(trimmed)) {
            readingDescription = false;
            active = null;
            return;
        }
        const description = trimmed.match(/^Description:\s*(.*)$/i)?.[1];
        if (description !== undefined) {
            active.exitDescription = /^<none>$/i.test(description.trim()) ? '' : description.trim();
            readingDescription = true;
            return;
        }
        if (readingDescription) {
            active.exitDescription = `${active.exitDescription ? `${active.exitDescription}\n` : ''}${line.trim()}`.trim();
            return;
        }
        applyExitMetadata(active, trimmed);
    });
    return exits;
};

const patchRoomFromStat = (room: ShaperRoomDraft, output: string, importedAt: number): ShaperRoomDraft => {
    // MUME room titles are `<preposition>@<name>` (e.g. `on a@Jagged Crag`). Split
    // on the first `@` so the preposition and name land in the right fields.
    const rawName = parseRoomName(output);
    const atIndex = rawName.indexOf('@');
    const preposition = atIndex >= 0 ? rawName.slice(0, atIndex).trim() : '';
    const name = atIndex >= 0 ? rawName.slice(atIndex + 1).trim() : rawName;
    const mapId = statValue(output, 'MapId');
    return {
        ...room,
        status: 'verified',
        name: name || room.name,
        preposition: preposition || room.preposition,
        owner: statValue(output, 'Owner') || room.owner,
        sector: parseSector(output, room.sector),
        flags: parseFlags(output),
        description: parseDescription(output) || room.description,
        keywords: parseExtraDescriptionKeywords(output).map(keyword => ({
            id: `live-edesc-${keyword}`,
            keywords: [keyword],
            description: room.keywords.find(item => item.keywords.includes(keyword))?.description ?? ''
        })),
        mapId: mapId || room.mapId,
        liveSnapshot: { ...room.liveSnapshot, importedAt, statRoomFull: output.trim() }
    };
};

// --- Command Parser Section ---
const limitFromToken = (raw: string | undefined): ShaperCommandLimit | null =>
    raw && /^\d+$/.test(raw)
        ? { world: null, zone: null, room: null, chancePercent: 100, raw }
        : null;

const parseComLine = (line: string, roomId: ShaperRoomId, order: number, parentId: string | null): ShaperCommandNode | null => {
    const match = line.trim().match(/^\/com\s+add\s+(\+?\s*)?(\S+)(?:\s+(\S+))?(?:\s+(\S+))?(.*)$/i);
    if (!match) return null;
    const type = resolveCommandType(match[2]);
    if (!type) return null;
    const limit = limitFromToken(match[4]);
    return {
        id: createShaperRoomId(),
        roomId,
        parentId,
        order,
        type,
        limit,
        fields: {
            vnum: match[3] ?? '',
            name: '',
            target: 'parent',
            container: 'parent',
            position: match[5].trim()
        },
        notes: ''
    };
};

// `/com list` (no flag) prints a human table that includes the entity name and
// decoded load counts, e.g. `1  Mobile 1010 (a catfish) (--/2/--/100%)` where the
// limit reads (world/zone/room/chance%). Prefer this when available.
const parseLimitField = (field: string): number | null => {
    const clean = field.trim().replace('%', '');
    return clean === '' || clean === '--' ? null : Number(clean);
};

const parseComTableRelationFields = (
    type: ShaperCommandType,
    extra: string
): Partial<ShaperCommandNode['fields']> => {
    const relation = extra.match(/\b(?:in|to|on|follows)\s+(\d+)\s+\((.*?)\)/i);
    if (!relation) return {};
    const vnum = relation[1];
    const name = relation[2].trim();
    if (type === 'put' || type === 'container') return { container: vnum, containerName: name };
    if (type === 'follow') return { master: vnum, masterName: name };
    if (type === 'give' || type === 'equip' || type === 'exec') return { target: vnum, targetName: name };
    return {};
};

const parseComListTable = (output: string, roomId: ShaperRoomId): ShaperCommandNode[] => {
    const nodes: ShaperCommandNode[] = [];
    let lastRootId: string | null = null;
    output.split('\n').forEach(line => {
        // Match: optional room prefix (e.g. 31:100), optional nested symbol (>), order, type, vnum, name, extra, limits
        const match = line.match(/^\s*(?:\d+:\d+\s+)?(?:>\s*)?(\d+)\s+([a-zA-Z]+)\s+(\d+)\s+\((.*?)\)(.*?)\(([^)]*)\)\s*$/i);
        if (!match) return;
        const resolvedType = resolveCommandType(match[2]);
        if (!resolvedType) return;
        const isNested = />/.test(line.split(/\b[a-zA-Z]+\b/)[0] || '');
        const parentId = isNested ? lastRootId : null;

        const fields = match[6].split('/');
        const world = parseLimitField(fields[0] ?? '');
        const zone = parseLimitField(fields[1] ?? '');
        const room = parseLimitField(fields[2] ?? '');
        const chancePercent = parseLimitField(fields[3] ?? '') ?? 100;
        
        const id = createShaperRoomId();
        if (!isNested) {
            lastRootId = id;
        }

        nodes.push({
            id,
            roomId,
            parentId,
            order: nodes.length,
            type: resolvedType,
            limit: {
                world,
                zone,
                room,
                chancePercent,
                raw: formatShaperLimitRaw(world, zone, room, chancePercent)
            },
            fields: {
                vnum: match[3],
                name: match[4].trim(),
                target: 'parent',
                container: 'parent',
                master: 'parent',
                position: '',
                ...parseComTableRelationFields(resolvedType, match[5] ?? '')
            },
            notes: ''
        });
    });
    return nodes;
};

const parseComOutput = (output: string, roomId: ShaperRoomId): ShaperCommandNode[] => {
    // Plain `/com list` table form (has names + decoded counts) is preferred.
    if (/^\s*(?:\d+:\d+\s+)?(?:>\s*)?\d+\s+(Mobile|Object|Follow|Put|Give|Equip|Hide)\s+\d+\s+\(/im.test(output)) {
        return parseComListTable(output, roomId);
    }
    // Fallback: `/com list -commands` machine form (`/com add mob …`).
    const nodes: ShaperCommandNode[] = [];
    let parentId: string | null = null;
    output.split('\n').forEach(line => {
        const isChild = /^\/com\s+add\s+\+/i.test(line.trim());
        const node = parseComLine(line, roomId, nodes.length, isChild ? parentId : null);
        if (!node) return;
        nodes.push(node);
        if (!isChild) parentId = node.id;
    });
    return nodes;
};

// --- Library Parser Section ---
const parseLibraryValue = (value: string): string | number | boolean => {
    if (/^-?\d+$/.test(value)) return Number(value);
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
    return value;
};

const targetNodeForLibrary = (
    nodes: ShaperCommandNode[],
    name: string,
    parameters: Record<string, string | number | boolean>
): { targetType: 'mobile' | 'object'; targetId: string } | null => {
    const rawVnum = parameters.object ?? parameters.mobile;
    const vnum = rawVnum === undefined ? '' : String(rawVnum).trim().match(/\d+/)?.[0] ?? '';
    if (!vnum) return null;
    const wantsObject = name.includes('obj');
    const wantsMobile = name.includes('mob') || name.includes('corpse');
    const match = nodes.find(node => {
        const nodeVnum = String(node.fields.vnum ?? '');
        if (nodeVnum !== vnum) return false;
        if (wantsObject) return node.type === 'object' || node.type === 'hide' || node.type === 'put' || node.type === 'give' || node.type === 'equip';
        if (wantsMobile) return node.type === 'mobile' || node.type === 'follow';
        return false;
    });
    if (!match) return null;
    return { targetType: wantsObject ? 'object' : 'mobile', targetId: match.id };
};

const parseCommandLibraryOutput = (
    output: string,
    roomId: ShaperRoomId,
    nodes: ShaperCommandNode[]
): ShaperLibraryInstall[] => {
    const installs: ShaperLibraryInstall[] = [];
    output.split('\n').forEach(line => {
        const add = line.trim().match(/^\/lib\s+(?:room\s+\S+\s+)?add\s+(\S+)/i);
        if (add) {
            installs.push({
                id: createShaperRoomId(),
                targetType: 'room',
                targetId: roomId,
                name: add[1],
                parameters: {},
                requiresSupervisorReview: false,
                requiresLoad: false,
                notes: ''
            });
            return;
        }
        const set = line.trim().match(/^\/lib\s+(?:room\s+\S+\s+)?set\s+(\d+)\s+(\S+)\s+(.+)$/i);
        if (!set) return;
        const install = installs[Number(set[1]) - 1];
        if (install) install.parameters[set[2]] = parseLibraryValue(set[3].trim());
    });
    const requiresLoad = output.split('\n').some(line => /^\/lib\s+(?:room\s+\S+\s+)?load\b/i.test(line.trim()));
    return installs.map(install => {
        const target = targetNodeForLibrary(nodes, install.name, install.parameters);
        return { ...install, ...target, requiresLoad };
    });
};

const isLibraryFieldLine = (line: string): boolean =>
    /^\s{0,8}[a-z][a-z0-9-]*\??:\s+/i.test(line) || /^\s{0,8}(mobile|object):\s+/i.test(line);

const isPromptLine = (line: string): boolean =>
    /\[\d+:\d+\]\s*$/.test(line.trim());

const parseLibraryListOutput = (
    output: string,
    roomId: ShaperRoomId,
    nodes: ShaperCommandNode[]
): ShaperLibraryInstall[] => {
    const installs: ShaperLibraryInstall[] = [];
    let current: ShaperLibraryInstall | null = null;
    let activeKey: string | null = null;

    output.split('\n').forEach(line => {
        const header = line.trim().match(/^\d+:\s+(\S+)/);
        if (header) {
            current = {
                id: createShaperRoomId(),
                targetType: 'room',
                targetId: roomId,
                name: header[1],
                parameters: {},
                requiresSupervisorReview: false,
                requiresLoad: true,
                notes: ''
            };
            installs.push(current);
            activeKey = null;
            return;
        }
        if (!current) return;
        const field = line.match(/^\s*([a-z][a-z0-9-]*\??):\s*(.*)$/i);
        if (field) {
            activeKey = field[1];
            current.parameters[activeKey] = parseLibraryValue(field[2].trim());
            return;
        }
        if (isPromptLine(line)) {
            activeKey = null;
            return;
        }
        if (activeKey && line.trim() && !isLibraryFieldLine(line)) {
            const previous = String(current.parameters[activeKey] ?? '').trimEnd();
            current.parameters[activeKey] = `${previous}${previous ? '\n' : ''}${line.trimEnd()}`;
        }
    });

    return installs.map(install => {
        const target = targetNodeForLibrary(nodes, install.name, install.parameters);
        return target ? { ...install, ...target } : install;
    });
};

const parseLibraryOutput = (
    output: string,
    roomId: ShaperRoomId,
    nodes: ShaperCommandNode[]
): ShaperLibraryInstall[] => {
    if (/^\s*\d+:\s+\S+/m.test(output)) return parseLibraryListOutput(output, roomId, nodes);
    return parseCommandLibraryOutput(output, roomId, nodes);
};

// --- Apply Section ---
const replaceRoomCommands = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    nodes: ShaperCommandNode[]
): ShaperWorkspaceDoc => ({
    ...doc,
    commandNodes: {
        ...Object.fromEntries(Object.entries(doc.commandNodes).filter(([, node]) => node.roomId !== roomId)),
        ...Object.fromEntries(nodes.map(node => [node.id, node]))
    }
});

const replaceRoomExits = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    output: string
): ShaperWorkspaceDoc => {
    const liveExits = parseLiveExits(output);
    const exits = Object.fromEntries(Object.entries(doc.exits).filter(([, exit]) => exit.fromRoomId !== roomId));
    let nextDoc = { ...doc, exits };

    liveExits.forEach(liveExit => {
        const ensured = ensureRoom(nextDoc, padRoomNumber(liveExit.targetRoomNumber));
        nextDoc = ensured.doc;
        const id = `${roomId}:${liveExit.direction}`;
        const exit: ShaperExitDraft = {
            id,
            fromRoomId: roomId,
            direction: liveExit.direction,
            toRoomId: ensured.room.id,
            isTwoWay: false,
            doorFlags: liveExit.doorFlags,
            hasDoor: liveExit.doorFlags.includes('door'),
            doorName: liveExit.doorName,
            keyMode: liveExit.keyMode,
            doorPickPercent: liveExit.doorPickPercent,
            doorWeight: liveExit.doorWeight,
            exitDescription: liveExit.exitDescription
        };
        nextDoc = { ...nextDoc, exits: { ...nextDoc.exits, [id]: exit } };
    });

    return nextDoc;
};

const replaceRoomLibraries = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    installs: ShaperLibraryInstall[]
): ShaperWorkspaceDoc => {
    const roomNodeIds = new Set(Object.values(doc.commandNodes)
        .filter(node => node.roomId === roomId)
        .map(node => node.id));
    return {
        ...doc,
        libraries: {
            ...Object.fromEntries(Object.entries(doc.libraries).filter(([, lib]) =>
                lib.targetId !== roomId && !roomNodeIds.has(lib.targetId))),
            ...Object.fromEntries(installs.map(install => [install.id, install]))
        }
    };
};

const retargetRoomLibraries = (doc: ShaperWorkspaceDoc, roomId: ShaperRoomId): ShaperWorkspaceDoc => {
    const nodes = Object.values(doc.commandNodes).filter(node => node.roomId === roomId);
    const libraries = Object.fromEntries(Object.entries(doc.libraries).map(([id, install]) => {
        if (install.targetId !== roomId || install.targetType !== 'room') return [id, install];
        const target = targetNodeForLibrary(nodes, install.name, install.parameters);
        return [id, target ? { ...install, ...target } : install];
    }));
    return { ...doc, libraries };
};

export const applyShaperLiveTranscript = (
    doc: ShaperWorkspaceDoc,
    transcript: string,
    importedAt = Date.now()
): ShaperLiveImportResult => {
    let nextDoc = { ...doc, updatedAt: importedAt };
    const touchedRooms = new Set<ShaperRoomId>();
    const warnings: string[] = [];

    parseShaperLiveTranscript(transcript).forEach(block => {
        const info = block.command.match(/^\/info\s+(?:z|zone)\s+\d+\s+(\S+)/i);
        if (info && info[1].toLowerCase() !== 'list') {
            const body = decodeZoneInfoText(block.output.trim());
            nextDoc = {
                ...nextDoc,
                zoneInfoKeywords: {
                    ...nextDoc.zoneInfoKeywords,
                    [info[1]]: { id: info[1], keyword: info[1], body, rawText: body, importedAt }
                }
            };
            return;
        }

        const isZoneCom = /^\/com\s+list\s+(?:z|zone)\b/i.test(block.command.trim());
        if (isZoneCom) {
            const linesByRoom: Record<string, string[]> = {};
            block.output.split('\n').forEach(line => {
                const roomMatch = line.match(/^\s*(\d+:\d+)/);
                if (roomMatch) {
                    const rNum = padRoomNumber(roomMatch[1]);
                    if (!linesByRoom[rNum]) linesByRoom[rNum] = [];
                    linesByRoom[rNum].push(line);
                }
            });

            Object.entries(linesByRoom).forEach(([rNum, lines]) => {
                const ensured = ensureRoom(nextDoc, rNum);
                nextDoc = ensured.doc;
                const room = ensured.room;
                touchedRooms.add(room.id);

                const outputForRoom = lines.join('\n');
                const nodes = parseComOutput(outputForRoom, room.id);
                nextDoc = replaceRoomCommands(nextDoc, room.id, nodes);
                nextDoc = retargetRoomLibraries(nextDoc, room.id);
                nextDoc.rooms[room.id] = {
                    ...nextDoc.rooms[room.id],
                    liveSnapshot: {
                        ...nextDoc.rooms[room.id].liveSnapshot,
                        importedAt,
                        comListCommands: outputForRoom.trim()
                    }
                };
            });
            return;
        }

        // Live reads use the Mc-level `/stat room <n> full`; older transcripts (and
        // Mb `/at` runs) use `/at <room> /stat room full`. Accept both.
        const statCommand = block.command.match(/^\/at\s+(\S+)\s+\/stat\s+room(?:\s+full)?/i)
            ?? block.command.match(/^\/stat\s+room\s+(\d+(?::\d+)?)(?:\s+full)?/i);
        // Live reads send `/at <room> /com list -com`; the `/com room …` form is
        // also accepted for older transcripts. The `-com`/`-commands` flag and the
        // padded/unpadded room id (`31:0` vs `31:00`) are both tolerated.
        const comCommand = block.command.match(/^\/com\s+room\s+(\S+)\s+list\b/i)
            ?? block.command.match(/^\/at\s+(\S+)\s+\/com\s+list\b/i)
            ?? block.command.match(/^\/com\s+list\b/i);
        const libCommand = block.command.match(/^\/at\s+(\S+)\s+\/lib\s+list(?:\s+-com(?:mands)?)?/i)
            ?? block.command.match(/^\/lib\s+room\s+(\S+)\s+list(?:\s+-com(?:mands)?)?/i)
            ?? block.command.match(/^\/lib\s+(?:r|room)\s+(?:h|here)\s+list(?:\s+-com(?:mands)?)?/i);
        const rawRoomNumber = statCommand?.[1] ?? comCommand?.[1] ?? libCommand?.[1] ?? inferRoomNumber(block.output);
        if (!rawRoomNumber) return;
        const roomNumber = padRoomNumber(rawRoomNumber);

        const ensured = ensureRoom(nextDoc, roomNumber);
        nextDoc = ensured.doc;
        const room = ensured.room;
        touchedRooms.add(room.id);

        if (statCommand) {
            nextDoc = { ...nextDoc, rooms: { ...nextDoc.rooms, [room.id]: patchRoomFromStat(room, block.output, importedAt) } };
            nextDoc = replaceRoomExits(nextDoc, room.id, block.output);
            return;
        }
        if (comCommand) {
            const nodes = parseComOutput(block.output, room.id);
            if (!nodes.length && block.output.trim()) warnings.push(`No /com commands parsed for ${roomNumber}.`);
            nextDoc = replaceRoomCommands(nextDoc, room.id, nodes);
            nextDoc = retargetRoomLibraries(nextDoc, room.id);
            nextDoc.rooms[room.id] = { ...nextDoc.rooms[room.id], liveSnapshot: { ...nextDoc.rooms[room.id].liveSnapshot, importedAt, comListCommands: block.output.trim() } };
            return;
        }

        const roomNodes = Object.values(nextDoc.commandNodes).filter(node => node.roomId === room.id);
        const installs = parseLibraryOutput(block.output, room.id, roomNodes);
        nextDoc = replaceRoomLibraries(nextDoc, room.id, installs);
        nextDoc = retargetRoomLibraries(nextDoc, room.id);
        nextDoc.rooms[room.id] = { ...nextDoc.rooms[room.id], liveSnapshot: { ...nextDoc.rooms[room.id].liveSnapshot, importedAt, libRoomCommands: block.output.trim() } };
    });

    return {
        doc: nextDoc,
        summary: {
            roomsTouched: touchedRooms.size,
            zoneInfoKeywords: Object.keys(nextDoc.zoneInfoKeywords).length - Object.keys(doc.zoneInfoKeywords).length,
            commandNodes: Object.keys(nextDoc.commandNodes).length,
            libraries: Object.keys(nextDoc.libraries).length,
            warnings
        }
    };
};
