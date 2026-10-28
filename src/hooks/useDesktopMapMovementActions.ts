/** @file useDesktopMapMovementActions.ts — Lazily mounted shared command context for desktop movement menus. */
import { useCommandTreeController } from './useCommandTreeController';
import { useCommandTree } from './useCommandTree';

// --- Shared command execution and menu dismissal ---
export const useDesktopMapMovementActions = (onExecuted: () => void) => {
    const base = useCommandTreeController('room', undefined, false, {retainPreview: true, followPanelRequests: false});
    const tree = useCommandTree(base);
    const controller = {...base, game: {...base.game,
        handleButtonClick: (...args: Parameters<typeof base.game.handleButtonClick>) => {
            base.game.handleButtonClick(...args);
            onExecuted();
        }
    }};
    return {controller, tree};
};
