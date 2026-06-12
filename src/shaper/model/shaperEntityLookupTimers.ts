/**
 * @file shaperEntityLookupTimers.ts
 * @description Timeout helpers for live Shaper entity lookups.
 */

type Timer = ReturnType<typeof setTimeout>;

// --- Timer Section ---
export const createShaperEntityLookupTimers = (timeoutMs: number) => {
    const timers = {
        mobiles: null as Timer | null,
        objects: null as Timer | null,
        stats: {} as Record<number, Timer>
    };
    let mobileToken = 0;
    let objectToken = 0;

    const clearMobiles = () => {
        if (timers.mobiles) clearTimeout(timers.mobiles);
        timers.mobiles = null;
    };
    const clearObjects = () => {
        if (timers.objects) clearTimeout(timers.objects);
        timers.objects = null;
    };
    const clearStats = (vnum: number) => {
        if (timers.stats[vnum]) clearTimeout(timers.stats[vnum]);
        delete timers.stats[vnum];
    };

    const startMobiles = (onTimeout: () => void) => {
        const token = mobileToken += 1;
        clearMobiles();
        timers.mobiles = setTimeout(() => {
            if (token === mobileToken) onTimeout();
        }, timeoutMs);
    };
    const startObjects = (onTimeout: () => void) => {
        const token = objectToken += 1;
        clearObjects();
        timers.objects = setTimeout(() => {
            if (token === objectToken) onTimeout();
        }, timeoutMs);
    };
    const startStats = (vnum: number, onTimeout: () => void) => {
        clearStats(vnum);
        timers.stats[vnum] = setTimeout(() => {
            onTimeout();
            clearStats(vnum);
        }, timeoutMs);
    };

    return { clearMobiles, clearObjects, clearStats, startMobiles, startObjects, startStats };
};
