/** @file useOutdoorTwilight.ts -- Resolves the outdoor vignette from the calibrated game clock. */
import type { MumeTime, TwilightAppearance } from '../types';
import { getTwilightAppearance } from '../utils/twilightAppearance';

// --- Clock-Based Appearance ---
export const useOutdoorTwilight = (
    time: MumeTime | undefined, isOutdoor: boolean, isEnabled: boolean,
): TwilightAppearance => {
    if (!time) return { phase: null, progress: 0, color: 'rgb(99, 73, 132)', opacity: 0 };
    const elapsed = time.lastSyncRealTime / 1000 - (time.mumeStartEpoch ?? 1517443173);
    const fraction = Number.isFinite(elapsed) ? ((elapsed % 1) + 1) % 1 : 0;
    const appearance = getTwilightAppearance(time, fraction);
    return { ...appearance, opacity: isOutdoor && isEnabled ? appearance.opacity : 0 };
};
