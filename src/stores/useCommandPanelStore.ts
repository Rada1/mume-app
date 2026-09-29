/**
 * @file useCommandPanelStore.ts
 * @description Visibility state for desktop and mobile Commands panels.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CommandPanelState {
    isOpen: boolean;
    isMobileOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    setIsMobileOpen: (isOpen: boolean) => void;
}

export const useCommandPanelStore = create<CommandPanelState>()(
    persist(
        set => ({
            isOpen: true,
            isMobileOpen: false,
            setIsOpen: isOpen => set(state => ({ isOpen, ...(isOpen ? {} : { isMobileOpen: false }) })),
            setIsMobileOpen: isMobileOpen => set({ isMobileOpen }),
        }),
        {
            name: 'mume-command-panel',
            partialize: state => ({ isOpen: state.isOpen }),
        }
    )
);
