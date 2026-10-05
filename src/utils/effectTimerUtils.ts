/**
 * @file effectTimerUtils.ts
 * @description Shared classification helpers for effect timers.
 */

import type { EffectTimerKind } from '../types';

// --- Logic Section ---

export const isSpellEffectTimer = (kind: EffectTimerKind): boolean => (
    kind === 'spell' || kind === 'sanctuary' || kind === 'blind'
);
