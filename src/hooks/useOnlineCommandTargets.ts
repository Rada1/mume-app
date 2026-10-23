/** @file useOnlineCommandTargets.ts — Refreshes who on expansion and projects online command targets. */
import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useWhoListRefresh } from './useWhoListRefresh';
import { getOnlineCommunicationTargets } from '../utils/commandCommunication';

// --- Logic Section ---
export const useOnlineCommandTargets = () => {
    const { whoList, whoLines = [], executeCommand } = useGame();
    const entries = useMemo(() => getOnlineCommunicationTargets(whoList), [whoList]);
    const refresh = useWhoListRefresh(whoList, executeCommand, true);
    return { entries, refresh, whoLines };
};
