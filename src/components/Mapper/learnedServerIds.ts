/**
 * @file learnedServerIds.ts
 * @description Persisted backfill of GMCP server ids onto preloaded base-map rooms.
 *
 * The Ardanazgûm base map predates GMCP, so most preloaded rooms have an empty
 * server-id slot (`preloadedCoords[vnum][6]`). As the player walks, the room-info
 * handler confidently correlates a live GMCP server id to a preloaded vnum. That
 * mapping is recorded here so it survives reloads — without ever mutating the
 * shipped map file. On startup these learned ids are merged into the serverId
 * index, but only for server ids the base map doesn't already define: a genuine
 * id baked into the map always wins over a learned guess (self-correction).
 */

const STORAGE_KEY = 'mume_mapper_learned_server_ids';

// serverId (string) -> vnum (string). In-memory mirror of localStorage.
let learned: Record<string, string> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const read = (): Record<string, string> => {
    if (learned) return learned;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        learned = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        learned = {};
    }
    return learned;
};

const scheduleFlush = () => {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(learned || {}));
        } catch (e) {
            console.warn('[Mapper] Failed to persist learned server ids:', e);
        }
    }, 2000);
};

/** All learned serverId -> vnum mappings (for merging into the index on map load). */
export const getLearnedServerIds = (): Record<string, string> => ({ ...read() });

/**
 * Record a confidently-correlated serverId -> vnum mapping. No-ops if the same
 * mapping is already known. Persistence is debounced to collapse a walking burst.
 */
export const recordLearnedServerId = (serverId: string | number, vnum: string | number): void => {
    const sid = String(serverId);
    const vn = String(vnum);
    if (!sid || sid === '0' || sid === 'null' || sid === 'undefined' || !vn) return;
    const store = read();
    if (store[sid] === vn) return;
    store[sid] = vn;
    scheduleFlush();
};

/** Forget a learned mapping (e.g. when a higher-authority source contradicts it). */
export const forgetLearnedServerId = (serverId: string | number): void => {
    const sid = String(serverId);
    const store = read();
    if (store[sid] === undefined) return;
    delete store[sid];
    scheduleFlush();
};
