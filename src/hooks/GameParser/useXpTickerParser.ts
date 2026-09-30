/**
 * @file useXpTickerParser.ts
 * @description Parses XP and TP gain messages and triggers level audio.
 */

import { useCallback } from 'react';
import { CharacterInfo } from '../../types';
import { parseResourceGainLine } from '../../utils/resourceGainUtils';

// --- Logic Section ---
export function useXpTickerParser(deps: {
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
    triggerXpTicker?: (xp?: number) => void;
    triggerTpTicker?: (tp?: number) => void;
    playLevelSound?: (options?: { pitch?: number; volume?: number }) => void;
    isSpectateMode?: boolean;
}) {
    const { setCharacterInfo, triggerXpTicker, triggerTpTicker, playLevelSound, isSpectateMode } = deps;

    return useCallback((lower: string, isSnoop: boolean = false) => {
        const resourceGain = parseResourceGainLine(lower);

        if (resourceGain?.kind === 'xp') {
            const delta = resourceGain.amount;
            if (delta > 0 && !isSnoop) {
                setCharacterInfo(prev => {
                    const nextXp = prev.xp + delta;
                    triggerXpTicker?.(nextXp);
                    return { ...prev, xp: nextXp, tnl: Math.max(0, prev.tnl - delta) };
                });
            }
            return true;
        }

        if (resourceGain?.kind === 'tp') {
            const delta = resourceGain.amount;
            if (delta > 0 && !isSnoop) {
                setCharacterInfo(prev => {
                    const nextTp = prev.tp + delta;
                    triggerTpTicker?.(nextTp);
                    return { ...prev, tp: nextTp, tpnl: Math.max(0, prev.tpnl - delta) };
                });
            }
            return true;
        }

        if (/you receive your share of experience/i.test(lower)) return true;
        if (/you gain a level!/i.test(lower)) {
            if (!isSnoop || isSpectateMode) playLevelSound?.();
            return true;
        }

        return false;
    }, [setCharacterInfo, triggerXpTicker, triggerTpTicker, playLevelSound, isSpectateMode]);
}
