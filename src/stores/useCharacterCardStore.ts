/**
 * @file useCharacterCardStore.ts
 * @description Open/close state for the full character summary card (portrait,
 * combat stats, equipment, inventory, skills) — a floating panel toggled from
 * the prompt box.
 */

import { create } from 'zustand';

interface CharacterCardState {
    isOpen: boolean;
    anchorRect: { left: number; top: number; width: number; height: number } | null;
    open: (anchorRect?: { left: number; top: number; width: number; height: number } | null) => void;
    close: () => void;
    toggle: (anchorRect?: { left: number; top: number; width: number; height: number } | null) => void;
}

export const useCharacterCardStore = create<CharacterCardState>((set) => ({
    isOpen: false,
    anchorRect: null,
    open: (anchorRect = null) => set({ isOpen: true, anchorRect }),
    close: () => set({ isOpen: false, anchorRect: null }),
    toggle: (anchorRect = null) => set(state => ({
        isOpen: !state.isOpen,
        anchorRect: state.isOpen ? null : anchorRect
    }))
}));
