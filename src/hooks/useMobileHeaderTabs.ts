/** @file useMobileHeaderTabs.ts — Keep mobile header panels mutually exclusive. */

import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useHelpStore } from '../stores/useHelpStore';
import { useSettingsStore } from '../stores/useSettingsStore';

type HeaderTab = 'commands' | 'skills' | 'gear' | 'chat' | 'group' | 'help' | 'menu';

// --- Logic Section ---
export function useMobileHeaderTabs(isMobile: boolean, menuOpen: boolean, setMenuOpen: (open: boolean) => void) {
    const isCommandPanelOpen = useCommandPanelStore(state => isMobile ? state.isMobileGuideOpen : state.isOpen);
    const isSkillsPanelOpen = useCommandPanelStore(state => isMobile ? state.isMobileOpen : state.isSkillsOpen);
    const setIsCommandPanelOpen = useCommandPanelStore(state => state.setIsOpen);
    const setIsMobileCommandPanelOpen = useCommandPanelStore(state => state.setIsMobileOpen);
    const setIsMobileGuideOpen = useCommandPanelStore(state => state.setIsMobileGuideOpen);
    const setIsDesktopSkillsOpen = useCommandPanelStore(state => state.setIsSkillsOpen);
    const isGearPanelOpen = useGearPanelStore(state => state.isOpen);
    const setIsGearPanelOpen = useGearPanelStore(state => state.setIsOpen);
    const showChatWindow = useSettingsStore(state => state.showChatWindow);
    const setShowChatWindow = useSettingsStore(state => state.setShowChatWindow);
    const showGroupPanel = useSettingsStore(state => state.showGroupPanel);
    const setShowGroupPanel = useSettingsStore(state => state.setShowGroupPanel);
    const isHelpOpen = useHelpStore(state => state.isOpen);
    const setIsHelpOpen = useHelpStore(state => state.setIsOpen);
    const helpData = useHelpStore(state => state.helpData);

    const toggleHeaderTab = (tab: HeaderTab): boolean => {
        const current = {
            commands: isCommandPanelOpen, skills: isSkillsPanelOpen, gear: isGearPanelOpen,
            chat: showChatWindow,
            group: showGroupPanel,
            help: isHelpOpen, menu: menuOpen,
        };
        const opening = !current[tab];
        if (isMobile && opening) {
            setIsMobileCommandPanelOpen(false);
            setIsMobileGuideOpen(false);
            setIsGearPanelOpen(false);
            setShowChatWindow(false);
            setShowGroupPanel(false);
            setIsHelpOpen(false);
            setMenuOpen(false);
        } else if (tab === 'commands' && opening) {
            setIsDesktopSkillsOpen(false);
        } else if (tab === 'skills' && opening) {
            setIsCommandPanelOpen(false);
        }
        const setters = {
            commands: isMobile ? setIsMobileGuideOpen : setIsCommandPanelOpen,
            skills: isMobile ? setIsMobileCommandPanelOpen : setIsDesktopSkillsOpen, gear: setIsGearPanelOpen,
            chat: setShowChatWindow,
            group: setShowGroupPanel,
            help: setIsHelpOpen, menu: setMenuOpen,
        };
        setters[tab](opening);
        return opening;
    };

    return { isCommandPanelOpen, isSkillsPanelOpen, isGearPanelOpen, showChatWindow, showGroupPanel,
        isHelpOpen, helpData, toggleHeaderTab };
}
