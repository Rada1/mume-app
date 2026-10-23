/** @file useSunPosition.ts -- Resolves continuous solar coordinates from the calibrated game clock. */
import type { MumeTime, SunPosition } from '../types';
import { getSunPosition } from '../utils/sunPosition';

// --- Clock Resolution ---
export const useSunPosition = (time?: MumeTime): SunPosition => {
    if (!time) return { xPercent: 94, yPercent: 8, opacity: 1 };
    const elapsed = time.lastSyncRealTime / 1000 - (time.mumeStartEpoch ?? 1517443173);
    const fraction = Number.isFinite(elapsed) ? ((elapsed % 1) + 1) % 1 : 0;
    return getSunPosition(time, fraction);
};
