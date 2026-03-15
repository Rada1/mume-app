import { InteractionDeps } from '../useInteractionHandlers';

export const useGestures = (deps: InteractionDeps) => {
    const {
        executeCommand, triggerHaptic, ui,
        setIsMapExpanded, setIsCharacterOpen, setIsStatsOpen, setIsItemsDrawerOpen
    } = deps;

    const handleInputSwipe = (dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'down') {
            if (ui.mapExpanded) {
                setIsMapExpanded(false);
            } else {
                setIsCharacterOpen(true);
            }
        } else if (dir === 'right') {
            executeCommand('stats', true, true, true, true);
            setIsStatsOpen(true);
        } else if (dir === 'left') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            setIsItemsDrawerOpen(true);
        }
    };

    return { handleInputSwipe };
};
