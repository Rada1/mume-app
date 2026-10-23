/**
 * @file useWimpyThresholdControl.ts
 * @description Cycles the player's automatic flee HP threshold.
 */

// --- Logic Section ---
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useActiveVitals } from '../stores/useActiveGameState';
import { getNextWimpyPreset } from '../components/HUD/thisIsYouHelpers';

// --- Hook Section ---
export const useWimpyThresholdControl = (): {
    value: number | null;
    canChange: boolean;
    changeThreshold: () => void;
} => {
    const { executeCommand, triggerHaptic, isSpectateMode } = useGame();
    const vitals = useActiveVitals();
    const [displayValue, setDisplayValue] = useState<number | null>(vitals.wimpy ?? null);

    useEffect(() => {
        setDisplayValue(vitals.wimpy ?? null);
    }, [vitals.wimpy]);

    const canChange = !isSpectateMode && (vitals.maxHp ?? 0) > 0;
    const changeThreshold = useCallback(() => {
        if (!canChange) return;
        const nextPreset = getNextWimpyPreset(displayValue ?? 0, vitals.maxHp ?? 0);
        if (!nextPreset) return;
        setDisplayValue(nextPreset.value);
        triggerHaptic(15);
        executeCommand(nextPreset.value === 0
            ? 'cha wimpy 0'
            : `change wimpy ${nextPreset.value}`);
    }, [canChange, displayValue, executeCommand, triggerHaptic, vitals.maxHp]);

    return { value: displayValue, canChange, changeThreshold };
};
