/**
 * @file useAccountTargetStore.ts
 * @description Lightweight Zustand store for opening the TacticalTargetBar from account inline command long-presses.
 */

import { create } from 'zustand';

export interface AccountTargetMenuState {
    isOpen: boolean;
    activeCmd: 'play' | 'info' | 'practice' | null;
    selectedTarget: string | null;
    pressActive: boolean;
    openMenu: (cmd: 'play' | 'info' | 'practice', pressActive?: boolean) => void;
    selectTarget: (target: string | null) => void;
    closeMenu: () => void;
}

export const useAccountTargetStore = create<AccountTargetMenuState>((set) => ({
    isOpen: false,
    activeCmd: null,
    selectedTarget: null,
    pressActive: false,
    openMenu: (cmd, pressActive = false) => set({ isOpen: true, activeCmd: cmd, selectedTarget: null, pressActive }),
    selectTarget: (target) => set({ selectedTarget: target }),
    closeMenu: () => set({ isOpen: false, activeCmd: null, selectedTarget: null, pressActive: false })
}));
