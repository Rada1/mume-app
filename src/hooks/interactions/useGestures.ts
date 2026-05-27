import { InteractionDeps } from '../useInteractionHandlers';

export const useGestures = (deps: InteractionDeps) => {
    const {
        executeCommand, triggerHaptic, ui,
        setIsMapExpanded, handleTabClick, setGearTab, setCharTab
    } = deps;

    const handleInputSwipe = (dir: string) => {
        triggerHaptic(20);
        if (dir === 'up') setIsMapExpanded(true);
        else if (dir === 'se') {
            executeCommand('who', true, true, true, true);
            setTimeout(() => executeCommand('where', true, true, true, true), 150);
            handleTabClick('players');
        } else if (dir === 'ne') {
            // Stats is now part of character info
            handleTabClick('character');
            setCharTab('info');
        } else if (dir === 'nw') {
            handleTabClick('equipment');
            setGearTab('worn');
        } else if (dir === 'down') {
            if (ui.mapExpanded) {
                setIsMapExpanded(false);
            } else {
                console.log('[Gestures] Triggering CHARACTER sequence (info %O %D %k %A, score, info %m, info %f, quest, practice)');
                executeCommand('info %O %D %k %A', true, true, true, true);
                setTimeout(() => executeCommand('score', true, true, true, true), 100);
                setTimeout(() => executeCommand('info %m', true, true, true, true), 200);
                setTimeout(() => executeCommand('info %f', true, true, true, true), 300);
                setTimeout(() => executeCommand('quest', true, true, true, true), 400);
                setTimeout(() => executeCommand('practice', true, true, true, true), 500);
                handleTabClick('character');
            }
        } else if (dir === 'sw') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            handleTabClick('equipment');
            setGearTab('inv');
        } else if (dir === 'right') {
            console.log('[Gestures] Triggering STAT sequence (info %O %D %k %A, score, info %m, info %f)');
            executeCommand('info %O %D %k %A', true, true, true, true);
            setTimeout(() => executeCommand('score', true, true, true, true), 100);
            setTimeout(() => executeCommand('info %m', true, true, true, true), 200);
            setTimeout(() => executeCommand('info %f', true, true, true, true), 300);
            handleTabClick('character');
            setCharTab('info');
        } else if (dir === 'left') {
            executeCommand('inv', true, true, true, true);
            setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            handleTabClick('equipment');
        }
    };

    return { handleInputSwipe };
};
