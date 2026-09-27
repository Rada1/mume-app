/** @file useMobileHeaderTabs.ts — Keep mobile header panels mutually exclusive. */

import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useHelpStore } from '../stores/useHelpStore';
import { useSettingsStore } from '../stores/useSettingsStore';

type HeaderTab = 'commands' | 'gear' | 'players' | 'chat' | 'help' | 'menu';

// --- Logic Section ---
export function useMobileHeaderTabs(isMobile: boolean, menuOpen: boolean, setMenuOpen: (open: boolean) => void) {
    const isCommandPanelOpen = useCommandPanelStore(state => state.isOpen);
    const setIsCommandPanelOpen = useCommandPanelStore(state => state.setIsOpen);
    const isGearPanelOpen = useGearPanelStore(state => state.isOpen);
    const setIsGearPanelOpen = useGearPanelStore(state => state.setIsOpen);
    const showPlayersPanel = useSettingsStore(state => state.showPlayersPanel);
    const setShowPlayersPanel = useSettingsStore(state => state.setShowPlayersPanel);
    const showChatWindow = useSettingsStore(state => state.showChatWindow);
    const setShowChatWindow = useSettingsStore(state => state.setShowChatWindow);
    const isHelpOpen = useHelpStore(state => state.isOpen);
    const setIsHelpOpen = useHelpStore(state => state.setIsOpen);
    const helpData = useHelpStore(state => state.helpData);

    const toggleHeaderTab = (tab: HeaderTab): boolean => {
        const current = {
            commands: isCommandPanelOpen, gear: isGearPanelOpen,
            players: showPlayersPanel, chat: showChatWindow,
            help: isHelpOpen, menu: menuOpen,
        };
        const opening = !current[tab];
        if (isMobile && opening) {
            setIsCommandPanelOpen(false);
            setIsGearPanelOpen(false);
            setShowPlayersPanel(false);
            setShowChatWindow(false);
            setIsHelpOpen(false);
            setMenuOpen(false);
        }
        const setters = {
            commands: setIsCommandPanelOpen, gear: setIsGearPanelOpen,
            players: setShowPlayersPanel, chat: setShowChatWindow,
            help: setIsHelpOpen, menu: setMenuOpen,
        };
        setters[tab](opening);
        return opening;
    };

    return { isCommandPanelOpen, isGearPanelOpen, showPlayersPanel, showChatWindow,
        isHelpOpen, helpData, toggleHeaderTab };
}
