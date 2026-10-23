/** @file roomInfoRoom.ts — Resolve live and imported rooms for the information card. */
import type { MapperExit, MapperRoom } from '../components/Mapper/mapperTypes';
import { TERRAIN_MAP, normalizeTerrain } from '../components/Mapper/mapperUtils';
import { getMmapperTerrainLabel } from '../components/Mapper/mmapperTerrain';
import { getMapperRoomNote } from './mapperRoomNotes';

// --- Imported value normalization ---
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const flags = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const attribute = (value: unknown): string | number | null => typeof value === 'string' || typeof value === 'number' ? value : null;
const toggle = (value: unknown): string | number | boolean | undefined => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

export const roomInfoTerrainLabel = (value: unknown, isMmapperMap: boolean): string => {
    const terrain = typeof value === 'number' || typeof value === 'string' ? value : 'Field';
    return isMmapperMap ? getMmapperTerrainLabel(terrain) : TERRAIN_MAP[String(terrain)] ?? normalizeTerrain(terrain);
};

const importExits = (value: unknown): Record<string, MapperExit> => {
    const result: Record<string, MapperExit> = {};
    const directions: Record<string, string> = { north: 'n', south: 's', east: 'e', west: 'w', up: 'u', down: 'd', northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw' };
    for (const [direction, destination] of Object.entries(record(value) ?? {})) {
        const data = record(destination);
        const target = data ? data.id ?? data.target : destination;
        if ((typeof target !== 'number' && typeof target !== 'string') || !Number.isFinite(Number(target))) continue;
        const key = direction.toLowerCase();
        result[directions[key] ?? key] = {
            target: `m_${Number(target)}`, gmcpDestId: Number(target), closed: false,
            hasDoor: Boolean(data?.hasDoor), doorName: text(data?.doorName) || undefined,
            flags: flags(data?.flags), doorFlags: flags(data?.doorFlags)
        };
    }
    return result;
};

// --- Live data supplemented by imported map metadata ---
export const resolveRoomInfoRoom = (
    roomId: string, rooms: Record<string, MapperRoom>, imported: unknown[] | undefined, isMmapperMap = false
): MapperRoom | undefined => {
    const live = rooms[roomId];
    if (!imported) return live;
    const [x, y, z, terrain, exits, name, masterId, mob, load, area, light, sundeath, align, portable, ridable, note, contents, description] = imported;
    if (!live) {
        const roomName = text(name) || `Room ${roomId.replace(/^m_/, '')}`;
        const lowerName = roomName.toLowerCase();
        const inferredZone = lowerName.includes('bree') ? 'Bree' : /shire|hobbit|buckland/.test(lowerName) ? 'The Shire' : lowerName.includes('moria') ? 'Moria' : 'Imported Map';
        return {
            id: roomId, gmcpId: Number(masterId) || 0, name: roomName,
            x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0,
            terrain: roomInfoTerrainLabel(terrain, isMmapperMap), exits: importExits(exits),
            zone: text(area) || inferredZone, desc: text(description), notes: text(note), contents: text(contents),
            mobFlags: flags(mob), loadFlags: flags(load), light: attribute(light),
            sundeath: typeof sundeath === 'number' ? sundeath : undefined, align: attribute(align),
            portable: toggle(portable), ridable: toggle(ridable), createdAt: Date.now()
        };
    }
    const resolved = { ...live };
    const baseExits = importExits(exits);
    resolved.exits = { ...baseExits, ...live.exits };
    for (const direction of Object.keys(resolved.exits)) {
        const current = live.exits[direction];
        const base = baseExits[direction];
        if (base && current && !current.mapFlagsEdited) resolved.exits[direction] = { ...base, ...current,
            flags: [...new Set([...(base.flags ?? []), ...(current.flags ?? [])])],
            doorFlags: [...new Set([...(base.doorFlags ?? []), ...(current.doorFlags ?? [])])] };
    }
    if (!resolved.terrain || resolved.terrain === 'Field') resolved.terrain = roomInfoTerrainLabel(terrain, isMmapperMap);
    resolved.mobFlags = live.mapFlagsEdited ? [...(live.mobFlags ?? [])] : [...new Set([...(live.mobFlags ?? []), ...flags(mob)])];
    resolved.loadFlags = live.mapFlagsEdited ? [...(live.loadFlags ?? [])] : [...new Set([...(live.loadFlags ?? []), ...flags(load)])];
    if (live.mapAttributesEdited?.includes('light')) resolved.mobFlags = resolved.mobFlags.filter(flag => !/^(?:BIN_MOB_)?(?:DARK|NOLIGHT)$/i.test(flag));
    if (resolved.light === undefined && light !== undefined) resolved.light = attribute(light);
    if (resolved.sundeath === undefined && typeof sundeath === 'number') resolved.sundeath = sundeath;
    if (resolved.light !== undefined && Number(resolved.light) === 1 && !resolved.mobFlags.includes('DARK')) resolved.mobFlags.push('DARK');
    if (resolved.sundeath !== undefined && Number(resolved.sundeath) === 0 && !resolved.mobFlags.includes('NO_SUNDEATH')) resolved.mobFlags.push('NO_SUNDEATH');
    if (!resolved.align && align && !live.mapAttributesEdited?.includes('align')) resolved.align = attribute(align);
    if (resolved.portable === undefined) resolved.portable = toggle(portable);
    if (resolved.ridable === undefined) resolved.ridable = toggle(ridable);
    resolved.notes = getMapperRoomNote(live, note);
    if (!resolved.contents) resolved.contents = text(contents);
    if (!resolved.desc || resolved.desc.startsWith('Alias of room')) resolved.desc = text(description) || resolved.desc;
    return resolved;
};
