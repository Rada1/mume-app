/**
 * @file useCharacterPanelStore.ts
 * @description Minimized and visibility state for the desktop character console ("This is You").
 */

// --- Logic Section ---
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CharacterPanelState {
    isMinimized: boolean;
    setIsMinimized: (isMinimized: boolean) => void;
    toggleMinimized: () => void;
}

export const useCharacterPanelStore = create<CharacterPanelState>()(
    persist(
        set => ({
            isMinimized: false,
            setIsMinimized: isMinimized => set({ isMinimized }),
            toggleMinimized: () => set(state => ({ isMinimized: !state.isMinimized })),
        }),
        { name: 'mume-character-panel-minimized' }
    )
);
