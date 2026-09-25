/**
 * @file useSpellCompletionTracker.ts
 * @description Tracks spell casting state and triggers magic completion sounds
 * when a matching spell message arrives within 5 seconds of cast initiation.
 */

import { useRef, useEffect, useCallback } from 'react';
import { matchSpellCompletion } from '../../constants/spellCompletionMessages';

// --- Types Section ---

export interface SpellCompletionTrackerDeps {
    playIncantationSound?: () => void;
    playEffect?: (name: string, options?: any) => void;
}

const CAST_WINDOW_MS = 5000;

// --- Hook Section ---

export function useSpellCompletionTracker(deps: SpellCompletionTrackerDeps) {
    const lastSpellCastTimeRef = useRef<number>(0);

    // Proactively capture command sent events
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleCommandSent = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.cmd && /^(?:cast|c|commune|pray)\b/i.test(detail.cmd.trim())) {
                lastSpellCastTimeRef.current = Date.now();
            }
        };
        window.addEventListener('mume-command-sent', handleCommandSent);
        return () => window.removeEventListener('mume-command-sent', handleCommandSent);
    }, []);

    const handleSpellLine = useCallback((textOnly: string, lower: string, isSnoop: boolean): boolean => {
        if (isSnoop) return false;

        // 1. Detect casting start
        const isCastStart = lower.includes('start to concentrate') ||
                            lower.includes('starts to concentrate') ||
                            lower.includes('begin to speak words of magic') ||
                            lower.includes('begins to speak words of magic') ||
                            lower.includes('start to pray') ||
                            lower.includes('starts to pray') ||
                            lower.includes('recall your stored spell') ||
                            lower.includes('recalls a stored spell') ||
                            lower.startsWith('[cast ') ||
                            lower.startsWith('[c ') ||
                            lower.startsWith('[commune ') ||
                            lower.startsWith('[pray ');

        if (isCastStart) {
            lastSpellCastTimeRef.current = Date.now();
            deps.playIncantationSound?.();
            return false;
        }

        // 2. Detect interrupt or failure
        const isCastInterrupted = lower.includes('lost your concentration') ||
                                  lower.includes('failed to concentrate') ||
                                  lower.includes('you cannot concentrate') ||
                                  lower.includes('spell was interrupted');

        if (isCastInterrupted) {
            lastSpellCastTimeRef.current = 0;
            return false;
        }

        // 3. Detect completion within the 5-second window
        if (lastSpellCastTimeRef.current > 0 && Date.now() - lastSpellCastTimeRef.current <= CAST_WINDOW_MS) {
            const isGenericCompletion = lower.includes('nothing seems to happen');
            const completion = isGenericCompletion || matchSpellCompletion(textOnly);
            if (completion) {
                lastSpellCastTimeRef.current = 0;
                deps.playEffect?.('magiccomplete');
                return true;
            }
        }
        return false;
    }, [deps.playIncantationSound, deps.playEffect]);

    return {
        handleSpellLine,
        lastSpellCastTimeRef,
        setLastCastTime: (time: number) => {
            lastSpellCastTimeRef.current = time;
        }
    };
}
