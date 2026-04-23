import { create } from 'zustand';
import { ReplayEvent, Keyframe } from '../../types/replay';

/**
 * @file useReplayBufferStore.ts
 * @description Central store for the DVR event buffer and state keyframes.
 */

interface ReplayBufferState {
    events: ReplayEvent[];
    keyframes: Keyframe[];
    currentTime: number;
    
    // Actions
    addEvent: (event: ReplayEvent) => void;
    addKeyframe: (keyframe: Keyframe) => void;
    clear: () => void;
    setCurrentTime: (time: number) => void;
}

export const useReplayBufferStore = create<ReplayBufferState>((set) => ({
    events: [],
    keyframes: [],
    currentTime: 0,

    addEvent: (event) => set((state) => ({
        events: [...state.events, event]
    })),

    addKeyframe: (keyframe) => set((state) => ({
        keyframes: [...state.keyframes, keyframe]
    })),

    clear: () => set({ events: [], keyframes: [], currentTime: 0 }),
    
    setCurrentTime: (time) => set({ currentTime: time })
}));
