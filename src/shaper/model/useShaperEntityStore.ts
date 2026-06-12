/**
 * @file useShaperEntityStore.ts
 * @description Zustand store to manage real-time shaper mobiles/objects searches, loading states, and stats cache.
 */

import { create } from 'zustand';
import { createShaperEntityLookupTimers } from './shaperEntityLookupTimers';

const LOOKUP_TIMEOUT_MS = 10000;

export interface MobileEntity {
    vnum: number;
    name: string;
    level: number;
    class: string;
    align: number;
    rawText: string;
    info?: string | null;
}

export interface ObjectEntity {
    vnum: number;
    name: string;
    type: string;
    weight: number;
    value: number;
    extraFlags: string[];
    wearFlags: string[];
    rawText: string;
    info?: string | null;
}

interface ShaperEntityState {
    // Search inputs
    mobilesQuery: string;
    objectsQuery: string;

    // Search results lists (base vnums and names from /num lookup)
    mobiles: MobileEntity[];
    objects: ObjectEntity[];

    // Loading indicators
    loadingMobiles: boolean;
    loadingObjects: boolean;
    loadingStats: Record<number, boolean>;
    mobilesError: string | null;
    objectsError: string | null;

    // Stats cache (populated via /stat lookup)
    mobileStats: Record<number, MobileEntity>;
    objectStats: Record<number, ObjectEntity>;

