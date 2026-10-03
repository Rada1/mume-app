/** @file useMobileHeaderTabs.ts — Keep mobile header panels mutually exclusive. */

import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useHelpStore } from '../stores/useHelpStore';
import { useSettingsStore } from '../stores/useSettingsStore';

type HeaderTab = 'commands' | 'gear' | 'chat' | 'group' | 'help' | 'menu';

// --- Logic Section ---
export function useMobileHeaderTabs(isMobile: boolean, menuOpen: boolean, setMenuOpen: (open: boolean) => void) {
    const isCommandPanelOpen = useCommandPanelStore(state => isMobile ? state.isMobileOpen : state.isOpen);
    const setIsCommandPanelOpen = useCommandPanelStore(state => state.setIsOpen);
    const setIsMobileCommandPanelOpen = useCommandPanelStore(state => state.setIsMobileOpen);
    const setCommandPanelOpen = isMobile ? setIsMobileCommandPanelOpen : setIsCommandPanelOpen;
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
            commands: isCommandPanelOpen, gear: isGearPanelOpen,
            chat: showChatWindow,
            group: showGroupPanel,
            help: isHelpOpen, menu: menuOpen,
        };
        const opening = !current[tab];
        if (isMobile && opening) {
            setIsMobileCommandPanelOpen(false);
            setIsGearPanelOpen(false);
            setShowChatWindow(false);
            setShowGroupPanel(false);
            setIsHelpOpen(false);
            setMenuOpen(false);
        }
        const setters = {
            commands: setCommandPanelOpen, gear: setIsGearPanelOpen,
            chat: setShowChatWindow,
            group: setShowGroupPanel,
            help: setIsHelpOpen, menu: setMenuOpen,
        };
        setters[tab](opening);
        return opening;
    };

    return { isCommandPanelOpen, isGearPanelOpen, showChatWindow, showGroupPanel,
        isHelpOpen, helpData, toggleHeaderTab };
}
