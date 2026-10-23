/**
 * @file thisIsYouHelpers.ts
 * @description Helper functions and state options for the 'This is You' console.
 */

export { POSITION_OPTIONS, ALERTNESS_OPTIONS, MOOD_OPTIONS, SPELL_SPEED_OPTIONS } from '../../utils/playerStateOptions';

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

export const getNextWimpyPreset = (current: number, maxHp: number): { value: number; percent: number } | null => {
    if (!Number.isFinite(maxHp) || maxHp <= 0) return null;
    const presets = [0, 25, 50, 75, 100].map(percent => ({
        percent,
        value: Math.round(maxHp * percent / 100)
    }));
    return presets.find(preset => preset.value > current) ?? presets[0];
};

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
