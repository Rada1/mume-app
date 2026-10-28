/** @file useDesktopMapMovement.ts — Desktop map movement and command-bar previews. */
import type { MouseEvent } from 'react';
import { useGame, useVitals } from '../context/GameContext';
import { applyTacticalCommandPrefix } from '../stores/useTacticalCommandPrefixStore';
import { COMMAND_TREE_FOLLOW_BUTTON } from '../utils/commandTreeMovement';

// --- Desktop map control behavior ---
export const useDesktopMapMovement = () => {
    const game = useGame();
    const {target} = useVitals();
    const visible = game.gameState === 'playing' && !game.viewport.isMobile && !game.isSpectateMode;
    const move = (command: string) => {
        if (!visible) return;
        game.executeCommand(applyTacticalCommandPrefix(command), false, false, false, false, {fromUi: true, shouldFocus: false});
        game.setCommandPreview?.(null);
    };
    const follow = (event: MouseEvent<HTMLButtonElement>) => {
        if (!visible || !target) return;
        game.handleButtonClick(COMMAND_TREE_FOLLOW_BUTTON, event, target);
        game.setCommandPreview?.(null);
    };
    return {visible, move, follow, preview: (command: string | null) => game.setCommandPreview?.(command)};
};
