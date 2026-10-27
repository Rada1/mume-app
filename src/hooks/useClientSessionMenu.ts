/** @file useClientSessionMenu.ts — Session actions shared by the compact client menu. */
import { useGame, useUI } from '../context/GameContext';
import { useMapper } from '../context/MapperContext';
import { useSessionStore } from '../stores/useSessionStore';
import { canAccessShaper } from '../shaper/access/shaperAccess';

// --- Session action logic ---
export const useClientSessionMenu = (close: () => void) => {
    const { gameState, sessionMode, roomNpcs, executeCommand, addMessage } = useGame();
    const { setUI, replayer } = useUI();
    const { setActiveMapFilter } = useMapper();
    const minimized = useSessionStore(state => state.isReplayHUDMinimized);
    const setMinimized = useSessionStore(state => state.setIsReplayHUDMinimized);
    const canOpenShaper = canAccessShaper();
    const openShaper = () => {
        setUI(previous => ({ ...previous, isShaperOpen: canOpenShaper, isShaperAccessOpen: !canOpenShaper }));
        close();
    };
    const toggleReplay = () => {
        replayer.setIsVisible(true);
        setMinimized(replayer.state.isVisible ? !minimized : false);
        close();
    };
    const exitReplay = () => { replayer.clearLog(); close(); };
    const exitGame = () => {
        close();
        const hasInnkeeper = roomNpcs?.some(npc => /innkeeper|barman|tender|lodging|receptionist|tavern keeper|barliman|steward|vit|vubur/i.test(npc.name ?? ''));
        if (hasInnkeeper) executeCommand('rent');
        else {
            setActiveMapFilter('RENT');
            setUI(previous => ({ ...previous, mapExpanded: true, drawer: 'none' }));
            addMessage('system', 'You must rent a room at an Inn to keep your equipment safe while you rest. The map is now showing the path to the nearest Inn.');
        }
    };
    return { canOpenShaper, openShaper, toggleReplay, exitReplay, exitGame,
        hasReplay: Boolean(replayer.log), playing: gameState !== 'account' || sessionMode === 'replay' };
};
