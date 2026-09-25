/**
 * @file useCharacterConditions.ts
 * @description Combines reported self affects, active timers, and condition flags.
 */

import { useMemo } from 'react';
import type { EffectTimer } from '../types';
import { capitalizeWords, normalizeAffectName } from '../utils/affectUtils';

// --- Logic Section ---
export const useCharacterConditions = (
    affectedBy: string[] | undefined,
    conditions: Record<string, boolean> | undefined,
    timers: EffectTimer[],
    position: string | undefined,
    isSpectateMode: boolean
): string[] => useMemo(() => {
    const names = [
        ...(affectedBy || []),
        ...Object.entries(conditions || {})
            .filter(([name, active]) => active && name !== 'waiting')
            .map(([name]) => name),
        ...(position === 'riding' ? ['riding'] : []),
        ...(isSpectateMode ? [] : timers
            .filter(timer => !timer.target && (!timer.expiresAt || timer.expiresAt > Date.now()))
            .map(timer => timer.name))
    ];
    const seen = new Set<string>();
    return names.flatMap(name => {
        const key = normalizeAffectName(name);
        if (!key || seen.has(key)) return [];
        seen.add(key);
        return [capitalizeWords(name.trim().replace(/[-_]+/g, ' '))];
    });
}, [affectedBy, conditions, timers, position, isSpectateMode]);
