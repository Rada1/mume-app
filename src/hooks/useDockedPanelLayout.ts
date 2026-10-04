/** @file useDockedPanelLayout.ts — Selects one visible panel while keeping open panels mounted. */

import { useCallback, useEffect, useMemo } from 'react';
import { useArchiveStore } from '../stores/useArchiveStore';
import { useActiveDockedPanelStore } from '../stores/useActiveDockedPanelStore';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useHelpStore } from '../stores/useHelpStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUIStore } from '../stores/useUIStore';
import { DockedPanelId, DockedPanelTab, computeDockedPanelStyle } from '../utils/dockedPanelUtils';

// --- Logic Section ---
export function useDockedPanelLayout(isMobile: boolean, gameState: string, isEditorOpen: boolean) {
    const activePanel = useActiveDockedPanelStore(state => state.activePanel);
    const setActivePanel = useActiveDockedPanelStore(state => state.setActivePanel);
    const isArchiveOpen = useArchiveStore(state => state.isOpen);
    const isCommandPanelOpen = useCommandPanelStore(state => isMobile ? state.isMobileGuideOpen : state.isOpen);
    const isSkillsPanelOpen = useCommandPanelStore(state => isMobile ? state.isMobileOpen : state.isSkillsOpen);
    const isGearPanelOpen = useGearPanelStore(state => state.isOpen);
    const isHelpOpen = useHelpStore(state => state.isOpen);
    const showChatWindow = useSettingsStore(state => state.showChatWindow);
    const isShopOpen = useUIStore(state => state.isShopOpen);

    const availablePanels = useMemo<DockedPanelId[]>(() => {
        if (gameState === 'account') return isCommandPanelOpen ? ['commands'] as DockedPanelId[] : [];
        const panels: DockedPanelId[] = [];
        if (isEditorOpen) panels.push('editor');
        if (isArchiveOpen) panels.push('archive');
        if (isShopOpen && !isGearPanelOpen) panels.push('shop');
        if (isGearPanelOpen) panels.push('gear');
        if (isHelpOpen) panels.push('help');
        if (showChatWindow) panels.push('chat');
        if (isCommandPanelOpen || isSkillsPanelOpen) panels.push('commands');
        return panels;
    }, [gameState, isEditorOpen, isArchiveOpen, isShopOpen, isGearPanelOpen, isHelpOpen, showChatWindow, isCommandPanelOpen, isSkillsPanelOpen]);

    const defaultPanel = useMemo<DockedPanelTab | null>(() => {
        if (gameState === 'account') return isCommandPanelOpen ? 'commands' : null;
        if (isEditorOpen) return 'editor';
        if (isArchiveOpen) return 'archive';
        if (isShopOpen && !isGearPanelOpen) return 'shop';
        if (isGearPanelOpen) return 'gear';
        if (isHelpOpen) return 'help';
        if (showChatWindow) return 'chat';
        if (isSkillsPanelOpen) return 'skills';
        if (isCommandPanelOpen) return 'commands';
        return null;
    }, [gameState, isEditorOpen, isArchiveOpen, isShopOpen, isGearPanelOpen, isHelpOpen, showChatWindow, isCommandPanelOpen, isSkillsPanelOpen]);

    const selectedPanel = activePanel === undefined ? defaultPanel : activePanel;
    const selectedPanelId: DockedPanelId | null = selectedPanel === 'skills'
        ? 'commands'
        : selectedPanel === 'shop' && isGearPanelOpen
            ? 'gear'
            : selectedPanel ?? null;
    const isSelectedPanelAvailable = Boolean(selectedPanel && selectedPanelId &&
        availablePanels.includes(selectedPanelId) &&
        (selectedPanel === 'skills' ? isSkillsPanelOpen
            : selectedPanel === 'commands' ? isCommandPanelOpen
                : selectedPanel === 'shop' ? isShopOpen
                    : true));
    const activeDockedPanels: DockedPanelId[] = isSelectedPanelAvailable && selectedPanelId
        ? [selectedPanelId]
        : [];

    useEffect(() => {
        if (activePanel === undefined) {
            setActivePanel(defaultPanel);
        } else if (activePanel !== null && !isSelectedPanelAvailable) {
            setActivePanel(defaultPanel);
        }
    }, [activePanel, defaultPanel, isSelectedPanelAvailable, setActivePanel]);

    const getPanelStyle = useCallback((panelId: DockedPanelId) => {
        if (!activeDockedPanels.includes(panelId)) return { display: 'none' };
        return computeDockedPanelStyle(panelId, activeDockedPanels, isMobile);
    }, [activeDockedPanels, isMobile]);

    const hasMobileHeaderPanel = isMobile && activeDockedPanels.some(panel =>
        panel === 'commands' || panel === 'gear' || panel === 'help' || panel === 'chat'
    );

    return { activeDockedPanels, hasMobileHeaderPanel, getPanelStyle };
}
