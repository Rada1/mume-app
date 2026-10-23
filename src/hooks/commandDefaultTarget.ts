/** @file commandDefaultTarget.ts — Execute a command against its valid current target. */
import type { MouseEvent } from 'react';
import type { CustomButton } from '../types';
import type { useCommandTreeController } from './useCommandTreeController';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { isCurrentCommandTarget } from '../utils/currentCommandTarget';
import { isCommandTreeObservation } from '../utils/commandTreeObservation';
import { executeCommandTreeObservation } from './useCommandTreeObservation';
import { isFriendlyTargetCommand } from '../utils/friendlyTargetCommand';
// --- Default Execution Section ---
export function getDefaultCommandTarget(controller: ReturnType<typeof useCommandTreeController>, targets: CommandActionTargetEntry[], button: CustomButton) {
    if (isFriendlyTargetCommand(button)) return null;
    if (controller.isHelpMode || controller.game.gameState !== 'playing' || controller.game.isSpectateMode) return null;
    return targets.find(candidate => isCurrentCommandTarget(candidate, controller.vitals.target)) || null;
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
        controller.game.handleButtonClick(button, event, entry.context, undefined, entry.parentNoun);
    }
    return true;
}
