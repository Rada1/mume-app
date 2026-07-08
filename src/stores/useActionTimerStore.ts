/**
 * @file useActionTimerStore.ts
 * @description Stores state for active spell casting and physical action progress timers.
 */

import { create } from 'zustand';
import { useVitalsStore } from './useVitalsStore';

export interface ActionTimer {
    id: string;
    name: string;      // e.g., "Casting: Bless" or "Bandaging"
    startedAt: number;
    durationMs: number; // visual reference scale (default 4000ms)
    type: 'spell' | 'skill' | 'general';
    isFinished: boolean;
    isInterrupted: boolean;
    finishedAt: number | null;
    elapsedMs: number | null;
}

interface ActionTimerState {
    activeTimer: ActionTimer | null;
    pendingAction: { name: string; type: 'spell' | 'skill' | 'general'; sentAt: number } | null;
    setPendingAction: (name: string, type: 'spell' | 'skill' | 'general') => void;
    startTimer: (name: string, type: 'spell' | 'skill' | 'general', referenceDuration?: number) => void;
    completeTimer: (isInterrupted?: boolean) => void;
    cancelTimer: () => void;
    clearPending: () => void;
}

// --- Logic Section ---

export const useActionTimerStore = create<ActionTimerState>((set) => ({
    activeTimer: null,
    pendingAction: null,

    setPendingAction: (name, type) => set({ 
        pendingAction: { name, type, sentAt: Date.now() } 
    }),

    startTimer: (name, type, referenceDuration = 10000) => set({
        activeTimer: {
            id: `action-${Date.now()}`,
            name,
            startedAt: Date.now(),
            durationMs: referenceDuration,
            type,
            isFinished: false,
            isInterrupted: false,
            finishedAt: null,
            elapsedMs: null
        },
        pendingAction: null
    }),

    completeTimer: (isInterrupted = false) => set((state) => {
        if (!state.activeTimer || state.activeTimer.isFinished) return {};
        const elapsed = Date.now() - state.activeTimer.startedAt;
        return {
            activeTimer: {
                ...state.activeTimer,
                isFinished: true,
                isInterrupted,
                finishedAt: Date.now(),
                elapsedMs: elapsed
            }
        };
    }),

    cancelTimer: () => set({ activeTimer: null }),
    clearPending: () => set({ pendingAction: null })
}));

// --- Subscription Section ---

// Subscribe to vitals store changes to complete timers when the player exits the waiting state.
let lastWaiting: boolean | undefined = undefined;

useVitalsStore.subscribe((state) => {
    const waiting = state.conditions?.waiting;
    if (waiting !== lastWaiting) {
        const prevWaiting = lastWaiting;
        lastWaiting = waiting;
        
        if (prevWaiting === true && waiting === false) {
            const active = useActionTimerStore.getState().activeTimer;
            if (active && !active.isFinished) {
                console.log('[ActionTimer] Player exited waiting state. Completing timer.');
                useActionTimerStore.getState().completeTimer(false);
            }
        }
    }
});

