/** @file useAutomaticTargetStore.ts — Holds the latest user-selected automatic target for the target chip. */

// --- Logic Section ---
import { create } from 'zustand';

interface AutomaticTargetState {
    target: string | null;
    setTarget: (target: string | null) => void;
}

export const useAutomaticTargetStore = create<AutomaticTargetState>(set => ({
    target: null,
    setTarget: target => set({ target })
}));
