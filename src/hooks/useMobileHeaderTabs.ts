/** @file useMobileHeaderTabs.ts — Selects header panels and keeps mobile panels exclusive. */

import { useActiveDockedPanelStore } from '../stores/useActiveDockedPanelStore';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useHelpStore } from '../stores/useHelpStore';
import { useSettingsStore } from '../stores/useSettingsStore';
type HeaderTab = 'commands' | 'skills' | 'gear' | 'chat' | 'help' | 'group' | 'menu';

// --- Logic Section ---
export function useMobileHeaderTabs(isMobile: boolean, menuOpen: boolean, setMenuOpen: (open: boolean) => void) {
    const activePanel = useActiveDockedPanelStore(state => state.activePanel);
    const setActivePanel = useActiveDockedPanelStore(state => state.setActivePanel);
    const hasCommandGuide = useCommandPanelStore(state => isMobile ? state.isMobileGuideOpen : state.isOpen);
    const hasSkillsPanel = useCommandPanelStore(state => isMobile ? state.isMobileOpen : state.isSkillsOpen);
    const setIsCommandPanelOpen = useCommandPanelStore(state => state.setIsOpen);
    const setIsMobileCommandPanelOpen = useCommandPanelStore(state => state.setIsMobileOpen);
    const setIsMobileGuideOpen = useCommandPanelStore(state => state.setIsMobileGuideOpen);
    const setIsDesktopSkillsOpen = useCommandPanelStore(state => state.setIsSkillsOpen);
    const hasGearPanel = useGearPanelStore(state => state.isOpen);
    const setIsGearPanelOpen = useGearPanelStore(state => state.setIsOpen);
    const hasChatWindow = useSettingsStore(state => state.showChatWindow);
    const setShowChatWindow = useSettingsStore(state => state.setShowChatWindow);
    const showGroupPanel = useSettingsStore(state => state.showGroupPanel);
    const setShowGroupPanel = useSettingsStore(state => state.setShowGroupPanel);
    const hasHelpPanel = useHelpStore(state => state.isOpen);
    const setIsHelpOpen = useHelpStore(state => state.setIsOpen);
    const helpData = useHelpStore(state => state.helpData);

    const isCommandPanelOpen = hasCommandGuide && activePanel === 'commands';
    const isSkillsPanelOpen = hasSkillsPanel && activePanel === 'skills';
    const isGearPanelOpen = hasGearPanel && activePanel === 'gear';
    const showChatWindow = hasChatWindow && activePanel === 'chat';
    const isHelpOpen = hasHelpPanel && activePanel === 'help';

    const toggleHeaderTab = (tab: HeaderTab): boolean => {
        const current = {
            commands: isCommandPanelOpen,
            skills: isSkillsPanelOpen,
            gear: isGearPanelOpen,
            chat: showChatWindow,
            group: showGroupPanel,
            help: isHelpOpen,
            menu: menuOpen
        };
        const opening = !current[tab];

        if (isMobile && opening) {
            setShowGroupPanel(false);
            setMenuOpen(false);
            if (tab === 'menu' || tab === 'group') setActivePanel(null);
        } else if (!isMobile && tab === 'commands' && opening) {
            setIsDesktopSkillsOpen(false);
        } else if (!isMobile && tab === 'skills' && opening) {
            setIsCommandPanelOpen(false);
        }

        const setters: Record<HeaderTab, (open: boolean) => void> = {
            commands: isMobile ? setIsMobileGuideOpen : setIsCommandPanelOpen,
            skills: isMobile ? setIsMobileCommandPanelOpen : setIsDesktopSkillsOpen,
            gear: setIsGearPanelOpen,
            chat: setShowChatWindow,
            group: setShowGroupPanel,
            help: setIsHelpOpen,
            menu: setMenuOpen
        };
        setters[tab](opening);

        if (isMobile && tab === 'group' && opening) setActivePanel(null);
        else if (!opening && activePanel === tab) setActivePanel(null);

        return opening;
    };

    return {
        isCommandPanelOpen,
        isSkillsPanelOpen,
        isGearPanelOpen,
        showChatWindow,
        showGroupPanel,
        isHelpOpen,
        helpData,
        toggleHeaderTab
    };
}
