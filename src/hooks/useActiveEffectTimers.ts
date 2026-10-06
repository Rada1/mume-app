/**
 * @file useActiveEffectTimers.ts
 * @description Returns timers for the currently viewed character.
 */

import { useEffectTimerStore } from '../stores/useEffectTimerStore';
import { useModeStore } from '../stores/useModeStore';
import { useSpectateEffectTimerStore } from '../stores/spectate/useSpectateEffectTimerStore';

// --- Logic Section ---

export const useActiveEffectTimers = () => {
    const isWatchingTarget = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const playerTimers = useEffectTimerStore(state => state.timers);
    const spectateTimers = useSpectateEffectTimerStore(state => state.timers);
    return isWatchingTarget ? spectateTimers : playerTimers;
};
