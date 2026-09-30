/**
 * @file useSleepHints.ts
 * @description Sends a periodic MUME hint command while the character sleeps.
 */

import { useEffect, useRef } from 'react';

const HINT_INTERVAL_MS = 15_000;

interface SleepHintDeps {
    playerPosition: string;
    connected: boolean;
    inCombat: boolean;
    isSpectating: boolean;
    executeCommand: (command: string, silent?: boolean, isSystem?: boolean) => void;
}

export const useSleepHints = ({
    playerPosition,
    connected,
    inCombat,
    isSpectating,
    executeCommand
}: SleepHintDeps) => {
    const executeCommandRef = useRef(executeCommand);
    executeCommandRef.current = executeCommand;

    useEffect(() => {
        if (playerPosition.toLowerCase() !== 'sleeping' || !connected || inCombat || isSpectating) return;

        const timer = window.setInterval(() => {
            executeCommandRef.current('hint', false, true);
        }, HINT_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [playerPosition, connected, inCombat, isSpectating]);
};
