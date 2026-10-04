/**
 * @file useCommandPanelStore.ts
 * @description Visibility state for desktop and mobile Commands panels.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActiveDockedPanelStore } from './useActiveDockedPanelStore';

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
            setIsOpen: isOpen => {
                set({ isOpen, ...(isOpen ? { isSkillsOpen: false } : {}) });
                const activeStore = useActiveDockedPanelStore.getState();
                if (isOpen) activeStore.setActivePanel('commands');
                else if (activeStore.activePanel === 'commands') activeStore.setActivePanel(null);
            },
            setIsSkillsOpen: isSkillsOpen => {
                set({ isSkillsOpen, ...(isSkillsOpen ? { isOpen: false } : {}) });
                const activeStore = useActiveDockedPanelStore.getState();
                if (isSkillsOpen) activeStore.setActivePanel('skills');
                else if (activeStore.activePanel === 'skills') activeStore.setActivePanel(null);
            },
            setIsMobileOpen: isMobileOpen => {
                set({ isMobileOpen, ...(isMobileOpen ? { isMobileGuideOpen: false } : {}) });
                const activeStore = useActiveDockedPanelStore.getState();
                if (isMobileOpen) activeStore.setActivePanel('skills');
                else if (activeStore.activePanel === 'skills') activeStore.setActivePanel(null);
            },
            setIsMobileGuideOpen: isMobileGuideOpen => {
                set({ isMobileGuideOpen, ...(isMobileGuideOpen ? { isMobileOpen: false } : {}) });
                const activeStore = useActiveDockedPanelStore.getState();
                if (isMobileGuideOpen) activeStore.setActivePanel('commands');
                else if (activeStore.activePanel === 'commands') activeStore.setActivePanel(null);
            },
            requestTab: requestedTab => set({ requestedTab }),
            clearRequestedTab: () => set({ requestedTab: null }),
        }),
        {
            name: 'mume-command-panel',
            partialize: state => ({ isOpen: state.isOpen }),
        }
    )
);
