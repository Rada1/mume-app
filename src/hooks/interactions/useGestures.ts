import { InteractionDeps } from '../useInteractionHandlers';

export const useGestures = (deps: InteractionDeps) => {
    const {
        executeCommand, triggerHaptic, ui,
        setIsMapExpanded, setIsCharacterOpen, setIsStatsOpen, setIsEquipmentOpen, setIsInventoryOpen, setIsPlayersOpen
    } = deps;

    const handleInputSwipe = (dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'se') {
            executeCommand('who', true, true, true, true);
            setTimeout(() => executeCommand('where', true, true, true, true), 150);
            setIsPlayersOpen(true);
        } else if (dir === 'ne') {
            setIsStatsOpen(true);
        } else if (dir === 'nw') {
            setIsEquipmentOpen(true);
        } else if (dir === 'down') {
            if (ui.mapExpanded) {
                setIsMapExpanded(false);
            } else {
                console.log('[Gestures] Triggering CHARACTER sequence (stat, score, info %m, quest, practice)');
                executeCommand('stat', true, true, true, true);
                setTimeout(() => executeCommand('score', true, true, true, true), 100);
                setTimeout(() => executeCommand('info %m', true, true, true, true), 200);
                setTimeout(() => executeCommand('quest', true, true, true, true), 300);
                setTimeout(() => executeCommand('practice', true, true, true, true), 400);
                setIsCharacterOpen(true);
            }
        } else if (dir === 'sw') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            setIsInventoryOpen(true);
        } else if (dir === 'right') {
            console.log('[Gestures] Triggering STAT sequence (stat, score, info %m)');
            executeCommand('stat', true, true, true, true);
            setTimeout(() => executeCommand('score', true, true, true, true), 100);
            setTimeout(() => executeCommand('info %m', true, true, true, true), 200);
            setIsStatsOpen(true);
        } else if (dir === 'left') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            setIsEquipmentOpen(true);
        }
    };

    return { handleInputSwipe };
};
