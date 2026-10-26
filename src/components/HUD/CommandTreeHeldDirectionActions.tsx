/** @file CommandTreeHeldDirectionActions.tsx — Movement, observation and door actions for a held direction. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { normalizeExitKey } from '../../utils/gmcpExitUtils';
import { isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { EXIT_BUTTONS } from '../../constants/buttons/doors';
import { COMMAND_TREE_OBSERVATION_BUTTONS } from '../../utils/commandTreeObservation';

// --- Held Direction Actions Section ---
const DIRECTION_LABELS: Record<string, string> = {n:'North', s:'South', e:'East', w:'West', u:'Up', d:'Down'};

export const CommandTreeHeldDirectionActions = ({controller, tree, direction}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
    direction: string;
}) => {
    const directionLabel = DIRECTION_LABELS[normalizeExitKey(direction)] || direction;
    const touchActivation = useSecondaryTouchActivation();
    const directionalObservationButtons = [COMMAND_TREE_OBSERVATION_BUTTONS[0], EXIT_BUTTONS[0]];
    const movementButtons = [
        ...(tree.grouped[1]?.buttons ?? []).filter(button => tree.sectionFor(button) === 'Movement'
            && !isCommandTreeMoveAction(button) && !/^flee(?:\s|$)/i.test(button.command.trim())),
        ...directionalObservationButtons
    ];
    const doorButtons = (tree.grouped[1]?.buttons ?? []).filter(button => tree.sectionFor(button) === 'Doors');
    const sections = [{label:'Movement',buttons:movementButtons},{label:'Doors',buttons:doorButtons}]
        .filter(section => section.buttons.length > 0);
    const movementDisabled = controller.game.gameState !== 'playing' || controller.game.isSpectateMode;
    const targetForDirection = (button: CustomButton): CommandActionTargetEntry | undefined =>
        (tree.targetsFor(button) ?? []).find(entry => entry.category === 'cat-exit'
            && normalizeExitKey(entry.keyword || entry.context.replace(/^exit\s+/i, '')) === normalizeExitKey(direction));
    const execute = (button: CustomButton, target: CommandActionTargetEntry | undefined, event: React.MouseEvent<HTMLButtonElement>) => {
        const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
        const normalizedDirection = normalizeExitKey(direction);
        if (verb === 'look' || verb === 'scout') {
            const command = `${verb} ${normalizedDirection}`;
            if (controller.isHelpMode) controller.executeHelp(command, button.label);
            else {
                controller.game.executeCommand(command);
                controller.game.setCommandPreview?.(null);
            }
        } else if (tree.sectionFor(button) === 'Movement') {
            if (!movementDisabled) {
                if (controller.isHelpMode) controller.executeHelp(direction);
                else {
                    controller.game.executeCommand(direction);
                    controller.game.setCommandPreview?.(null);
                }
            }
        } else if (target) {
            const command = `${button.command.trim().split(/\s+/)[0]} exit ${normalizeExitKey(direction)}`;
            if (controller.isHelpMode) controller.executeHelp(command, button.label);
            else controller.game.handleButtonClick({...button,command},event,target.context,undefined,target.parentNoun);
        }
    };

    return <section className="command-tree-branch terminal-inline-popover command-tree-main-branch command-tree-held-direction-actions"
        aria-label={`${directionLabel} actions`} {...touchActivation}>
        <CommandTreeTargetHeader title={`${directionLabel} ACTIONS`}/>
        {sections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}
            ariaLabel={`Held direction ${normalizeExitKey(direction)} ${section.label}`}>
            <div className="command-tree-section-commands" role="group" aria-label={`${section.label} for ${directionLabel}`} tabIndex={0}>
                {section.buttons.map(button => {
                    const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
                    const target = section.label === 'Doors' || verb === 'scout' ? targetForDirection(button) : undefined;
                    const disabled = section.label === 'Movement'
                        ? movementDisabled || (verb === 'scout' && !target)
                        : !target;
                    const command = verb === 'look' || verb === 'scout' ? `${verb} ${normalizeExitKey(direction)}`
                        : section.label === 'Movement' ? direction
                        : `${verb} exit ${normalizeExitKey(direction)}`;
                    return <button type="button" key={button.id} className="command-tree-row" data-menu-item="true"
                        disabled={disabled} title={disabled ? `No ${section.label === 'Doors' ? 'door action' : 'movement'} available ${directionLabel.toLowerCase()}` : command}
                        onClick={event => execute(button,target,event)}>
                        <span className="command-tree-row-label" style={{color:getCommandTextColor(button.command,button.setId)}}>{button.label.replace(/%n/g,'').trim()}</span>
                    </button>;
                })}
            </div>
        </CommandTreeCollapsibleSection>)}
    </section>;
};
