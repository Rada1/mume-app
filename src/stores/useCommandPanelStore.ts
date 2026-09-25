/**
 * @file useCommandPanelStore.ts
 * @description Visibility state for the desktop Commands panel.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CommandPanelState {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const useCommandPanelStore = create<CommandPanelState>()(
    persist(
        set => ({
            isOpen: true,
            setIsOpen: isOpen => set({ isOpen }),
        }),
        { name: 'mume-command-panel' }
    )
);
