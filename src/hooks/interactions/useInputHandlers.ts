import { useCallback } from 'react';
import { InteractionDeps } from './types';

export const useInputHandlers = (deps: InteractionDeps) => {
    const {
        executeCommand, triggerHaptic, viewport, setIsMapExpanded,
        setIsCharacterOpen, setIsItemsDrawerOpen, isWaitingForStats,
        isWaitingForEq, isWaitingForInv, ui
    } = deps;

    const handleInputSwipe = useCallback((dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'down') {
            if (ui.mapExpanded) {
                setIsMapExpanded(false);
            } else if (isWaitingForStats.current || isWaitingForEq.current || isWaitingForInv.current) {
                setIsItemsDrawerOpen(false); setIsCharacterOpen(false); setIsMapExpanded(false);
            } else executeCommand('s');
        } else if (dir === 'right') {
            executeCommand('stat', true, true, true, true); setIsCharacterOpen(true);
        } else if (dir === 'left') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            setIsItemsDrawerOpen(true);
        }
    }, [viewport.isMobile, triggerHaptic, setIsMapExpanded, isWaitingForStats, isWaitingForEq, isWaitingForInv, setIsCharacterOpen, setIsItemsDrawerOpen, executeCommand, ui]);

    return { handleInputSwipe };
};
