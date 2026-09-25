/**
 * @file thisIsYouHelpers.ts
 * @description Helper functions and state options for the 'This is You' console.
 */

import { StateOption } from './ThisIsYouStatePill';

const HEIGHT_WORDS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
};
export const parseHeightPart = (value: string): number | undefined => {
    const normalized = value.trim().toLowerCase();
    if (/^\d+$/.test(normalized)) return Number(normalized);
    return HEIGHT_WORDS[normalized];
};

export const formatHeight = (height: string | undefined): string => {
    if (!height) return '—';
    const match = height.match(/^(\w+)\s+(?:feet|foot)\s+(\w+)(?:\s+inches?)?$/i);
    if (!match) return height;
    const feet = parseHeightPart(match[1]);
    const inches = parseHeightPart(match[2]);
    return Number.isFinite(feet) && Number.isFinite(inches) ? `${feet}' ${inches}"` : height;
};

export const formatNumber = (value: number | null | undefined): string =>
    typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';

export const POSITION_OPTIONS: StateOption[] = [
    { label: 'Standing', value: 'standing', command: 'stand' },
    { label: 'Sitting', value: 'sitting', command: 'sit' },
    { label: 'Resting', value: 'resting', command: 'rest' },
    { label: 'Sleeping', value: 'sleeping', command: 'sleep' }
];

export const ALERTNESS_OPTIONS: StateOption[] = [
    { label: 'Normal', value: 'normal', command: 'cha alert normal' },
    { label: 'Careful', value: 'careful', command: 'cha alert careful' },
    { label: 'Attentive', value: 'attentive', command: 'cha alert attentive' },
    { label: 'Vigilant', value: 'vigilant', command: 'cha alert vigilant' },
    { label: 'Paranoid', value: 'paranoid', command: 'cha alert paranoid' }
];

export const MOOD_OPTIONS: StateOption[] = [
    { label: 'Wimpy', value: 'wimpy', command: 'cha mood wimpy' },
    { label: 'Prudent', value: 'prudent', command: 'cha mood prudent' },
    { label: 'Normal', value: 'normal', command: 'cha mood normal' },
    { label: 'Brave', value: 'brave', command: 'cha mood brave' },
    { label: 'Aggressive', value: 'aggressive', command: 'cha mood aggressive' },
    { label: 'Berserk', value: 'berserk', command: 'cha mood berserk' }
];

export const SPELL_SPEED_OPTIONS: StateOption[] = [
    { label: 'Normal', value: 'normal', command: 'change spell normal' },
    { label: 'Fast', value: 'fast', command: 'change spell fast' },
    { label: 'Quick', value: 'quick', command: 'change spell quick' }
];

export interface SelfDescribingBuff {
    id: string;
    label: string;
    benefit: string;
    tone: 'good' | 'warn' | 'neutral';
}

export const hasCondition = (conditions: unknown, key: string): boolean => {
    if (!conditions) return false;
    const lowerKey = key.toLowerCase();
    if (Array.isArray(conditions)) {
        return conditions.some(c => typeof c === 'string' && c.toLowerCase() === lowerKey);
    }
    if (typeof conditions === 'object') {
        const record = conditions as Record<string, unknown>;
        return Boolean(record[key] ?? record[lowerKey]);
    }
    if (typeof conditions === 'string') {
        return conditions.toLowerCase().includes(lowerKey);
    }
    return false;
};
