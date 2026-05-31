/**
 * @file smartWalkPath.ts
 * @description Pure Smart Walk pathfinding helpers over live and preloaded mapper data.
 */

import { MapperExit, MapperRoom } from '../mapperTypes';

type SmartWalkExit = Partial<MapperExit> & { target?: string };
type SmartWalkExitMap = Record<string, SmartWalkExit>;
type PreloadedRoomData = unknown[];
type PreloadedMap = Record<string, PreloadedRoomData>;

interface SmartWalkPathOptions {
    revealAll?: boolean;
    exploredVnums?: Set<string>;
}

interface PathNode {
    id: string;
    dirs: string[];
    ids: string[];
    g: number;
    f: number;
}

const dirShortNames: Record<string, string> = {
    north: 'n', south: 's', east: 'e', west: 'w',
    up: 'u', down: 'd', northeast: 'ne', northwest: 'nw',
    southeast: 'se', southwest: 'sw'
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

// --- Id Section ---
export const normalizeSmartWalkId = (id: string | null) => {
    if (!id) return '';
    if (id.startsWith('m_')) return id.substring(2);
    if (id.startsWith('r_')) return id.substring(2);
    return id;
};

// --- Exit Section ---
const getRawExitTarget = (exit: unknown): string | null => {
    if (typeof exit === 'string' || typeof exit === 'number') return String(exit);
    if (!isRecord(exit)) return null;
    const rawDest = exit.target ?? exit.id ?? exit.gmcpDestId ?? exit.to ?? exit.to_vnum ?? null;
    return rawDest === null || rawDest === undefined ? null : String(rawDest);
};

const parsePreloadedExits = (rawExits: unknown): SmartWalkExitMap => {
    if (!isRecord(rawExits)) return {};

    const formatted: SmartWalkExitMap = {};
    for (const [dir, exit] of Object.entries(rawExits)) {
        const shortDir = dirShortNames[dir.toLowerCase()] ?? dir.toLowerCase();
        const targetVnum = getRawExitTarget(exit);
        if (!targetVnum) continue;

        formatted[shortDir] = {
            ...(isRecord(exit) ? exit : {}),
            closed: false,
            target: targetVnum.startsWith('m_') ? targetVnum : `m_${targetVnum}`
        };
    }
    return formatted;
};

export const getSmartWalkExits = (
    id: string,
    rooms: Record<string, MapperRoom>,
    preloaded: PreloadedMap
): SmartWalkExitMap | null => {
    if (!id) return null;
    const normId = normalizeSmartWalkId(id);
    const ghost = preloaded[normId];
    const combined = parsePreloadedExits(ghost?.[4]);
    const local = rooms[id] || rooms[`m_${normId}`] || rooms[normId];

    if (local?.exits) {
        for (const [dir, localExit] of Object.entries(local.exits)) {
            const localTarget = getRawExitTarget(localExit);
            const existing = combined[dir];

            if (existing && !localTarget) {
                combined[dir] = { ...existing, ...localExit, target: existing.target };
            } else {
                combined[dir] = localTarget
                    ? { ...existing, ...localExit, target: localTarget }
                    : { ...existing, ...localExit };
            }
        }
    }

    return Object.keys(combined).length > 0 ? combined : null;
};

export const getSmartWalkDirection = (
    fromId: string,
    toId: string,
    rooms: Record<string, MapperRoom>,
    preloaded: PreloadedMap
): string | null => {
    const exits = getSmartWalkExits(fromId, rooms, preloaded);
    if (!exits) return null;
    const normTo = normalizeSmartWalkId(toId);

    for (const [dir, exit] of Object.entries(exits)) {
        if (exit.target && normalizeSmartWalkId(String(exit.target)) === normTo) return dir;
    }
    return null;
};

// --- Pathfinding Section ---
export const findSmartWalkPath = (
    startId: string,
    endId: string,
    rooms: Record<string, MapperRoom>,
    preloaded: PreloadedMap,
    options: SmartWalkPathOptions = {}
): { dirs: string[], ids: string[] } | null => {
    if (!startId || !endId) return null;
    const normStart = normalizeSmartWalkId(startId);
    const normEnd = normalizeSmartWalkId(endId);

    if (normStart === normEnd) return { dirs: [], ids: [startId] };

    const getCoordinates = (id: string): { x: number, y: number, z: number } | null => {
        const normId = normalizeSmartWalkId(id);
        const p = preloaded[normId];
        if (p) return { x: Number(p[0]), y: Number(p[1]), z: Number(p[2] || 0) };
        const local = rooms[id] || rooms[`m_${normId}`] || rooms[normId];
        return local ? { x: local.x, y: local.y, z: local.z || 0 } : null;
    };

    const getHeuristic = (id: string): number => {
        const c1 = getCoordinates(id);
        const c2 = getCoordinates(endId);
        if (!c1 || !c2) return 0;
        return Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y) + Math.abs(c1.z - c2.z) * 5;
    };

    const isTraversable = (id: string): boolean => {
        if (options.revealAll) return true;
        if (!options.exploredVnums) return true;
        const normId = normalizeSmartWalkId(id);
        return options.exploredVnums.has(normId) || !!(rooms[id] || rooms[`m_${normId}`] || rooms[normId]);
    };

    const queue: PathNode[] = [{ id: startId, dirs: [], ids: [startId], g: 0, f: getHeuristic(startId) }];
    const visited = new Set<string>([normStart]);
    let iterations = 0;
    const MAX_ITERATIONS = 50000;

    const insertSorted = (item: PathNode) => {
        let low = 0;
        let high = queue.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (queue[mid].f > item.f) low = mid + 1;
            else high = mid;
        }
        queue.splice(low, 0, item);
    };

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const curr = queue.pop()!;
        const exits = getSmartWalkExits(curr.id, rooms, preloaded);
        if (!exits) continue;

        for (const [dir, exit] of Object.entries(exits)) {
            if (!exit.target || exit.closed) continue;

            const targetId = String(exit.target);
            const normNext = normalizeSmartWalkId(targetId);
            if (!isTraversable(targetId)) continue;

            if (normNext === normEnd) {
                return { dirs: [...curr.dirs, dir], ids: [...curr.ids, targetId] };
            }

            if (!visited.has(normNext)) {
                visited.add(normNext);
                const standardId = targetId.startsWith('m_') ? targetId : (preloaded[normNext] ? `m_${normNext}` : targetId);
                const gNext = curr.g + 1;
                insertSorted({
                    id: standardId,
                    dirs: [...curr.dirs, dir],
                    ids: [...curr.ids, targetId],
                    g: gNext,
                    f: gNext + getHeuristic(standardId)
                });
            }
        }
    }

    return null;
};
