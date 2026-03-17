import { InteractionDeps } from '../useInteractionHandlers';

export const useGestures = (deps: InteractionDeps) => {
    const {
        executeCommand, triggerHaptic, ui,
        setIsMapExpanded, setIsCharacterOpen, setIsStatsOpen, setIsItemsDrawerOpen, setIsPlayersOpen
    } = deps;

    const handleInputSwipe = (dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'down') {
            if (ui.mapExpanded) {
                setIsMapExpanded(false);
            } else {
                executeCommand('info', true, true, true, true);
                setTimeout(() => executeCommand('score', true, true, true, true), 100);
                setTimeout(() => executeCommand('at', true, true, true, true), 200);
                setTimeout(() => executeCommand('look self', true, true, true, true), 300);
                setTimeout(() => executeCommand('whois', true, true, true, true), 400);
                setTimeout(() => executeCommand('quest', true, true, true, true), 500);
                setTimeout(() => executeCommand('practice', true, true, true, true), 600);
                setIsCharacterOpen(true);
            }
        } else if (dir === 'right') {
            executeCommand('stat', true, true, true, true);
            setTimeout(() => executeCommand('at', true, true, true, true), 100);
            setIsStatsOpen(true);
        } else if (dir === 'left') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            setIsItemsDrawerOpen(true);
        } else if (dir === 'sw') {
            setIsPlayersOpen(true);
        }
    };

    return { handleInputSwipe };
};
