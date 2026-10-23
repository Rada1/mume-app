/**
 * @file useCommandPanelStore.ts
 * @description Visibility state for desktop and mobile Commands panels.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActiveDockedPanelStore } from './useActiveDockedPanelStore';

export type CommandPanelTab = 'combat' | 'skills' | 'utility';
export type CommandPanelTargetSection = 'shop' | 'practice' | 'communication-online' | 'communication-room';

interface CommandPanelState {
    isOpen: boolean;
    isSkillsOpen: boolean;
    isMobileOpen: boolean;
    isMobileGuideOpen: boolean;
    isHelpMode: boolean;
    openRequest: number;
    shopOpenRequest: number;
    practiceOpenRequest: number;
    targetSectionRequestId: number;
    requestedTargetSection: CommandPanelTargetSection | null;
    requestedTab: CommandPanelTab | null;
    setIsOpen: (isOpen: boolean) => void;
    setIsSkillsOpen: (isOpen: boolean) => void;
    setIsMobileOpen: (isOpen: boolean) => void;
    setIsMobileGuideOpen: (isOpen: boolean) => void;
    setIsHelpMode: (isHelpMode: boolean) => void;
    toggleHelpMode: () => void;
    requestTab: (tab: CommandPanelTab) => void;
    requestShopOpen: () => void;
    clearShopOpenRequest: () => void;
    requestPracticeOpen: () => void;
    clearPracticeOpenRequest: () => void;
    requestTargetSection: (section: CommandPanelTargetSection) => void;
    clearTargetSectionRequest: () => void;
    clearRequestedTab: () => void;
}

export const useCommandPanelStore = create<CommandPanelState>()(
    persist(
        set => ({
            isOpen: true,
            isSkillsOpen: false,
            isMobileOpen: false,
            isMobileGuideOpen: false,
            isHelpMode: false,
            openRequest: 0,
            shopOpenRequest: 0,
            practiceOpenRequest: 0,
            targetSectionRequestId: 0,
            requestedTargetSection: null,
            requestedTab: null,
            setIsHelpMode: isHelpMode => set({ isHelpMode }),
            toggleHelpMode: () => set(state => ({ isHelpMode: !state.isHelpMode })),
            setIsOpen: isOpen => {
                set(state => ({
                    isOpen,
                    ...(isOpen ? { isSkillsOpen: false, openRequest: state.openRequest + 1 } : {})
                }));
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
                set(state => ({
                    isMobileGuideOpen,
                    ...(isMobileGuideOpen ? { isMobileOpen: false, openRequest: state.openRequest + 1 } : {})
                }));
                const activeStore = useActiveDockedPanelStore.getState();
                if (isMobileGuideOpen) activeStore.setActivePanel('commands');
                else if (activeStore.activePanel === 'commands') activeStore.setActivePanel(null);
            },
            requestTab: requestedTab => set({ requestedTab }),
            requestShopOpen: () => set(state => ({ shopOpenRequest: state.shopOpenRequest + 1 })),
            clearShopOpenRequest: () => set({ shopOpenRequest: 0 }),
            requestPracticeOpen: () => set(state => ({ practiceOpenRequest: state.practiceOpenRequest + 1 })),
            clearPracticeOpenRequest: () => set({ practiceOpenRequest: 0 }),
            requestTargetSection: requestedTargetSection => set(state => ({
                targetSectionRequestId: state.targetSectionRequestId + 1,
                requestedTargetSection
            })),
            clearTargetSectionRequest: () => set({ requestedTargetSection: null }),
            clearRequestedTab: () => set({ requestedTab: null }),
        }),
        {
            name: 'mume-command-panel',
            partialize: state => ({ isOpen: state.isOpen }),
        }
    )
);
