/**
 * @file useEffectTimerStore.ts
 * @description Zustand store for active spell, herblore, and affect timers.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EffectTimer, EffectTimerCatalogEntry, EffectTimerSource } from '../types';

interface EffectTimerState {
    timers: EffectTimer[];
    timersByCharacter: Record<string, EffectTimer[]>;
    currentCharacter: string | null;
    addTimer: (entry: EffectTimerCatalogEntry, source: EffectTimerSource, target?: string, notes?: string) => void;
    removeTimer: (id: string) => void;
    clearExpired: () => void;
    clearAll: () => void;
    setCurrentCharacter: (name: string | null) => void;
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

const writeSlice = (state: EffectTimerState, next: EffectTimer[]) => {
    const char = state.currentCharacter;
    return {
        timers: next,
        timersByCharacter: char
            ? { ...state.timersByCharacter, [char]: next }
            : state.timersByCharacter,
    };
};

export const useEffectTimerStore = create<EffectTimerState>()(
    persist(
        (set) => ({
            timers: [],
            timersByCharacter: {},
            currentCharacter: null,
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
                const next = [
                    nextTimer,
                    ...state.timers.filter(timer => timer.id !== nextTimer.id)
                ].slice(0, 60);
                return writeSlice(state, next);
            }),
            removeTimer: (id) => set((state) => writeSlice(state, state.timers.filter(timer => timer.id !== id))),
            clearExpired: () => set((state) => {
                const now = Date.now();
                const next = state.timers.filter(timer => !timer.expiresAt || timer.expiresAt > now);
                if (next.length === state.timers.length) return state;
                return writeSlice(state, next);
            }),
            clearAll: () => set((state) => writeSlice(state, [])),
            setCurrentCharacter: (name) => set((state) => {
                const now = Date.now();
                const slice = name ? (state.timersByCharacter[name] || []) : [];
                const active = slice.filter(timer => !timer.expiresAt || timer.expiresAt > now);
                return {
                    currentCharacter: name,
                    timers: active,
                    timersByCharacter: name && active.length !== slice.length
                        ? { ...state.timersByCharacter, [name]: active }
                        : state.timersByCharacter,
                };
            }),
        }),
        {
            name: 'mume-effect-timers',
            version: 1,
            partialize: (state) => ({ timersByCharacter: state.timersByCharacter }),
        }
    )
);
