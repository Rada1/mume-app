/**
 * @file textRoomMatcher.ts
 * @description Scores text-derived room events against nearby/preloaded mapper rooms.
 */

import { GmcpExitInfo, MapperExit, MapperRoom } from './mapperTypes';
import { DIRS, getExitTargetId } from './mapperUtils';

// --- Types Section ---
interface MatchRoomEvent {
    name?: string;
    desc?: string;
    area?: string;
    zone?: string;
    terrain?: string | null;
    exits?: Record<string, { name?: string } | number | false>;
}

export interface CandidateMatch {
    id: string;
    score: number;
    source: string;
}

type PreloadedExit = string | number | false | Partial<MapperExit & GmcpExitInfo & { target: string; to: string }>;
type PreloadedRoom = [
    number,
    number,
    number,
    string | number,
    Record<string, PreloadedExit>,
    string,
    string | number,
    string[],
    string[],
    string?,
    ...unknown[]
];

type RoomRecord = Record<string, MapperRoom>;
type PreloadedRecord = Record<string, PreloadedRoom | undefined>;

// --- Logic Section ---
const normalize = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const getPreloadedRoom = (preloaded: PreloadedRecord, roomId: string) => {
    const rawId = roomId.startsWith('m_') ? roomId.substring(2) : roomId;
    return preloaded[rawId];
};

const getRoomName = (rooms: RoomRecord, preloaded: PreloadedRecord, roomId: string) => {
    return rooms[roomId]?.name || getPreloadedRoom(preloaded, roomId)?.[5] || '';
};

const getRoomDesc = (rooms: RoomRecord, preloaded: PreloadedRecord, roomId: string) => {
    return rooms[roomId]?.desc || getPreloadedRoom(preloaded, roomId)?.[17] || '';
};

const getRoomZone = (rooms: RoomRecord, preloaded: PreloadedRecord, roomId: string) => {
    return rooms[roomId]?.zone || getPreloadedRoom(preloaded, roomId)?.[9] || '';
};

const getRoomTerrain = (rooms: RoomRecord, preloaded: PreloadedRecord, roomId: string) => {
    return rooms[roomId]?.terrain || getPreloadedRoom(preloaded, roomId)?.[3] || '';
};

const getRoomExits = (rooms: RoomRecord, preloaded: PreloadedRecord, roomId: string) => {
    return rooms[roomId]?.exits || getPreloadedRoom(preloaded, roomId)?.[4] || {};
};

const addCandidate = (candidates: Map<string, string>, id: string | undefined, source: string) => {
    if (!id) return;
    candidates.set(/^\d+$/.test(id) ? `m_${id}` : id, source);
};

const getNeighborCandidates = (
    currentRoom: MapperRoom | null,
    dirUsed: string | null,
    rooms: RoomRecord,
    preloaded: PreloadedRecord
) => {
    const candidates = new Map<string, string>();
    if (!currentRoom) return candidates;

    const dirs = dirUsed ? [dirUsed] : Object.keys(DIRS);
    const currentRaw = String(currentRoom.id || '').replace(/^m_/, '');
    const currentPreloaded = preloaded[currentRaw];

    for (const dir of dirs) {
        const liveExit = currentRoom.exits?.[dir];
        addCandidate(candidates, getExitTargetId(liveExit), 'TEXT_EXIT');
        addCandidate(candidates, getExitTargetId(currentPreloaded?.[4]?.[dir]), 'TEXT_PRELOADED_EXIT');

        const delta = DIRS[dir];
        if (!delta) continue;
        const px = Math.round(currentRoom.x + (delta.dx || 0));
        const py = Math.round(currentRoom.y + (delta.dy || 0));
        const pz = Math.round((currentRoom.z || 0) + (delta.dz || 0));
        for (const room of Object.values(rooms)) {
            if (Math.round(room.x) === px && Math.round(room.y) === py && Math.round(room.z || 0) === pz) {
                addCandidate(candidates, room.id, 'TEXT_COORD');
            }
        }
    }

    return candidates;
};

const scoreCandidate = (
    event: MatchRoomEvent,
    candidateId: string,
    rooms: RoomRecord,
    preloaded: PreloadedRecord
) => {
    let score = 0;
    const eventName = normalize(event.name);
    const candidateName = normalize(getRoomName(rooms, preloaded, candidateId));
    if (eventName && candidateName) {
        if (eventName === candidateName) score += 80;
        else if (candidateName.includes(eventName) || eventName.includes(candidateName)) score += 30;
    }

    const eventDesc = normalize(event.desc);
    const candidateDesc = normalize(getRoomDesc(rooms, preloaded, candidateId));
    if (eventDesc && candidateDesc) {
        if (eventDesc === candidateDesc) score += 60;
        else if (candidateDesc.includes(eventDesc.slice(0, 60))) score += 24;
    }

    if (normalize(event.area || event.zone) && normalize(event.area || event.zone) === normalize(getRoomZone(rooms, preloaded, candidateId))) {
        score += 16;
    }
    if (normalize(event.terrain) && normalize(event.terrain) === normalize(getRoomTerrain(rooms, preloaded, candidateId))) {
        score += 12;
    }

    const eventExits = event.exits || {};
    const candidateExits = getRoomExits(rooms, preloaded, candidateId);
    for (const dir of Object.keys(eventExits)) {
        if (candidateExits?.[dir]) score += 6;
        const eventExitName = normalize(typeof eventExits[dir] === 'object' ? eventExits[dir]?.name : '');
        const targetId = getExitTargetId(candidateExits?.[dir]);
        const targetName = targetId ? normalize(getRoomName(rooms, preloaded, targetId.startsWith('m_') ? targetId : `m_${targetId}`)) : '';
        if (eventExitName && targetName && (eventExitName === targetName || targetName.includes(eventExitName))) {
            score += 10;
        }
    }

    return score;
};

export const findBestTextRoomMatch = (
    event: MatchRoomEvent,
    currentRoom: MapperRoom | null,
    dirUsed: string | null,
    rooms: RoomRecord,
    preloaded: PreloadedRecord
): CandidateMatch | null => {
    const candidates = getNeighborCandidates(currentRoom, dirUsed, rooms, preloaded);
    let best: CandidateMatch | null = null;

    for (const [id, source] of candidates) {
        const score = scoreCandidate(event, id, rooms, preloaded);
        if (!best || score > best.score) best = { id, score, source };
    }

    return best && best.score >= 70 ? best : null;
};
