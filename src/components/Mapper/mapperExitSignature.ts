/**
 * @file mapperExitSignature.ts
 * @description Exit-signature room matching, ported from MMapper's compareWeakProps.
 *
 * In darkness / vnum-0 rooms the server gives us no authoritative id and the room
 * name is usually hidden, so coordinates are the only thing the old matcher had to
 * go on — and stacked up/down rooms (same x/y, different z) or coordinate collisions
 * made it pick the wrong room (or, pre-gate, fabricate one). The set of visible exit
 * directions the player CAN see ("Exits: north, east, down.") is a strong fingerprint:
 * we use it to disambiguate among the rooms reachable by the move and to reject a
 * guess whose exits conflict with what the player actually sees.
 */

import { DIRS, getExitTargetId } from './mapperUtils';
import { MapperRoom } from './mapperTypes';

// Both short ("n") and long ("north") exit keys appear across GMCP, text, and
// preloaded data; collapse them to a single canonical short key.
const DIR_CANON: Record<string, string> = {
    n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
    u: 'u', up: 'u', d: 'd', down: 'd',
    ne: 'ne', northeast: 'ne', nw: 'nw', northwest: 'nw',
    se: 'se', southeast: 'se', sw: 'sw', southwest: 'sw'
};

/** Canonical set of directions that actually have an exit (truthy, not `false`). */
export const exitDirSet = (exits: Record<string, any> | undefined | null): Set<string> => {
    const out = new Set<string>();
    if (!exits) return out;
    for (const raw of Object.keys(exits)) {
        const val = (exits as any)[raw];
        if (val === false || val === undefined || val === null) continue;
        const canon = DIR_CANON[raw.toLowerCase()];
        if (canon) out.add(canon);
    }
    return out;
};

export interface ExitSignatureScore {
    match: number;          // directions present in both event and candidate
    eventOnly: number;      // directions the player sees but the candidate lacks (hard conflict)
    candidateOnly: number;  // directions the candidate has but the player didn't report (soft)
    score: number;          // weighted total used for ranking
}

/**
 * Compare the exits the player can see (event) against a candidate room's exits.
 * Player-observed exits the candidate lacks are the strongest "wrong room" signal —
 * you cannot see an exit that does not exist. Exits the candidate has but the player
 * didn't list are softer (a closed/secret door, or darkness hiding it), so they are
 * penalized lightly rather than treated as a conflict.
 */
export const compareExitSignature = (
    eventExits: Record<string, any> | undefined | null,
    candidateExits: Record<string, any> | undefined | null
): ExitSignatureScore => {
    const ev = exitDirSet(eventExits);
    const cand = exitDirSet(candidateExits);
    let match = 0;
    let eventOnly = 0;
    for (const d of ev) {
        if (cand.has(d)) match++;
        else eventOnly++;
    }
    let candidateOnly = 0;
    for (const d of cand) {
        if (!ev.has(d)) candidateOnly++;
    }
    const score = match * 2 - eventOnly * 3 - candidateOnly;
    return { match, eventOnly, candidateOnly, score };
};

interface FindParams {
    currentRoom: MapperRoom;
    dirUsed: string;
    eventExits: Record<string, any> | undefined | null;
    rooms: Record<string, MapperRoom>;
    preloaded: Record<string, any>;
    // floor -> "bucketX,bucketY" -> vnum[]; bucket = floor(coord / 5). Bounds the
    // preloaded scan so we never walk the entire (tens-of-thousands) base map per move.
    spatialIndex?: Record<number, Record<string, string[]>>;
}

export interface ExitSignatureMatch {
    id: string;
    vnum: string | null;
    score: ExitSignatureScore;
    topological: boolean; // candidate is the forward-exit target or reverse-connects to current
}

/**
 * Find the room reached by moving `dirUsed` out of `currentRoom`, chosen by exit
 * signature among: the current room's forward-exit target, materialized rooms at the
 * predicted coordinate, and preloaded rooms near it (or whose reverse exit points back
 * at the current room). Returns the best confident, non-conflicting match, else null.
 */
