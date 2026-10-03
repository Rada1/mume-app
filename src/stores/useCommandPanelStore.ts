/**
 * @file useCommandPanelStore.ts
 * @description Visibility state for desktop and mobile Commands panels.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CommandPanelTab = 'combat' | 'skills' | 'utility';

interface CommandPanelState {
    isOpen: boolean;
    isMobileOpen: boolean;
    requestedTab: CommandPanelTab | null;
    setIsOpen: (isOpen: boolean) => void;
    setIsMobileOpen: (isOpen: boolean) => void;
    requestTab: (tab: CommandPanelTab) => void;
    clearRequestedTab: () => void;
}

export const useCommandPanelStore = create<CommandPanelState>()(
    persist(
        set => ({
            isOpen: true,
            isMobileOpen: false,
            requestedTab: null,
            setIsOpen: isOpen => set(state => ({ isOpen, ...(isOpen ? {} : { isMobileOpen: false }) })),
            setIsMobileOpen: isMobileOpen => set({ isMobileOpen }),
            requestTab: requestedTab => set({ requestedTab }),
            clearRequestedTab: () => set({ requestedTab: null }),
        }),
        {
            name: 'mume-command-panel',
            partialize: state => ({ isOpen: state.isOpen }),
        }
    )
);
