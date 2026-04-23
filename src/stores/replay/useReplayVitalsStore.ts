/**
 * @file useReplayVitalsStore.ts
 * @description Isolated Zustand store for character vitals during replay (theater) mode.
 * Matches the interface of the main VitalsStore but is driven by the ReplayEngine.
 */

import { create } from 'zustand';
import { initialVitalsState, createVitalsActions, VitalsState } from '../slices/vitalsSlice';

export type ReplayVitalsStore = VitalsState & {
    loadSnapshot: (data: Partial<VitalsState>) => void;
};

export const useReplayVitalsStore = create<ReplayVitalsStore>((set, get) => ({
    ...initialVitalsState,
    ...createVitalsActions(set, get),
    loadSnapshot: (data) => set(data as any),
}));
