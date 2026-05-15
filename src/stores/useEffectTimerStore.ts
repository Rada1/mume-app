/**
 * @file useEffectTimerStore.ts
 * @description Zustand store for active spell, herblore, and affect timers.
 */

import { create } from 'zustand';
import { EffectTimer, EffectTimerCatalogEntry, EffectTimerSource } from '../types';

interface EffectTimerState {
    timers: EffectTimer[];
    addTimer: (entry: EffectTimerCatalogEntry, source: EffectTimerSource, target?: string, notes?: string) => void;
    removeTimer: (id: string) => void;
    clearExpired: () => void;
    clearAll: () => void;
}

const totalDuration = (entry: EffectTimerCatalogEntry) =>
    entry.durationMs ?? entry.phases?.reduce((sum, phase) => sum + phase.durationMs, 0);

const timerKey = (entry: EffectTimerCatalogEntry, target?: string) =>
    `${entry.id}:${target || 'self'}`;

export const getTimerPhase = (timer: EffectTimer, now = Date.now()) => {
    if (!timer.phases?.length) return null;
    let elapsed = now - timer.startedAt;
    for (let index = 0; index < timer.phases.length; index += 1) {
        const phase = timer.phases[index];
        if (elapsed < phase.durationMs) {
            return { ...phase, index, remainingMs: phase.durationMs - elapsed };
        }
        elapsed -= phase.durationMs;
    }
    return null;
};

export const useEffectTimerStore = create<EffectTimerState>((set) => ({
    timers: [],
    addTimer: (entry, source, target, notes) => set((state) => {
        const now = Date.now();
        const durationMs = totalDuration(entry);
        const nextTimer: EffectTimer = {
            id: timerKey(entry, target),
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
        return {
            timers: [
                nextTimer,
                ...state.timers.filter(timer => timer.id !== nextTimer.id)
            ].slice(0, 60)
        };
    }),
    removeTimer: (id) => set((state) => ({ timers: state.timers.filter(timer => timer.id !== id) })),
    clearExpired: () => set((state) => {
        const now = Date.now();
        return { timers: state.timers.filter(timer => !timer.expiresAt || timer.expiresAt > now) };
    }),
    clearAll: () => set({ timers: [] })
}));
