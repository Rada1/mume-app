/**
 * @file useCommandPanelStore.ts
 * @description Visibility state for desktop and mobile Commands panels.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CommandPanelTab = 'combat' | 'skills' | 'utility';

interface CommandPanelState {
    isOpen: boolean;
    isSkillsOpen: boolean;
    isMobileOpen: boolean;
    isMobileGuideOpen: boolean;
    requestedTab: CommandPanelTab | null;
    setIsOpen: (isOpen: boolean) => void;
    setIsSkillsOpen: (isOpen: boolean) => void;
    setIsMobileOpen: (isOpen: boolean) => void;
    setIsMobileGuideOpen: (isOpen: boolean) => void;
    requestTab: (tab: CommandPanelTab) => void;
    clearRequestedTab: () => void;
}

export const useCommandPanelStore = create<CommandPanelState>()(
    persist(
        set => ({
            isOpen: true,
            isSkillsOpen: false,
            isMobileOpen: false,
            isMobileGuideOpen: false,
            requestedTab: null,
            setIsOpen: isOpen => set({ isOpen, ...(isOpen ? { isSkillsOpen: false } : {}) }),
            setIsSkillsOpen: isSkillsOpen => set({ isSkillsOpen, ...(isSkillsOpen ? { isOpen: false } : {}) }),
            setIsMobileOpen: isMobileOpen => set({ isMobileOpen, ...(isMobileOpen ? { isMobileGuideOpen: false } : {}) }),
            setIsMobileGuideOpen: isMobileGuideOpen => set({ isMobileGuideOpen, ...(isMobileGuideOpen ? { isMobileOpen: false } : {}) }),
            requestTab: requestedTab => set({ requestedTab }),
            clearRequestedTab: () => set({ requestedTab: null }),
        }),
        {
            name: 'mume-command-panel',
            partialize: state => ({ isOpen: state.isOpen }),
        }
    )
);
