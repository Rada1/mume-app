/**
 * @file useSpectateCombatStore.ts
 * @description Display store for the spectated character's visible combat data.
 */

import { create } from 'zustand';
import {
    CombatState,
    initialCombatState,
    createCombatActions
} from '../slices/combatSlice';

export const useSpectateCombatStore = create<CombatState>((set, get) => ({
    ...initialCombatState,
    ...createCombatActions(set, get)
}));

export const getSpectateCombat = () => useSpectateCombatStore.getState();
