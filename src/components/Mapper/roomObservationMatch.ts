/** @file MMapper-style room comparison: identity, tolerant static text and visible exits. */
import type { MapperMatchRoom, MapperPreloadedExit } from '../../types';
import type { GmcpRoomInfo } from './mapperTypes';
import { stripAnsi } from './mapperUtils';
import { getMmapperTerrainLabel } from './mmapperTerrain';
import { normalizeExitKey } from '../../utils/gmcpExitUtils';

// --- Static text comparison ---
export const normalizeRoomText = (value: unknown): string => stripAnsi(String(value ?? ''))
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
export const observedRoomName = (data: GmcpRoomInfo): string => {
    const name = normalizeRoomText(data.name);
    return /^(?:darkness|unknown room|pitch black|it is pitch black.*)$/.test(name) ? '' : name;
};

// MMapper defaults to 5% character tolerance. Bound the work by that budget.
export function roomTextMatches(mapped: string, observed: string): boolean {
    if (!observed || !mapped || mapped === observed) return true;
    const budget = Math.floor(mapped.length * 0.05);
    if (Math.abs(mapped.length - observed.length) > budget) return false;
    let previous = Array.from({length: observed.length + 1}, (_, i) => i);
    for (let i = 1; i <= mapped.length; i++) {
        const next = Array<number>(observed.length + 1).fill(budget + 1);
        next[0] = i;
        let lowest = next[0];
        for (let j = Math.max(1, i - budget); j <= Math.min(observed.length, i + budget); j++) {
            next[j] = Math.min(previous[j] + 1, next[j - 1] + 1, previous[j - 1] + (mapped[i - 1] === observed[j - 1] ? 0 : 1));
            lowest = Math.min(lowest, next[j]);
        }
        if (lowest > budget) return false;
        previous = next;
    }
    return previous[observed.length] <= budget;
}

// --- Weak properties: hidden doors and NO_MATCH exits ---
const flags = (exit: MapperPreloadedExit | undefined): string[] =>
    typeof exit === 'object' ? [...(exit.flags || []),...(exit.doorFlags || [])].map(flag => flag.toUpperCase()) : [];
export function roomExitsMatch(room: MapperMatchRoom, data: GmcpRoomInfo): boolean {
    if (data.exits === undefined) return true;
    const mapped = new Map(Object.entries(room.exits).map(([dir, exit]) => [normalizeExitKey(dir), exit]));
    const seen = new Map(Object.entries(data.exits).map(([dir, exit]) => [normalizeExitKey(dir), exit]));
    let tolerance = 0;
    for (const dir of new Set([...mapped.keys(), ...seen.keys()])) {
        if (dir === 'out' || dir === 'unknown') continue;
        const exit = mapped.get(dir), observed = seen.get(dir);
        const exitFlags = flags(exit);
        if (exitFlags.includes('NO_MATCH')) continue;
        const exists = exit !== undefined;
        const visible = observed !== undefined && observed !== false;
        if (exists === visible) continue;
        const door = typeof exit === 'object' && (exit.hasDoor || exitFlags.includes('DOOR'));
        if (exists && !visible && (exitFlags.includes('HIDDEN') || exitFlags.includes('SECRET'))) continue;
        const observedDoor = typeof observed === 'object' && (Boolean(observed.door) || observed.flags?.some(flag => /^door$/i.test(flag)));
        // MMapper tolerates one newly found secret door or a known door absent from view.
        if ((exists && door && !visible) || (!exists && observedDoor)) { if (++tolerance <= 1) continue; }
        return false;
    }
    return true;
}

export function roomMatchesObservation(room: MapperMatchRoom, data: GmcpRoomInfo): boolean {
    const id = Number(data.num ?? data.vnum ?? data.id ?? 0);
    if (id > 0 && room.serverId > 0) return id === room.serverId;
    const terrain = data.terrain ?? data.environment;
    if (terrain && room.terrain && getMmapperTerrainLabel(terrain).toLowerCase() !== room.terrain) return false;
    return roomTextMatches(normalizeRoomText(room.name), observedRoomName(data))
        && roomTextMatches(normalizeRoomText(room.desc), normalizeRoomText(data.desc))
        && roomExitsMatch(room, data);
}

export const hasRoomSearchEvidence = (data: GmcpRoomInfo): boolean =>
    Boolean((observedRoomName(data) && (normalizeRoomText(data.desc) || data.exits !== undefined))
        || normalizeRoomText(data.desc).length >= 40);
