/**
 * @file promptVitalText.ts
 * @description Finds status values in compact MUME prompts without matching field labels.
 */

// --- Prompt Vital Value Ranges ---

export interface PromptTextRange {
    start: number;
    end: number;
    percent?: number;
    vitalType?: 'health' | 'mana' | 'move';
}

export const PROMPT_HEALTH_STATUS_PERCENT: Record<string, number> = {
    healthy: 100, fine: 83, hurt: 66, wounded: 50,
    bad: 33, awful: 16, dying: 0, stunned: 25, none: 0
};

export const PROMPT_MANA_STATUS_PERCENT: Record<string, number> = {
    full: 100, burning: 83, hot: 66, warm: 50,
    cold: 33, icy: 16, frozen: 0
};

export const PROMPT_MOVE_STATUS_PERCENT: Record<string, number> = {
    unwearied: 100, steadfast: 85, rested: 71, tired: 57,
    slow: 42, weak: 28, fainting: 14, exhausted: 0
};

const VITAL_FIELD_PATTERN = /\b(HP|MA|MV|SP|Mana|Move|Health|Hit(?:points?)?|Position|Pos|Alert(?:ness)?|Mood|Speed|Condition)\s*:\s*([A-Za-z\u00C0-\u00FF][\w\u00C0-\u00FF'-]*)/gi;

const getVitalType = (field: string): PromptTextRange['vitalType'] => {
    const normalizedField = field.toLowerCase();
    if (/^(?:hp|health|hit|hitpoint|hitpoints)$/.test(normalizedField)) return 'health';
    if (/^(?:ma|mana)$/.test(normalizedField)) return 'mana';
    if (/^(?:mv|move)$/.test(normalizedField)) return 'move';
    return undefined;
};

const getVitalPercent = (field: string, value: string): number | undefined => {
    const key = value.toLowerCase();
    const vitalType = getVitalType(field);
    const statuses = vitalType === 'health'
        ? PROMPT_HEALTH_STATUS_PERCENT
        : vitalType === 'mana'
            ? PROMPT_MANA_STATUS_PERCENT
            : vitalType === 'move'
                ? PROMPT_MOVE_STATUS_PERCENT
                : undefined;
    if (vitalType === 'health'
        && ['stunned', 'incapacitated', 'unconscious'].includes(key)) return 0;
    return statuses?.[key];
};

export const getPromptVitalValueRanges = (text: string): PromptTextRange[] => {
    const ranges: PromptTextRange[] = [];
    VITAL_FIELD_PATTERN.lastIndex = 0;

    for (const match of text.matchAll(VITAL_FIELD_PATTERN)) {
        const field = match[1];
        const value = match[2];
        const matchStart = match.index;
        if (matchStart === undefined || !value) continue;

        const valueStart = matchStart + match[0].lastIndexOf(value);
        const percent = getVitalPercent(field, value);
        ranges.push({
            start: valueStart,
            end: valueStart + value.length,
            percent,
            vitalType: percent === undefined ? undefined : getVitalType(field)
        });
    }

    return ranges;
};
