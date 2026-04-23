/**
 * @file useReplayCombatStore.ts
 * @description Isolated Zustand store for combat and group state during replay (theater) mode.
 * Matches the interface of the main CombatStore but is driven by the ReplayEngine.
 */

import { create } from 'zustand';
import { initialCombatState, createCombatActions, CombatState } from '../slices/combatSlice';

export type ReplayCombatStore = CombatState & {
    loadSnapshot: (data: Partial<CombatState>) => void;
};

export const useReplayCombatStore = create<ReplayCombatStore>((set, get) => ({
    ...initialCombatState,
    ...createCombatActions(set, get),
    loadSnapshot: (data) => set(data as any),
}));
