/**
 * @file useVitalsScoreSnapshot.ts
 * @description Requests and retains the latest explicit score response for the vitals display.
 */

// --- Logic Section ---
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawerLine, ExecuteCommand, VitalsScoreSnapshot } from '../types';
import { getActiveVitals } from '../stores/useActiveGameState';

const SCORE_RESPONSE_TIMEOUT_MS = 15_000;

const readVitalsSnapshot = (): VitalsScoreSnapshot => {
    const vitals = getActiveVitals();
    return {
        hp: vitals.hp,
        maxHp: vitals.maxHp,
        mana: vitals.mana,
        maxMana: vitals.maxMana,
        move: vitals.move,
        maxMove: vitals.maxMove
    };
};

// --- Hook Section ---
export const useVitalsScoreSnapshot = (
    scoreLines: DrawerLine[],
    executeCommand: ExecuteCommand,
    scopeKey: string
): { snapshot: VitalsScoreSnapshot | null; isRequesting: boolean; requestScore: () => void } => {
    const [snapshot, setSnapshot] = useState<VitalsScoreSnapshot | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const requestPendingRef = useRef(false);
    const previousScoreLinesRef = useRef(scoreLines);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (previousScoreLinesRef.current === scoreLines) return;
        previousScoreLinesRef.current = scoreLines;
        if (!scoreLines.length) return;
        if (requestPendingRef.current) {
            requestPendingRef.current = false;
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setSnapshot(readVitalsSnapshot());
        setIsRequesting(false);
    }, [scoreLines]);

    useEffect(() => {
        requestPendingRef.current = false;
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setSnapshot(null);
        setIsRequesting(false);
    }, [scopeKey]);

    useEffect(() => () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    }, []);

    const requestScore = useCallback(() => {
        if (requestPendingRef.current) return;
        requestPendingRef.current = true;
        setIsRequesting(true);
        timeoutRef.current = setTimeout(() => {
            requestPendingRef.current = false;
            timeoutRef.current = null;
            setIsRequesting(false);
        }, SCORE_RESPONSE_TIMEOUT_MS);
        // Keep focus on the held refresh control; the normal desktop command
        // path otherwise moves focus to the command input and ends the hold.
        executeCommand('score', false, false, false, false, { shouldFocus: false });
    }, [executeCommand]);

    return { snapshot, isRequesting, requestScore };
};
