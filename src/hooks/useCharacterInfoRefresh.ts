/**
 * @file useCharacterInfoRefresh.ts
 * @description Refreshes character details that MUME does not send in the regular vitals stream.
 */

import { useEffect } from 'react';
import {
    beginCharacterInfoRefresh,
    subscribeToCharacterInfoRefresh,
    type CharacterInfoRefreshField
} from '../utils/characterInfoRefreshTracker';

// --- Logic Section ---
const QUERIES: Array<{ field: CharacterInfoRefreshField; command: string }> = [
    { field: 'citizenships', command: 'info %c' },
    { field: 'age', command: 'info %a' },
    { field: 'height', command: 'info %h' },
    { field: 'warFame', command: 'info %K' },
    { field: 'gold', command: 'info %g' },
    { field: 'wimpy', command: 'info %y' }
];

export const useCharacterInfoRefresh = (
    characterName: string,
    isPlaying: boolean,
    executeCommand: (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void
): void => {
    useEffect(() => {
        if (!isPlaying || !characterName) return;

        let active = true;
        let index = 0;
        let timeout: number | undefined;
        const requestNext = () => {
            if (!active) return;
            window.clearTimeout(timeout);
            const query = QUERIES[index++];
            if (!query) return;
            beginCharacterInfoRefresh([query.field], { notifyOnConsume: true });
            executeCommand(query.command, true, true, true, false);
            timeout = window.setTimeout(() => {
                beginCharacterInfoRefresh([]);
                requestNext();
            }, 3000);
        };
        const unsubscribe = subscribeToCharacterInfoRefresh(requestNext);
        timeout = window.setTimeout(requestNext, 800);
        return () => {
            active = false;
            window.clearTimeout(timeout);
            unsubscribe();
            beginCharacterInfoRefresh([]);
        };
    }, [characterName, isPlaying, executeCommand]);
};
