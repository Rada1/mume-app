/**
 * @file useCharacterInfoRefresh.ts
 * @description Refreshes character details that MUME does not send in the regular vitals stream.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
    beginCharacterInfoRefresh,
    subscribeToCharacterInfoRefresh,
    type CharacterInfoRefreshField
} from '../utils/characterInfoRefreshTracker';

// --- Logic Section ---
type CharacterInfoQuery = { field?: CharacterInfoRefreshField; command: string };

const PROFILE_QUERIES: CharacterInfoQuery[] = [
    { field: 'age', command: 'info %a' },
    { field: 'height', command: 'info %h' },
    { field: 'warFame', command: 'info %K' },
    { field: 'gold', command: 'info %g' },
    { command: 'practice' }
];

const QUERIES: CharacterInfoQuery[] = [
    { field: 'age', command: 'info %a' },
    { field: 'height', command: 'info %h' },
    { field: 'warFame', command: 'info %K' },
    { field: 'gold', command: 'info %g' },
    { field: 'wimpy', command: 'info %y' }
];

export const useCharacterInfoRefresh = (
    characterName: string,
    isPlaying: boolean,
    executeCommand: (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void,
    autoStartProfileRefresh = true
): (() => void) => {
    const requestRefreshRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!isPlaying || !characterName) {
            requestRefreshRef.current = null;
            return;
        }

        let active = true;
        let isRunning = false;
        let index = 0;
        let timeout: number | undefined;
        let autoStartTimeout: number | undefined;
        let activeQueries = QUERIES;
        const requestNext = () => {
            if (!active || !isRunning) return;
            window.clearTimeout(timeout);
            const query = activeQueries[index++];
            if (!query) {
                isRunning = false;
                beginCharacterInfoRefresh([]);
                return;
            }
            if (query.field) {
                beginCharacterInfoRefresh([query.field], { notifyOnConsume: true });
                executeCommand(query.command, true, true, true, true);
            } else {
                // Let the final compact-info prompt clear before opening the
                // practice capture, then keep the full skill listing silent.
                beginCharacterInfoRefresh([]);
                timeout = window.setTimeout(() => {
                    if (!active || !isRunning) return;
                    executeCommand(query.command, true, true, true, true);
                    isRunning = false;
                }, 500);
                return;
            }
            timeout = window.setTimeout(() => {
                beginCharacterInfoRefresh([]);
                requestNext();
            }, 3000);
        };
        const startRefresh = (queries: CharacterInfoQuery[] = QUERIES) => {
            if (!active) return;
            window.clearTimeout(autoStartTimeout);
            autoStartTimeout = undefined;
            window.clearTimeout(timeout);
            index = 0;
            activeQueries = queries;
            isRunning = true;
            requestNext();
        };
        const unsubscribe = subscribeToCharacterInfoRefresh(requestNext);
        requestRefreshRef.current = startRefresh;
        // These profile values are shown in the character bar but are not part of
        // the regular vitals stream. Fetch them quietly once after login.
        if (autoStartProfileRefresh) {
            autoStartTimeout = window.setTimeout(() => startRefresh(PROFILE_QUERIES), 1500);
        }
        return () => {
            active = false;
            window.clearTimeout(autoStartTimeout);
            window.clearTimeout(timeout);
            unsubscribe();
            requestRefreshRef.current = null;
            beginCharacterInfoRefresh([]);
        };
    }, [autoStartProfileRefresh, characterName, isPlaying, executeCommand]);

    return useCallback(() => requestRefreshRef.current?.(), []);
};
