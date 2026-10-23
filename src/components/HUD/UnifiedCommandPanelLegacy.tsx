/**
 * @file UnifiedCommandPanel.tsx
 */
import React from 'react';
import { LegacyCommandOutputs } from './LegacyCommandOutputs';
import { HelpCircle, MessageCircle, Tag, X } from 'lucide-react';
import { SkillsSyncPrompt } from './SkillsSyncPrompt';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import { useUnifiedCommandActions, type UnifiedCommandActionScope } from '../../hooks/useUnifiedCommandActions';
import { InlineActionDeck } from '../Popovers/StandardMenu/InlineActionDeck';
import { PopoverActionButton } from '../Popovers/StandardMenu/PopoverActionButton';
import { useCommandInspection } from '../../hooks/useCommandInspection';
import { useCommandPanelChat } from '../../hooks/useCommandPanelChat';
import { useCommandHelpMode } from '../../hooks/useCommandHelpMode';
import { useUnifiedCommandContext } from '../../hooks/useUnifiedCommandContext';
import { CommandPanelViews } from './CommandPanelViews';
import { CommandCommunicationInlineComposer } from './CommandCommunicationInlineComposer';
import { CommandHelpBanner } from './CommandHelpBanner';
import { useCommandShop } from '../../hooks/useCommandShop';
import { CommandShopActions } from './CommandShopActions';
import { useCommandPractice } from '../../hooks/useCommandPractice';
import { CommandPracticeActions } from './CommandPracticeActions';
import { CommandActionTargetPicker } from '../Popovers/StandardMenu/CommandActionTargetPicker';
import { GearSelectionActions } from '../GearSelectionActions';
import { stripAnsiCodes } from '../../utils/ansi';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { applyTacticalCommandPrefix, useTacticalCommandPrefixStore } from '../../stores/useTacticalCommandPrefixStore';
import type { CustomButton } from '../../types';
import './UnifiedCommandPanel.css';
import './CommandHelp.css';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
// --- Logic Section ---
interface UnifiedCommandPanelProps {
    initialScope?: UnifiedCommandActionScope; onClose?: () => void;
}
export const UnifiedCommandPanelLegacy: React.FC<UnifiedCommandPanelProps> = ({ initialScope = 'room', onClose }) => {
    const game = useGame(); const roomLabel = stripAnsiCodes(game.roomName) || 'Room';
    const settings = useSettingsStore();
    const contextColor = (category: string, fallback?: string) => getInlineGlowColor(category, settings.inlineCategories, {
        player: settings.playerColor, ally: settings.playerColor, all: settings.playerColor,
        npc: settings.npcColor, enemy: settings.enemyColor, neutral: settings.neutralColor,
        object: settings.objectColor, room: settings.roomColor
    }, settings.theme) || fallback;
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
    const { actionGroups, communicationActionGroup } = useUnifiedCommandActions(activeState, activeScope, targetContext, communication.commands, communication.chatCommands);
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
    return <aside className={`command-guide-panel unified-command-panel${isCommandColumnOpen ? '' : ' commands-column-closed'}${isTargetColumnOpen ? '' : ' target-column-closed'}`} aria-label="Commands and chat">
        <div className="unified-command-columns">
            <LegacyCommandOutputs {...{hasCapturedDetails, capture, closeDetails, shop, practice}}/>
            {isCommandColumnOpen && <section className="unified-command-column" aria-label="Command panel">
                {!game.viewport.isMobile && <DrawerResizeHandle handleType="left" widthVar="--command-actions-size" label="Resize Commands panel width" minWidthPx={180} maxWidth={40} />}
                <header className="command-guide-panel-heading-cell command-guide-commands-heading">
                    <span>Commands</span>
                    <button
                        type="button" className={`command-guide-help-toggle command-guide-chat-toggle${isChatCommandsOpen ? ' is-active' : ''}`} aria-label={isChatCommandsOpen ? "Close chat commands" : "Show chat commands"} aria-expanded={isChatCommandsOpen} title={isChatCommandsOpen ? "Show the current target's commands" : "Show communication channel commands"}
                        onClick={() => {
                            setChatCommandsOpen(open => !open);
                            communication.setHistoryPanelOpen(false);
                        }}
                    >
                        <MessageCircle size={14} />
                        <span>Chat</span>
                    </button>
                    <button
                        type="button" className={`command-guide-help-toggle${isHelpMode ? ' is-active' : ''}`} aria-label={isHelpMode ? "Exit command help mode" : "Help on command"} title={isHelpMode ? "Click a command to view help, or click again to cancel" : "View help for a command"}
                        onClick={toggleHelpMode}
                    >
                        <HelpCircle size={14} />
                        <span>Help</span>
                    </button>
                    <button type="button" className="command-guide-traits" aria-label="Edit traits" title="Edit command traits" onClick={openTraitSettings}>
                        <Tag size={14} />
                        <span>Traits</span>
                    </button>
                    <button type="button" className="command-guide-close" aria-label="Close Commands panel" title="Close Commands panel" onClick={closeCommandColumn}><X size={16} /></button>
                </header>
                <CommandPanelViews communication={communication}>
                <div className={`terminal-inline-popover unified-command-actions${isHelpMode ? ' is-help-mode' : ''}`} aria-label={`Commands for ${isChatCommandsOpen ? 'Chat' : currentLabel}`}>
                    <div className="command-guide-context-heading" title={isChatCommandsOpen ? 'Chat' : currentLabel} style={{ color: currentLabelColor }}>{isChatCommandsOpen ? 'Chat' : currentLabel}</div>
                    {isHelpMode && (
                        <CommandHelpBanner
                            onExecuteHelp={executeHelp}
                            onCancel={toggleHelpMode}
                        />
                    )}
                    {targetSelection.selection && !isChatCommandsOpen ? <GearSelectionActions key={targetSelection.selection.scopeKey}
                        className="command-panel-selection-actions" selection={targetSelection.selection}
                        containers={targetSelection.containers} recipients={targetSelection.recipients}
                        onRun={(action, destination) => {
                            if (isHelpMode) {
                                executeHelp(action);
                                return;
                            }
                            targetSelection.runAction(action, destination);
                        }} onClear={targetSelection.clear} showCommandSyntax /> : <>
                    {!isChatCommandsOpen && <SkillsSyncPrompt hideWhenReady />}
                    {!isChatCommandsOpen && <CommandShopActions shop={shop} isHelpMode={isHelpMode} onRequestHelp={executeHelp} />}
                    {!isChatCommandsOpen && <CommandPracticeActions practice={practice} isHelpMode={isHelpMode} onRequestHelp={executeHelp} />}
                    {(isChatCommandsOpen || (!shop.selectedStock && !practice.isAbilitySelected)) && <InlineActionDeck
                        key={isChatCommandsOpen ? 'chat-commands' : `${activeScope}:${activeState.entityId || ''}:${targetContext || ''}`}
                        groups={visibleActionGroups}
                        targetContext={targetContext}
                        requestInspection={kind => { dismissOutputs(); if (isHelpMode) { executeHelp(kind); } else { setInspecting(kind); } }}
                        renderButton={button => {
                            const stateButton = isBerserkConfirmationPending && button.id === 'command-state-mood-berserk'
                                ? { ...button, label: 'Confirm Berserk' }
                                : button;
                            const action = <PopoverActionButton key={button.id} button={stateButton} favorites={game.favorites} toggleFavorite={toggleFavorite}
                                onRequestShop={shop.handleButton} onRequestPractice={practice.handleButton} onRequestCommunication={isChatCommandsOpen ? communication.handleChatCommand : communication.handleCommand} popoverState={activeState} setPopoverState={setActivePopoverState} setButtons={game.btn.setButtons}
                                onRequestSelfState={handleSelfStateButton}
                                handleButtonClick={game.handleButtonClick} executeCommand={game.executeCommand} addMessage={game.addMessage}
                                handleTabClick={drawer => ui.handleTabClick(drawer)} setGearTab={ui.setGearTab} selectedObjectIds={game.selectedObjectIds}
                                clearObjectSelection={game.clearObjectSelection} entities={game.entities} keywordOverrides={game.keywordOverrides}
                                direction={activeState.direction}
                                onRequestWhois={() => { dismissOutputs(); if (isHelpMode) { executeHelp('whois'); } else { requestWhois(); } }}
                                onRequestRoomReport={activeScope === 'room' ? kind => { dismissOutputs(); if (isHelpMode) { executeHelp(kind); } else { requestRoomReport(kind); } } : undefined}
                                onRequestWeatherReport={kind => { dismissOutputs(); if (isHelpMode) { executeHelp(`weather ${kind}`); } else { requestWeatherReport(kind); } }}
                                onRequestPersonalReport={activeScope === 'self' ? kind => { dismissOutputs(); if (isHelpMode) { executeHelp(kind); } else { requestPersonalReport(kind); } } : undefined}
                                onRequestExamine={command => { dismissOutputs(); if (isHelpMode) { executeHelp('examine'); } else { requestExamine(command); } }}
                                onRequestLook={activeScope === 'room' ? () => { dismissOutputs(); if (isHelpMode) { executeHelp('look'); } else { setInspecting('look'); } } : undefined}
                                isHelpMode={isHelpMode} onRequestHelp={executeHelp} compact terminal glowDelay="0s" />;
                            return button.setId === 'trait-communication'
                                ? <CommandCommunicationInlineComposer key={button.id} command={button.command} communication={communication}>{action}</CommandCommunicationInlineComposer>
                                : action;
                        }}
                        />}
                    </>}
                </div>
                </CommandPanelViews>
            </section>}
            {isTargetColumnOpen && <nav className="unified-command-column unified-command-scopes" aria-label="Command target">
                {!game.viewport.isMobile && <DrawerResizeHandle handleType="left" widthVar="--command-targets-size" label="Resize Target panel width" minWidthPx={180} maxWidth={35} />}
                <header className="command-guide-panel-heading-cell">
                    <span>Target</span>
                    <button type="button" className="command-guide-close" aria-label="Close Target panel" title="Close Target panel" onClick={closeTargetColumn}><X size={16} /></button>
                </header>
                <CommandActionTargetPicker
                    shop={shop} practice={practice}
                    entries={entries}
                    selection={targetSelection}
                    groupMembers={vitals.groupMembers || []}
                    contexts={[{ id: 'room', label: roomLabel }, { id: 'self', label: 'Self' }]}
                    characterName={game.characterName || undefined}
                    currentEntityId={currentEntityId || undefined}
                    currentCategory={activeState.category}
                    currentContext={activeState.context}
                    currentKeyword={activeState.keyword}
                    currentDisplayName={activeState.displayName}
                    inCombat={game.inCombat}
                    opponentId={vitals.opponentId}
                    opponentName={vitals.opponentName}
                    includeGroupMembers={communication.pendingRecipientCommand === 'tell'}
                    isRecipientTargeting={Boolean(communication.pendingRecipientCommand)}
                    onPreviewTarget={previewEntity}
                    onPreviewContext={previewTargetContext}
                    onSelectContext={context => { setCommandColumnOpen(true); selectContext(context); }}
                    onSelect={entry => {
                        setCommandColumnOpen(true);
                        if (communication.pendingRecipientCommand) {
                            if (communication.selectPendingRecipient(entry.context)) selectEntity(entry);
                            return;
                        }
                        if (!shop.tryCompare(entry)) selectEntity(entry);
                    }}
                />
            </nav>}
        </div>
    </aside>;
};
