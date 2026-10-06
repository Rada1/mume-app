/**
 * @file useSpectateEffectTimerStore.ts
 * @description Separate live and display timers for the watched character.
 */

import { create, type StateCreator } from 'zustand';
import type { EffectTimer, EffectTimerCatalogEntry, EffectTimerSource } from '../../types';

// --- Logic Section ---

interface SpectateEffectTimerState {
    timers: EffectTimer[];
    addTimer: (entry: EffectTimerCatalogEntry, source: EffectTimerSource, target?: string, notes?: string) => void;
    removeTimer: (id: string) => void;
    clearExpired: (now?: number) => void;
    clearAll: () => void;
    setTimers: (timers: EffectTimer[]) => void;
}

const timerStoreCreator: StateCreator<SpectateEffectTimerState> = set => ({
    timers: [],
    addTimer: (entry, source, target, notes) => set(state => {
        const now = Date.now();
        const durationMs = entry.durationMs ?? entry.phases?.reduce((sum, phase) => sum + phase.durationMs, 0);
        const timer: EffectTimer = {
            id: `${entry.id}:${target || 'self'}`,
            catalogId: entry.id,
            name: entry.name,
            kind: entry.kind,
            target,
            startedAt: now,
            expiresAt: durationMs ? now + durationMs : undefined,
            durationMs,
            source,
            confidence: durationMs ? 'estimated' : 'unknown',
            phases: entry.phases,
            notes
        };
        return { timers: [timer, ...state.timers.filter(current => current.id !== timer.id)].slice(0, 60) };
    }),
    removeTimer: id => set(state => ({ timers: state.timers.filter(timer => timer.id !== id) })),
    clearExpired: (now = Date.now()) => set(state => ({
        timers: state.timers.filter(timer => !timer.expiresAt || timer.expiresAt > now)
    })),
    clearAll: () => set({ timers: [] }),
    setTimers: timers => set({ timers })
});

// The live store ingests snooped lines; the display store follows DVR playback.
export const useSpectateLiveEffectTimerStore = create<SpectateEffectTimerState>(timerStoreCreator);
export const useSpectateEffectTimerStore = create<SpectateEffectTimerState>(timerStoreCreator);
