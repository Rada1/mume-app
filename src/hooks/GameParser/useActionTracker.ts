/**
 * @file useActionTracker.ts
 * @description Routes confirmed object changes and currency messages to session state.
 */

import { useCallback } from 'react';
import type { CharacterInfo } from '../../types';
import { useObjectActionTracker, type ObjectActionTrackerDeps } from './useObjectActionTracker';

export interface ActionTrackerDeps extends ObjectActionTrackerDeps {
    setCharacterInfo: (value: CharacterInfo | ((previous: CharacterInfo) => CharacterInfo)) => void;
}

export const useActionTracker = (deps: ActionTrackerDeps) => {
    const objectActions = useObjectActionTracker(deps);

    const trackAction = useCallback((cleanLine: string, textOnly: string, lower: string) => {
        if (objectActions.trackAction(cleanLine, textOnly)) return;
        if (deps.capture.hasSession()) return;

        if (lower.includes('gold coins') || lower.includes('lauren') || lower.includes('celeb') || lower.includes('busc')) {
            const moneyMatch = textOnly.match(/(\d+)\s*(gold coins|silver coins|copper coins|lauren|celeb|busc)/i);
            if (!moneyMatch) return;
            const amount = Number.parseInt(moneyMatch[1], 10) || 0;
            if (lower.includes('get') || lower.includes('take') || lower.includes('gives you')) {
                deps.setCharacterInfo(previous => ({ ...previous, gold: (previous.gold || 0) + amount }));
            } else if (lower.includes('drop') || lower.includes('give') || lower.includes('junk')) {
                deps.setCharacterInfo(previous => ({ ...previous, gold: Math.max(0, (previous.gold || 0) - amount) }));
            }
        }
    }, [deps.capture, deps.setCharacterInfo, objectActions.trackAction]);

    return { trackAction };
};
