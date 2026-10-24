/** @file useCommandTreeMovement.ts — Movement execution and help within the command tree. */
import type { useCommandTreeController } from './useCommandTreeController';
// --- Movement Execution Section ---
export const useCommandTreeMovement = (controller: ReturnType<typeof useCommandTreeController>) => ({
    disabled: controller.game.gameState !== 'playing' || controller.game.isSpectateMode,
    move: (command: string) => {
        if (controller.isHelpMode) { controller.executeHelp(command); return; }
        if (controller.game.gameState !== 'playing' || controller.game.isSpectateMode) return;
        controller.game.executeCommand(command);
        controller.game.setCommandPreview?.(null);
    }
});
