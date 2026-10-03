/** @file useTacticalArgumentChipStore.ts — Ephemeral argument chips for the docked command bar. */

import { create } from 'zustand';
import type { TacticalArgumentChipState } from '../types';

// --- Logic Section ---
export const useTacticalArgumentChipStore = create<TacticalArgumentChipState>(set => ({
    ownerId: null,
    command: null,
    chips: [],
    setArguments: (ownerId, command, chips) => set({ ownerId, command, chips }),
    clearArguments: ownerId => set(state => state.ownerId === ownerId
        ? { ownerId: null, command: null, chips: [] }
        : state)
}));
