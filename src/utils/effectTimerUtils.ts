/**
 * @file effectTimerUtils.ts
 * @description Shared classification helpers for effect timers.
 */

import type { EffectTimerKind } from '../types';

// --- Logic Section ---

export const isSpellEffectTimer = (kind: EffectTimerKind): boolean => (
    kind === 'spell' || kind === 'sanctuary' || kind === 'blind'
);

export type EffectTimerTone = 'spell' | 'herblore' | 'poison';

export const getEffectTimerTone = (kind: EffectTimerKind): EffectTimerTone | null => {
    if (isSpellEffectTimer(kind)) return 'spell';
    if (kind === 'herblore' || kind === 'poison') return kind;
    return null;
};
