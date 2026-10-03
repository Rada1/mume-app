/**
 * @file characterAttributeUtils.ts
 * @description Parses core character attributes from MUME score and info text.
 */

// --- Types Section ---
export const CHARACTER_ATTRIBUTE_ORDER = ['str', 'con', 'dex', 'int', 'wis', 'wil', 'per'] as const;
export type CharacterAttributeKey = typeof CHARACTER_ATTRIBUTE_ORDER[number];

export interface CharacterAttributeScore {
    current: number;
    base?: number;
}

export type CharacterAttributeValues = Partial<Record<CharacterAttributeKey, number>>;

// --- Logic Section ---
export const parseCharacterAttributes = (lines: readonly string[]): Partial<Record<CharacterAttributeKey, CharacterAttributeScore>> => {
    const stats: Partial<Record<CharacterAttributeKey, CharacterAttributeScore>> = {};
    const pattern = /\b(Str|Int|Wis|Wisdom|Dex|Con|Wil|Will|Per)\s*[:=]\s*(\d+)(?:\s*\((\d+)\))?/gi;

    for (const line of lines) {
        for (const match of line.matchAll(pattern)) {
            const rawKey = match[1].toLowerCase();
            const key = rawKey.startsWith('wis') ? 'wis' : rawKey.startsWith('wil') ? 'wil' : rawKey as CharacterAttributeKey;
            stats[key] = {
                current: Number(match[2]),
                ...(match[3] ? { base: Number(match[3]) } : {})
            };
        }
    }

    return stats;
};

export const toCharacterAttributeValues = (
    scores: Partial<Record<CharacterAttributeKey, CharacterAttributeScore>>
): CharacterAttributeValues => {
    const values: CharacterAttributeValues = {};
    for (const key of CHARACTER_ATTRIBUTE_ORDER) {
        const score = scores[key];
        if (score) values[key] = score.current;
    }
    return values;
};

