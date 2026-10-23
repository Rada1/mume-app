/** @file useCommandTreeController.ts — Shared command execution and capture engines for the V2 tree. */
import React from 'react';
import { useGame, useUI, useVitals } from '../context/GameContext';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useUnifiedCommandActions, type UnifiedCommandActionScope } from './useUnifiedCommandActions';
import { useCommandInspection } from './useCommandInspection';
import { useCommandPanelChat } from './useCommandPanelChat';
import { useCommandHelpMode } from './useCommandHelpMode';
import { useUnifiedCommandContext } from './useUnifiedCommandContext';
import { useCommandShop } from './useCommandShop';
import { useCommandPractice } from './useCommandPractice';
import { stripAnsiCodes } from '../utils/ansi';
import { getInlineGlowColor } from '../utils/inlineActionModel';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '../stores/useSettingsStore';
import { applyTacticalCommandPrefix, useTacticalCommandPrefixStore } from '../stores/useTacticalCommandPrefixStore';
import type { CustomButton } from '../types';
// --- Logic Section ---
export const useCommandTreeController = (initialScope: UnifiedCommandActionScope = "room", onClose?: () => void) => {
    const game = useGame();
    const roomLabel = stripAnsiCodes(game.roomName) || 'Room';
    const settings = useSettingsStore(useShallow(state => ({
        inlineCategories: state.inlineCategories, playerColor: state.playerColor,
        npcColor: state.npcColor, enemyColor: state.enemyColor, neutralColor: state.neutralColor,
        objectColor: state.objectColor, roomColor: state.roomColor, theme: state.theme
    })));
    const contextColor = React.useCallback((category: string, fallback?: string) => getInlineGlowColor(category, settings.inlineCategories, {
        player: settings.playerColor, ally: settings.playerColor, all: settings.playerColor,
        npc: settings.npcColor, enemy: settings.enemyColor, neutral: settings.neutralColor,
        object: settings.objectColor, room: settings.roomColor
    }, settings.theme) || fallback, [settings.inlineCategories, settings.playerColor, settings.npcColor, settings.enemyColor, settings.neutralColor, settings.objectColor, settings.roomColor, settings.theme]);
    const roomContextColor = contextColor('cat-room', settings.roomColor || '#22c55e');
    const ui = useUI();
    const vitals = useVitals();
    const setPanelOpen = useCommandPanelStore(state => game.viewport.isMobile ? state.setIsMobileGuideOpen : state.setIsOpen);
    const openRequest = useCommandPanelStore(state => state.openRequest);
    const shopOpenRequest = useCommandPanelStore(state => state.shopOpenRequest);
    const practiceOpenRequest = useCommandPanelStore(state => state.practiceOpenRequest);
    const [isCommandColumnOpen, setCommandColumnOpen] = React.useState(true);
    const [isTargetColumnOpen, setTargetColumnOpen] = React.useState(true);
    const [isChatCommandsOpen, setChatCommandsOpen] = React.useState(false);
    const [isBerserkConfirmationPending, setBerserkConfirmationPending] = React.useState(false);
    const berserkConfirmationTimer = React.useRef<number | null>(null);
    React.useEffect(() => {
        setCommandColumnOpen(true);
    }, [openRequest]);
    const {
        activeScope,
        entries,
        selectEntity,
        previewEntity,
        previewTargetContext,
        targetSelection,
        currentLabel,
        currentLabelColor,
        selectContext,
        activeState,
        currentEntityId
    } = useUnifiedCommandContext({
        initialScope,
        roomLabel,
        roomContextColor,
        contextColor,
        setPanelOpen
    });
    const communication = useCommandPanelChat(activeState);
    React.useEffect(() => {
        if (!communication.pendingRecipientCommand) return;
        setCommandColumnOpen(true);
        setTargetColumnOpen(true);
    }, [communication.pendingRecipientCommand]);
    const shop = useCommandShop(activeState, true, () => {
        setCommandColumnOpen(true);
    });
    React.useEffect(() => {
        if (!shopOpenRequest) return;
        useCommandPanelStore.getState().clearShopOpenRequest();
        setCommandColumnOpen(true);
        selectContext('room');
        shop.browse();
    }, [selectContext, shop.browse, shopOpenRequest]);
    const practice = useCommandPractice(activeState, !shop.outputVisible,
        () => { setCommandColumnOpen(true); shop.setOutputOpen(false); });
    React.useEffect(() => {
        if (!practiceOpenRequest) return;
        useCommandPanelStore.getState().clearPracticeOpenRequest();
        setCommandColumnOpen(true);
        selectContext('room');
        practice.setOpen(true);
    }, [practice.setOpen, practiceOpenRequest, selectContext]);
    const dismissOutputs = () => { shop.setOutputOpen(false); practice.setOutputOpen(false); };
    const { setActivePopoverState, setInspecting, requestRoomReport, requestWeatherReport, requestWhois, requestExamine, requestHelp, requestPersonalReport, closeDetails, capture, hasCapturedDetails } = useCommandInspection({ activeState, scope: activeScope, isVisible: !shop.outputVisible && !practice.outputVisible });
    const { isHelpMode, toggleHelpMode, executeHelp } = useCommandHelpMode({ dismissOutputs, requestHelp });
    const targetContext = activeState.context || null;
    const { menuButtons, actionGroups, communicationActionGroup } = useUnifiedCommandActions(activeState, activeScope, targetContext, communication.commands, communication.chatCommands);
    const visibleActionGroups = isChatCommandsOpen
        ? (communicationActionGroup.buttons.length ? [communicationActionGroup] : [])
        : actionGroups;
    const clearBerserkConfirmation = React.useCallback(() => {
        if (berserkConfirmationTimer.current !== null) window.clearTimeout(berserkConfirmationTimer.current);
        berserkConfirmationTimer.current = null;
        setBerserkConfirmationPending(false);
    }, []);
    React.useEffect(() => () => {
        if (berserkConfirmationTimer.current !== null) window.clearTimeout(berserkConfirmationTimer.current);
    }, []);
    const handleSelfStateButton = React.useCallback((button: CustomButton) => {
        if (game.isSpectateMode || button.setId !== 'trait-state') return;
        const stateGroup = button.inlineSubgroup;
        const commandValue = button.command.trim().toLowerCase().split(/\s+/).at(-1) || '';
        const positionValues: Record<string, string> = {
            stand: 'standing', sit: 'sitting', rest: 'resting', sleep: 'sleeping'
        };
        const value = stateGroup === 'Position' ? positionValues[button.command.trim().toLowerCase()] : commandValue;
        if (stateGroup !== 'Mood' || value !== 'berserk') clearBerserkConfirmation();
        if (stateGroup === 'Position') {
            if (!useTacticalCommandPrefixStore.getState().prefix) {
                if ((game.playerPosition || '').toLowerCase() === 'sleeping' && value !== 'sleeping') game.executeCommand('wake');
                game.setPlayerPosition(value);
            }
            game.executeCommand(applyTacticalCommandPrefix(button.command));
        } else if (stateGroup === 'Mood') {
            if (value === 'berserk' && (game.mood || '').toLowerCase() !== 'berserk') {
                if (!isBerserkConfirmationPending) {
                    setBerserkConfirmationPending(true);
                    berserkConfirmationTimer.current = window.setTimeout(() => {
                        berserkConfirmationTimer.current = null;
                        setBerserkConfirmationPending(false);
                    }, 4000);
                    return;
                }
            }
            clearBerserkConfirmation();
            game.setMood(value);
            game.executeCommand(button.command);
        } else if (stateGroup === 'Cast Speed') {
            game.setSpellSpeed(value);
            game.executeCommand(button.command);
        } else if (stateGroup === 'Alertness') {
            game.setAlertness(value);
            game.executeCommand(button.command);
        }
    }, [clearBerserkConfirmation, game, isBerserkConfirmationPending]);
    const toggleFavorite = (event: React.MouseEvent, command: string) => {
        event.stopPropagation();
        game.setFavorites(prev => prev.includes(command) ? prev.filter(value => value !== command) : [...prev, command]);
    };
    const closePanel = () => {
        if (onClose) onClose();
        else setPanelOpen(false);
        ui.setPopoverState(null);
    };
    const closeCommandColumn = () => {
        if (isTargetColumnOpen) setCommandColumnOpen(false);
        else closePanel();
    };
    const openTraitSettings = () => {
        ui.setSettingsTab('buttons');
        ui.setIsSettingsOpen(true);
    };
    const closeTargetColumn = () => {
        if (isCommandColumnOpen) setTargetColumnOpen(false);
        else closePanel();
    };
const treeButtons = React.useMemo(() => [...menuButtons, ...communicationActionGroup.buttons], [menuButtons, communicationActionGroup.buttons]);
return { practiceOpenRequest, previewEntity, previewTargetContext, game, ui, vitals, entries, targetSelection, selectEntity, selectContext, activeState, activeScope, communication, shop, practice, dismissOutputs, setInspecting, requestWhois, requestRoomReport, requestWeatherReport, requestPersonalReport, requestExamine, setActivePopoverState, closeDetails, capture, hasCapturedDetails, isHelpMode, toggleHelpMode, executeHelp, handleSelfStateButton, isBerserkConfirmationPending, toggleFavorite, closePanel, actionGroups, menuButtons: treeButtons };
};
