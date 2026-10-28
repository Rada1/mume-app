/** @file executeCommandPanelInput.ts — Play input feedback for panel actions that bypass button execution. */
import type { GameContextType } from '../context/GameContext/types';
import type { ExecuteCommand } from '../types';
import { applyTacticalCommandPrefix } from '../stores/useTacticalCommandPrefixStore';

// --- Direct Panel Execution Section ---
export const executeCommandPanelInput = (
    game: Pick<GameContextType, 'initAudio' | 'isSoundEnabled' | 'playClickSound' | 'executeCommand'>,
    ...args: Parameters<ExecuteCommand>
) => {
    game.initAudio();
    if (game.isSoundEnabled) game.playClickSound();
    const [command, silent, isSystem, isHistorical, fromDrawer, options] = args;
    game.executeCommand(silent || isSystem ? command : applyTacticalCommandPrefix(command), silent, isSystem, isHistorical, fromDrawer, {...options, fromUi: true});
};
