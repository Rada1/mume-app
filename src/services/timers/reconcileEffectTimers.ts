/**
 * @file reconcileEffectTimers.ts
 * @description Reconciles local self-effect timers with authoritative stat output.
 */

// --- Logic Section ---
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { normalizeAffectName } from '../../utils/affectUtils';

const isReported = (timerName: string, reported: string[]) => {
    const timerKey = normalizeAffectName(timerName);
    return reported.some(affect => {
        const affectKey = normalizeAffectName(affect);
        return affectKey === timerKey || affectKey.includes(timerKey) || timerKey.includes(affectKey);
    });
};

/** A complete `stat` affect list is the server authority over local self timers. */
export const reconcileSelfEffectTimers = (reportedAffects: string[]) => {
    const store = useEffectTimerStore.getState();
    store.timers
        .filter(timer => !timer.target && !isReported(timer.name, reportedAffects))
        .forEach(timer => store.removeTimer(timer.id));
};
