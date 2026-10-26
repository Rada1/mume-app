/** @file commandDefaultTarget.ts — Execute a command against its valid current target. */
import type { MouseEvent } from 'react';
import type { CustomButton } from '../types';
import type { useCommandTreeController } from './useCommandTreeController';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { isCurrentCommandTarget } from '../utils/currentCommandTarget';
import { isCommandTreeObservation } from '../utils/commandTreeObservation';
import { executeCommandTreeObservation } from './useCommandTreeObservation';
import { isFriendlyTargetCommand } from '../utils/friendlyTargetCommand';
import { isCommandTreeOffensiveTargetAction } from '../utils/commandTreeCurrentTarget';
import { useAutomaticTargetStore } from '../stores/useAutomaticTargetStore';
// --- Default Execution Section ---
export function executeUntargetedTransferCommand(controller: ReturnType<typeof useCommandTreeController>, button: CustomButton, event: MouseEvent) {
    // A short tap sends the verb; object/recipient selection belongs to the held cascade.
    controller.game.handleButtonClick({...button, command: button.command.trim().split(/\s+/)[0], actionType: 'command'}, event);
}

export function getDefaultCommandTarget(controller: ReturnType<typeof useCommandTreeController>, targets: CommandActionTargetEntry[], button: CustomButton) {
    if (isFriendlyTargetCommand(button) || /^(?:assist|ass)(?:\s|$)/i.test(button.command.trim())) return null;
    if (controller.isHelpMode || controller.game?.gameState !== 'playing' || controller.game?.isSpectateMode) return null;
    const currentTarget = targets.find(candidate => isCurrentCommandTarget(candidate, controller.vitals?.target));
    if (currentTarget) return currentTarget;
    if (useAutomaticTargetStore.getState().enabled && isCommandTreeOffensiveTargetAction(button)) {
        return targets.find(candidate => candidate.scope === 'global') || null;
    }
    return null;
}
export function executeDefaultCommandTarget(controller: ReturnType<typeof useCommandTreeController>, button: CustomButton,
    targets: CommandActionTargetEntry[], event: MouseEvent) {
    const entry = getDefaultCommandTarget(controller, targets, button);
    if (!entry) return false;
    if (isCommandTreeObservation(button)) {
        executeCommandTreeObservation(controller, entry, button.command.split(' ')[0]);
    } else if (button.setId === 'trait-communication') {
        controller.communication.handleCommand(button.command.replace(/%n/g, entry.context));
    } else {
        const isBashExit = entry.category === 'cat-exit' && /^bash\s+%n(?:\|exit)?$/i.test(button.command.trim());
        const commandButton = isBashExit
            ? {...button, command:button.command.replace(/%n(?:\|exit)?/i, 'exit %n')}
            : button;
        const context = isBashExit ? entry.context.replace(/^exit\s+/i, '').trim() || entry.keyword : entry.context;
        controller.game.handleButtonClick(commandButton, event, context, undefined, entry.parentNoun);
    }
    return true;
}
