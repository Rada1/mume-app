/** @file Candidate-based location tracking adapted from MMapper's Approved/Syncing/Experimenting flow. */
import type { MapperLocationInputs, MapperLocationState, MapperLocationCandidate, MapperLocationResult } from '../../types';
import type { GmcpRoomInfo } from './mapperTypes';
import { DIRS, getExitTargetId } from './mapperUtils';
import { normalizeExitKey } from '../../utils/gmcpExitUtils';
import { getMatchRoom, searchObservedRooms, getObservationIndex } from './roomObservationIndex';
import { roomMatchesObservation } from './roomObservationMatch';

// --- Confidence and candidate lifecycle ---
export const createRoomLocationState = (): MapperLocationState => ({confidence:'confirmed',candidates:[],lastConfirmedId:null});
export function resetRoomLocation(state: MapperLocationState): void {
    state.confidence = 'searching'; state.candidates = []; state.lastConfirmedId = null;
}
const canonical = (id: string) => /^\d+$/.test(id) ? `m_${id}` : id;
const targets = (exit: unknown): string[] => {
    if (exit && typeof exit === 'object' && 'targets' in exit && Array.isArray(exit.targets))
        return exit.targets.filter((id): id is string | number => typeof id === 'string' || typeof id === 'number').map(id => canonical(String(id)));
    const target = getExitTargetId(exit);
    return target ? [canonical(target)] : [];
};
function forwardRooms(inputs: MapperLocationInputs, id: string, direction: string): string[] {
    const room = getMatchRoom(inputs, id);
    const exit = room && Object.entries(room.exits).find(([dir]) => normalizeExitKey(dir) === direction)?.[1];
    return targets(exit);
}
function coordinateRooms(inputs: MapperLocationInputs, id: string, direction: string, levelOffset = 0): string[] {
    const room = getMatchRoom(inputs, id), delta = DIRS[direction];
    if (!room || !delta) return [];
    const x = room.x + delta.dx, y = room.y + delta.dy, z = room.z + (delta.dz || 0) + levelOffset;
    const ids = new Set<string>();
    const bucket = inputs.spatialIndexRef?.current[z]?.[`${Math.floor(x / 5)},${Math.floor(y / 5)}`] || [];
    for (const raw of bucket) ids.add(canonical(raw));
    for (const candidate of Object.values(inputs.roomsRef.current)) {
        if (candidate.x === x && candidate.y === y && Math.abs(candidate.z - z) < 0.5) ids.add(candidate.id);
    }
    return [...ids].filter(candidateId => {
        const candidate = getMatchRoom(inputs, candidateId);
        return candidate && candidate.x === x && candidate.y === y && Math.abs(candidate.z - z) < 0.5;
    });
}
function reverseRooms(inputs: MapperLocationInputs, id: string, direction: string): string[] {
    const opposite = DIRS[direction]?.opp;
    if (!opposite) return [];
    const ids = new Set(getObservationIndex(inputs.preloadedCoordsRef.current).incoming.get(`${opposite}:${id.replace(/^m_/, '')}`) || []);
    for (const room of Object.values(inputs.roomsRef.current)) {
        const exit = Object.entries(room.exits).find(([dir]) => normalizeExitKey(dir) === opposite)?.[1];
        if (targets(exit).includes(id)) ids.add(room.id);
    }
    return [...ids];
}

export function locateRoomObservation(inputs: MapperLocationInputs, state: MapperLocationState,
    data: GmcpRoomInfo, currentId: string | null, direction: string | null): MapperLocationResult {
    const wasUncertain = state.confidence !== 'confirmed';
    const approve = (id: string, source: string, relocation: boolean): MapperLocationResult => {
        state.confidence = 'confirmed'; state.candidates = [{id,weight:1}]; state.lastConfirmedId = id;
        return {id,source,relocation:relocation || wasUncertain};
    };
    const serverId = Number(data.num ?? data.vnum ?? data.id ?? 0);
    if (serverId > 0) {
        const raw = inputs.serverIdIndexRef.current[String(serverId)];
        // Exact IDs avoid classification, room scans and index construction.
        if (raw && inputs.preloadedCoordsRef.current[raw]) return approve(`m_${raw}`, 'EXACT_VNUM', !currentId || !direction
            || !forwardRooms(inputs, currentId, direction).includes(`m_${raw}`));
        const live = Object.values(inputs.roomsRef.current).find(room => room.gmcpId === serverId);
        if (live) return approve(live.id, 'EXACT_LIVE_ID', !currentId || !direction
            || !forwardRooms(inputs, currentId, direction).includes(live.id));
    }
    const externalPosition = state.confidence === 'confirmed' && currentId && state.lastConfirmedId !== currentId;
    const previous = externalPosition ? [{id:currentId,weight:1}] : state.candidates.length ? state.candidates
        : state.confidence === 'confirmed' && currentId ? [{id:currentId,weight:1}] : [];
    const valid = (ids: string[], weight: number): MapperLocationCandidate[] => ids.flatMap(id => {
        const room = getMatchRoom(inputs, id);
        return room && roomMatchesObservation(room, data) ? [{id,weight}] : [];
    });
    let matches: MapperLocationCandidate[] = [];
    let source = 'LOCAL_OBSERVATION';
    for (const candidate of previous) {
        if (!direction) { matches.push(...valid([candidate.id], candidate.weight)); continue; }
        // MMapper prefers connected destinations over geometric guesses, but validates both.
        const forward = valid(forwardRooms(inputs, candidate.id, direction), candidate.weight * 5.1);
        if (forward.length) matches.push(...forward);
        else {
            const reverse = valid(reverseRooms(inputs, candidate.id, direction), candidate.weight * 5.1);
            const coordinates = reverse.length ? reverse : valid(coordinateRooms(inputs, candidate.id, direction), candidate.weight);
            if (coordinates.length || DIRS[direction]?.dz) matches.push(...coordinates);
            else {
                const lower = valid(coordinateRooms(inputs, candidate.id, direction, -1), candidate.weight);
                matches.push(...(lower.length ? lower : valid(coordinateRooms(inputs, candidate.id, direction, 1), candidate.weight)));
            }
        }
    }
    let relocation = false;
    if (!matches.length) {
        matches = searchObservedRooms(inputs, data).map(id => ({id,weight:1}));
        source = 'INDEXED_OBSERVATION'; relocation = true;
    }
    const combined = new Map<string, number>();
    for (const match of matches) combined.set(match.id, Math.max(match.weight, combined.get(match.id) || 0));
    matches = [...combined].map(([id,weight]) => ({id,weight})).sort((a,b) => b.weight - a.weight);
    if (matches.length === 1 || (matches.length > 1 && matches[0].weight > matches[1].weight * 10))
        return approve(matches[0].id, source, relocation);
    if (matches.length > 0 && matches.length <= 500) {
        const best = matches[0].weight;
        state.candidates = matches.map(candidate => ({...candidate,weight:candidate.weight / best}));
        state.confidence = 'uncertain';
    } else resetRoomLocation(state);
    return {id:null,source:state.confidence.toUpperCase(),relocation:false};
}
