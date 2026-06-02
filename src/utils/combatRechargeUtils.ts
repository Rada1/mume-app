/**
 * @file combatRechargeUtils.ts
 * @description Normalizes combat commands and observed combat verbs for recharge tracking.
 */

export type CombatRechargeAction = 'shoot' | 'hit' | 'bash' | 'kick' | 'backstab' | 'charge' | 'throw';
export type CombatRechargeConfidence = 'unknown' | 'estimated' | 'learned';

const COMMAND_ACTIONS: Record<string, CombatRechargeAction> = {
    shoot: 'shoot',
    fire: 'shoot',
    hit: 'hit',
    kill: 'hit',
    k: 'hit',
    slash: 'hit',
    pierce: 'hit',
    stab: 'hit',
    strike: 'hit',
    bash: 'bash',
    kick: 'kick',
    bs: 'backstab',
    backstab: 'backstab',
    charge: 'charge',
    throw: 'throw'
};

const VERB_ACTIONS: Record<string, CombatRechargeAction> = {
    miss: 'hit',
    shoot: 'shoot',
    hit: 'hit',
    smite: 'hit',
    strike: 'hit',
    slash: 'hit',
    pierce: 'hit',
    crush: 'hit',
    pound: 'hit',
    stab: 'hit',
    cleave: 'hit',
    maul: 'hit',
    bash: 'bash',
    kick: 'kick',
    backstab: 'backstab',
    charge: 'charge',
    throw: 'throw'
};

const DEFAULT_DURATIONS: Record<CombatRechargeAction, number> = {
    shoot: 4500,
    hit: 3000,
    bash: 6000,
    kick: 5000,
    backstab: 8000,
    charge: 8000,
    throw: 4500
};

// --- Logic Section ---

export const getCombatRechargeActionFromCommand = (command: string): CombatRechargeAction | null => {
    const firstWord = command.trim().toLowerCase().match(/^[a-z]+/)?.[0];
    if (!firstWord) return null;
    return COMMAND_ACTIONS[firstWord] || null;
};

export const getCombatRechargeActionFromVerb = (verb?: string): CombatRechargeAction | null => {
    if (!verb) return null;
    return VERB_ACTIONS[verb.toLowerCase()] || null;
};

export const isPlayerAttemptAvoidedLine = (line: string): boolean =>
    /\b(?:your|you(?:rself)?) attempt to\b/i.test(line);

export const isPlayerFailedAttackLine = (line: string): boolean =>
    /^you try to (?:hit|slash|stab|pierce|pound|crush|smite|strike|cleave|maul|kick|bash|bite|sting|shoot)\b.+\b(?:parries|dodges|evades|avoids|blocks?)\b/i.test(line);

export const isOpponentFailedAttackLine = (line: string): boolean =>
    /\bfails? to (?:hit|slash|stab|pierce|pound|crush|smite|strike|cleave|maul|kick|bash|bite|sting|shoot) you\b/i.test(line);

export const getDefaultRechargeDuration = (action: CombatRechargeAction): number => DEFAULT_DURATIONS[action];

export const getMedianDuration = (samples: number[]): number | null => {
    if (!samples.length) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
        : sorted[middle];
};