    // Telnet command callback reference
    executeCommand: ((cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void) | null;

    // Actions
    setExecuteCommand: (cb: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void) => void;
    setMobilesQuery: (query: string) => void;
    setObjectsQuery: (query: string) => void;

    // Trigger lookups
    searchMobiles: (query: string) => void;
    searchObjects: (query: string) => void;
    loadMobileStats: (vnum: number) => void;
    loadObjectStats: (vnum: number) => void;

    // Callback handlers invoked by the capture parser
    setMobilesResult: (results: { vnum: number; name: string }[]) => void;
    setObjectsResult: (results: { vnum: number; name: string }[]) => void;
    setMobileStatResult: (stats: MobileEntity) => void;
    setObjectStatResult: (stats: ObjectEntity) => void;
    setMobileInfoResult: (vnum: number, info: string) => void;
    setObjectInfoResult: (vnum: number, info: string) => void;
}

// --- Store Section ---
export const useShaperEntityStore = create<ShaperEntityState>((set, get) => {
    const timers = createShaperEntityLookupTimers(LOOKUP_TIMEOUT_MS);

    return {
    mobilesQuery: '',
    objectsQuery: '',
    mobiles: [],
    objects: [],
    loadingMobiles: false,
    loadingObjects: false,
    loadingStats: {},
    mobilesError: null,
    objectsError: null,
    mobileStats: {},
    objectStats: {},
    executeCommand: null,

    setExecuteCommand: (cb) => set({ executeCommand: cb }),
    
    setMobilesQuery: (query) => set({ mobilesQuery: query }),
    setObjectsQuery: (query) => set({ objectsQuery: query }),

    searchMobiles: (query) => {
        const trimmed = query.trim();
        set({ mobilesQuery: query });
        if (trimmed.length < 3) {
            timers.clearMobiles();
            set({ mobiles: [], loadingMobiles: false, mobilesError: null });
            return;
        }
        const cmd = get().executeCommand;
        if (cmd) {
            set({ loadingMobiles: true, mobiles: [], mobilesError: null });
            timers.startMobiles(() => set({ loadingMobiles: false, mobilesError: 'Live mobile lookup timed out.' }));
            cmd(`/num m ${trimmed}`, true, false, false, true);
        } else {
            set({ loadingMobiles: false, mobilesError: 'No MUD command connection is available.' });
        }
    },

    searchObjects: (query) => {
        const trimmed = query.trim();
        set({ objectsQuery: query });
        if (trimmed.length < 3) {
            timers.clearObjects();
            set({ objects: [], loadingObjects: false, objectsError: null });
            return;
        }
        const cmd = get().executeCommand;
        if (cmd) {
            set({ loadingObjects: true, objects: [], objectsError: null });
            timers.startObjects(() => set({ loadingObjects: false, objectsError: 'Live object lookup timed out.' }));
            cmd(`/num o ${trimmed}`, true, false, false, true);
        } else {
            set({ loadingObjects: false, objectsError: 'No MUD command connection is available.' });
        }
    },

    loadMobileStats: (vnum) => {
        if (get().mobileStats[vnum] || get().loadingStats[vnum]) return;
        const cmd = get().executeCommand;
        if (cmd) {
            set((state) => ({
                loadingStats: { ...state.loadingStats, [vnum]: true }
            }));
            timers.startStats(vnum, () => {
                set((state) => ({ loadingStats: { ...state.loadingStats, [vnum]: false } }));
            });
            cmd(`/stat m ${vnum}`, true, false, false, true);
        }
    },

    loadObjectStats: (vnum) => {
        if (get().objectStats[vnum] || get().loadingStats[vnum]) return;
        const cmd = get().executeCommand;
        if (cmd) {
            set((state) => ({
                loadingStats: { ...state.loadingStats, [vnum]: true }
            }));
            timers.startStats(vnum, () => {
                set((state) => ({ loadingStats: { ...state.loadingStats, [vnum]: false } }));
            });
            cmd(`/stat o ${vnum}`, true, false, false, true);
        }
    },

    setMobilesResult: (results) => {
        timers.clearMobiles();
        const cached = get().mobileStats;
        const mobiles = results.map((item) => {
            const cachedStats = cached[item.vnum];
            return cachedStats || {
                vnum: item.vnum,
                name: item.name,
                level: 0,
                class: 'UNKNOWN',
                align: 0,
                rawText: 'Loading details...'
            };
        });
        set({ mobiles, loadingMobiles: false, mobilesError: null });
    },

    setObjectsResult: (results) => {
        timers.clearObjects();
        const cached = get().objectStats;
        const objects = results.map((item) => {
            const cachedStats = cached[item.vnum];
            return cachedStats || {
                vnum: item.vnum,
                name: item.name,
                type: 'UNKNOWN',
                weight: 0,
                value: 0,
                extraFlags: [],
                wearFlags: [],
                rawText: 'Loading details...'
            };
        });
        set({ objects, loadingObjects: false, objectsError: null });
    },

    setMobileStatResult: (stats) => {
        const vnum = stats.vnum;
        timers.clearStats(vnum);
        // Only fetch if we don't already have info cached
        const existing = get().mobileStats[vnum];
        const alreadyHasInfo = existing && existing.info !== undefined && existing.info !== null;

        set((state) => {
            const mobileStats = { ...state.mobileStats, [vnum]: { ...state.mobileStats[vnum], ...stats } };
            const loadingStats = { ...state.loadingStats, [vnum]: false };
            // Merge into active mobiles search list if present
            const mobiles = state.mobiles.map((mob) => 
                mob.vnum === vnum ? { ...mob, ...stats } : mob
            );

            return { mobileStats, loadingStats, mobiles };
        });

        if (alreadyHasInfo) {
            return;
        }

        // Auto-fetch builder info notes from /info command
        const cmd = get().executeCommand;
        if (cmd) {
            cmd(`/info m ${vnum} r`, true, false, false, true);
        }
    },

    setObjectStatResult: (stats) => {
        const vnum = stats.vnum;
        timers.clearStats(vnum);
        // Only fetch if we don't already have info cached
        const existing = get().objectStats[vnum];
        const alreadyHasInfo = existing && existing.info !== undefined && existing.info !== null;

        set((state) => {
            const objectStats = { ...state.objectStats, [vnum]: { ...state.objectStats[vnum], ...stats } };
            const loadingStats = { ...state.loadingStats, [vnum]: false };
            // Merge into active objects search list if present
            const objects = state.objects.map((obj) => 
                obj.vnum === vnum ? { ...obj, ...stats } : obj
            );

            return { objectStats, loadingStats, objects };
        });

        if (alreadyHasInfo) {
            return;
        }

        // Auto-fetch builder info notes from /info command
        const cmd = get().executeCommand;
        if (cmd) {
            cmd(`/info o ${vnum} r`, true, false, false, true);
        }
    },

    setMobileInfoResult: (vnum, info) => {
        set((state) => {
            const cached = state.mobileStats[vnum] || {
                vnum,
                name: 'Loading...',
                level: 0,
                class: 'UNKNOWN',
                align: 0,
                rawText: ''
            };
            const updated = { ...cached, info };
            const mobileStats = { ...state.mobileStats, [vnum]: updated };
            const mobiles = state.mobiles.map((mob) =>
                mob.vnum === vnum ? { ...mob, info } : mob
            );
            return { mobileStats, mobiles };
        });
    },

    setObjectInfoResult: (vnum, info) => {
        set((state) => {
            const cached = state.objectStats[vnum] || {
                vnum,
                name: 'Loading...',
                type: 'UNKNOWN',
                weight: 0,
                value: 0,
                extraFlags: [],
                wearFlags: [],
                rawText: ''
            };
            const updated = { ...cached, info };
            const objectStats = { ...state.objectStats, [vnum]: updated };
            const objects = state.objects.map((obj) =>
                obj.vnum === vnum ? { ...obj, info } : obj
            );
            return { objectStats, objects };
        });
    }
};
});
