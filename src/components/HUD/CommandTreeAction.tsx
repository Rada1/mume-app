/** @file CommandTreeAction.tsx — Existing action execution and communication UI inside tree leaves. */

import React from 'react';
import { Crosshair } from 'lucide-react';
import { isCurrentCommandTarget } from '../../utils/currentCommandTarget';
import { isFriendlyTargetCommand } from '../../utils/friendlyTargetCommand';

import type { CustomButton, GearRow, PopoverState } from '../../types';

import { useCommandTreeController } from '../../hooks/useCommandTreeController';

import { PopoverActionButton } from '../Popovers/StandardMenu/PopoverActionButton';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';

import { CommandCommunicationInlineComposer } from './CommandCommunicationInlineComposer';
import { COMMAND_TREE_SELF_COLOR, isCommandTreeSelfTarget } from '../../utils/commandTreeTargetColor';

// --- Render Section ---

export const CommandTreeAction = ({ controller, button, targetState, targetLabel, targetGearRow, targetShowSlot = false }: {controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targetState?: PopoverState; targetLabel?: string; targetGearRow?: GearRow; targetShowSlot?: boolean}) => {

const { game, ui, vitals, entries, targetSelection, selectEntity, selectContext, activeState, activeScope, communication, shop, practice, dismissOutputs, setInspecting, requestWhois, requestRoomReport, requestWeatherReport, requestPersonalReport, requestExamine, setActivePopoverState, closeDetails, capture, hasCapturedDetails, isHelpMode, toggleHelpMode, executeHelp, handleSelfStateButton, isBerserkConfirmationPending, toggleFavorite, closePanel, menuButtons } = controller;
const targetColor = targetLabel ? isCommandTreeSelfTarget({
    id: targetState?.entityId, category: targetState?.category, label: targetLabel,
    context: targetState?.context, keyword: targetState?.keyword
}, game.characterName) ? COMMAND_TREE_SELF_COLOR
    : targetState?.category ? targetSelection.colorFor(targetState.category) : undefined : undefined;
const displayColor = targetColor || (button.inlineSubgroup === 'Position' ? '#c9c5bc' : undefined);
const displayContent = targetGearRow && targetState?.category
    ? <CommandTreeObjectTargetLabel label={targetLabel || targetGearRow.name} row={targetGearRow} category={targetState.category} showSlot={targetShowSlot} />
    : undefined;

                            const stateButton = isBerserkConfirmationPending && button.id === 'command-state-mood-berserk'

                                ? { ...button, label: 'Confirm Berserk' }

                                : button;

                            const action = <PopoverActionButton treeRow displayLabel={targetLabel} displayContent={displayContent} displayColor={displayColor} key={button.id} button={stateButton} favorites={game.favorites} toggleFavorite={toggleFavorite}

                                onRequestShop={shop.handleButton} onRequestPractice={practice.handleButton} onRequestCommunication={command => communication.handleCommand(command, false, targetState?.context)} popoverState={targetState || activeState} setPopoverState={setActivePopoverState} setButtons={game.btn.setButtons}

                                onRequestSelfState={handleSelfStateButton}

                                handleButtonClick={game.handleButtonClick} executeCommand={game.executeCommand} addMessage={game.addMessage}

                                handleTabClick={drawer => ui.handleTabClick(drawer)} setGearTab={ui.setGearTab} selectedObjectIds={game.selectedObjectIds}

                                clearObjectSelection={game.clearObjectSelection} entities={game.entities} keywordOverrides={game.keywordOverrides}

                                direction={activeState.direction}

                                onRequestWhois={() => { dismissOutputs(); if (isHelpMode) { executeHelp('whois'); } else { requestWhois(); } }}

                                onRequestRoomReport={kind => { dismissOutputs(); if (isHelpMode) { executeHelp(kind); } else { requestRoomReport(kind); } }}

                                onRequestWeatherReport={kind => { dismissOutputs(); if (isHelpMode) { executeHelp(`weather ${kind}`); } else { requestWeatherReport(kind); } }}

                                onRequestPersonalReport={kind => { dismissOutputs(); if (isHelpMode) { executeHelp(kind); } else { requestPersonalReport(kind); } }}

                                onRequestCommandReport={(command, label) => {
                                    dismissOutputs();
                                    if (command.trim().toLowerCase() === 'where' && activeScope === 'room') requestRoomReport('where');
                                    else controller.requestCommandReport(command, label);
                                    return true;
                                }}

                                onRequestExamine={command => { dismissOutputs(); if (isHelpMode) { executeHelp('examine'); } else { requestExamine(command); } }}

                                onRequestLook={() => { dismissOutputs(); if (isHelpMode) { executeHelp('look'); } else { setInspecting('look'); } }}

                                isHelpMode={isHelpMode} onRequestHelp={executeHelp} compact terminal glowDelay="0s" />;

                            const markedAction = targetLabel && !isFriendlyTargetCommand(button) && isCurrentCommandTarget(targetState || {}, controller.vitals.target)
                                ? <div className="command-tree-current-target">{action}<Crosshair size={14} className="command-tree-target-crosshair" aria-label="Current target"/></div> : action;
                            return button.setId === 'trait-communication'

                                ? <CommandCommunicationInlineComposer key={button.id} command={button.command} communication={communication}>{markedAction}</CommandCommunicationInlineComposer>

                                : markedAction;

};

