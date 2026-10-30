/** @file Indexed MMapper-style room searches shared across location observations. */
import type { MapperLocationInputs, MapperMatchRoom, MapperObservationIndex, MapperPreloadedRoom } from '../../types';
import type { GmcpRoomInfo } from './mapperTypes';
import { getMmapperTerrainLabel } from './mmapperTerrain';
import { getExitTargetId } from './mapperUtils';
import { normalizeExitKey } from '../../utils/gmcpExitUtils';
import { normalizeRoomText, observedRoomName, roomMatchesObservation, hasRoomSearchEvidence } from './roomObservationMatch';

// --- Immutable base-map indices ---
const indices = new WeakMap<Record<string, MapperPreloadedRoom>, MapperObservationIndex>();
const add = (index: Map<string, string[]>, key: string, id: string) => {
    if (!key) return;
    const entries = index.get(key);
    if (entries) entries.push(id); else index.set(key, [id]);
};
export function getObservationIndex(preloaded: Record<string, MapperPreloadedRoom>): MapperObservationIndex {
    const cached = indices.get(preloaded);
    if (cached) return cached;
    const index: MapperObservationIndex = {names:new Map(),descriptions:new Map(),namesAndDescriptions:new Map(),areas:new Map(),incoming:new Map(),allIds:[]};
    for (const [rawId, room] of Object.entries(preloaded)) {
        const id = `m_${rawId}`, name = normalizeRoomText(room[5]), desc = normalizeRoomText(room[17]);
        index.allIds.push(id);
        add(index.names, name, id); add(index.descriptions, desc, id);
        if (name && desc) {
            let descriptions = index.namesAndDescriptions.get(name);
            if (!descriptions) { descriptions = new Map(); index.namesAndDescriptions.set(name, descriptions); }
            add(descriptions, desc, id);
        }
        add(index.areas, normalizeRoomText(room[9]) || '__unassigned__', id);
        for (const [dir,exit] of Object.entries(room[4] || {})) {
            const destinations = typeof exit === 'object' && exit.targets ? exit.targets.map(String) : [getExitTargetId(exit)];
            for (const target of destinations) if (target) add(index.incoming, `${normalizeExitKey(dir)}:${target.replace(/^m_/, '')}`, id);
        }
    }
    indices.set(preloaded, index);
    return index;
}

// --- Live and bundled room projection ---
export function getMatchRoom(inputs: MapperLocationInputs, id: string): MapperMatchRoom | null {
    const key = /^\d+$/.test(id) ? `m_${id}` : id;
    const live = inputs.roomsRef.current[key];
    const mapped = inputs.preloadedCoordsRef.current[key.replace(/^m_/, '')];
    if (!live && !mapped) return null;
    return {id:key,serverId:live?.gmcpId || Number(mapped?.[6]) || 0,
        name:live?.name || String(mapped?.[5] || ''),desc:live?.desc || String(mapped?.[17] || ''),
        terrain:getMmapperTerrainLabel(live?.terrain || mapped?.[3] || null).toLowerCase(),
        area:live?.zone || mapped?.[9] || '',x:live?.x ?? mapped?.[0] ?? 0,
        y:live?.y ?? mapped?.[1] ?? 0,z:live?.z ?? mapped?.[2] ?? 0,
        exits:{...mapped?.[4],...live?.exits}};
}

export function searchObservedRooms(inputs: MapperLocationInputs, data: GmcpRoomInfo): string[] {
    if (!hasRoomSearchEvidence(data)) return [];
    const index = getObservationIndex(inputs.preloadedCoordsRef.current);
    const name = observedRoomName(data), desc = normalizeRoomText(data.desc);
    // Match MMapper's lookup order: name+description, name, description, area.
    const ids = (name && desc && index.namesAndDescriptions.get(name)?.get(desc))
        || (name && index.names.get(name)) || (desc && index.descriptions.get(desc))
        || index.areas.get(normalizeRoomText(data.area || data.zone))
        || index.areas.get('__unassigned__') || index.allIds;
    const candidates = new Set<string>(ids || []);
    // Sparse live maps also contain imported/edited rooms absent from the base index.
    for (const room of Object.values(inputs.roomsRef.current)) {
        if ((name && normalizeRoomText(room.name) === name) || (desc && normalizeRoomText(room.desc) === desc)) candidates.add(room.id);
    }
    const matches: string[] = [];
    for (const id of candidates) {
        const room = getMatchRoom(inputs, id);
        if (room && roomMatchesObservation(room, data)) matches.push(id);
        if (matches.length > 500) break;
    }
    return matches;
}
