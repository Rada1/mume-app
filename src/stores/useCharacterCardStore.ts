/**
 * @file useCharacterCardStore.ts
 * @description Open/close state for the full character summary card (portrait,
 * combat stats, equipment, inventory, skills) — a floating panel toggled from
 * the prompt box.
 */

import { create } from 'zustand';

interface CharacterCardState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

export const useCharacterCardStore = create<CharacterCardState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set(state => ({ isOpen: !state.isOpen }))
}));