export const findRoomByExitSignature = ({
    currentRoom, dirUsed, eventExits, rooms, preloaded, spatialIndex
}: FindParams): ExitSignatureMatch | null => {
    if (exitDirSet(eventExits).size === 0) return null; // no signal to match on
    const dir = DIRS[dirUsed];
    if (!dir) return null;

    const px = Math.round(currentRoom.x + (dir.dx || 0));
    const py = Math.round(currentRoom.y + (dir.dy || 0));
    const pz = Math.round((currentRoom.z || 0) + (dir.dz || 0));
    const zone = currentRoom.zone;
    const currentRaw = String(currentRoom.id || '').replace(/^m_/, '');
    const opp = dir.opp;

    // candidate id -> { exits, topological }
    const candidates = new Map<string, { exits: Record<string, any>; topological: boolean }>();
    const add = (id: string | undefined, exits: Record<string, any> | undefined, topological: boolean) => {
        if (!id || !exits) return;
        const key = /^\d+$/.test(id) ? `m_${id}` : id;
        const existing = candidates.get(key);
        if (existing) {
            if (topological) existing.topological = true;
            return;
        }
        candidates.set(key, { exits, topological });
    };
    const addById = (id: string | undefined, topological: boolean) => {
        if (!id) return;
        const key = /^\d+$/.test(id) ? `m_${id}` : id;
        const live = rooms[key];
        if (live) { add(key, live.exits, topological); return; }
        const raw = key.replace(/^m_/, '');
        const p = preloaded[raw];
        if (p && p[4]) add(key, p[4], topological);
    };

    // 1. Forward-exit target from the current room (live exits first, then preloaded).
    addById(getExitTargetId(currentRoom.exits?.[dirUsed]), true);
    addById(getExitTargetId(preloaded[currentRaw]?.[4]?.[dirUsed]), true);

    // 2. Materialized rooms sitting at the predicted coordinate (same zone).
    for (const id of Object.keys(rooms)) {
        const r = rooms[id];
        if (zone && r.zone !== zone) continue;
        if (Math.round(r.x) === px && Math.round(r.y) === py && Math.abs(Math.round(r.z || 0) - pz) < 0.5) {
            add(id, r.exits || {}, false);
        }
    }

    // 3. Preloaded rooms near the predicted coordinate (bounded via the spatial index),
    //    flagged topological when their reverse exit points back at the current room.
    const floorBuckets = spatialIndex?.[pz];
    if (floorBuckets) {
        const bx = Math.floor(px / 5);
        const by = Math.floor(py / 5);
        for (let ix = bx - 1; ix <= bx + 1; ix++) {
            for (let iy = by - 1; iy <= by + 1; iy++) {
                const arr = floorBuckets[`${ix},${iy}`];
                if (!arr) continue;
                for (const vnum of arr) {
                    const p = preloaded[vnum];
                    if (!p || !p[4]) continue;
                    if (zone && p[9] && p[9] !== zone) continue;
                    const reverseToCurrent = !!currentRaw && !!opp
                        && String(getExitTargetId(p[4][opp])) === currentRaw;
                    add(`m_${vnum}`, p[4], reverseToCurrent);
                }
            }
        }
    }

    let best: ExitSignatureMatch | null = null;
    for (const [id, cand] of candidates) {
        const score = compareExitSignature(eventExits, cand.exits);
        if (!best
            || score.score > best.score.score
            || (score.score === best.score.score && cand.topological && !best.topological)) {
            best = { id, vnum: id.startsWith('m_') ? id.substring(2) : null, score, topological: cand.topological };
        }
    }

    if (!best) return null;

    // Acceptance gate: never claim a room the player can't be in (a visible exit it
    // lacks), and require real confidence — two shared exits, or one shared exit when
    // the candidate is topologically confirmed (handles single-exit corridors/stairs).
    const noConflict = best.score.eventOnly === 0;
    const confident = best.score.match >= 2 || (best.topological && best.score.match >= 1);
    if (noConflict && confident && best.score.score > 0) return best;
    return null;
};
