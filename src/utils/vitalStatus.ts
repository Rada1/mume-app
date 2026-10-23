/**
 * @file vitalStatus.ts
 * @description Resolves normalized vital percentages from current values or MUME status text.
 */

// --- Type Section ---
export type VitalKind = 'health' | 'mana' | 'move';
export type VitalInput = number | string | null | undefined;
export const LOW_VITAL_THRESHOLD_PERCENT = 25;
export const isVitalLow = (percent: number | null | undefined): boolean =>
    percent !== null && percent !== undefined && percent < LOW_VITAL_THRESHOLD_PERCENT;

// --- Logic Section ---
const STATUS_PERCENT: Record<VitalKind, Record<string, number>> = {
    health: { healthy: 100, fine: 83, hurt: 66, wounded: 50, bad: 33, awful: 16, dying: 0, stunned: 25, none: 0, incapacitated: 0, unconscious: 0 },
    mana: { full: 100, burning: 83, hot: 66, warm: 50, cold: 33, icy: 16, frozen: 0 },
    move: { unwearied: 100, steadfast: 85, rested: 71, tired: 57, slow: 42, weak: 28, fainting: 14, exhausted: 0 }
};

const toFiniteNumber = (value: VitalInput): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || !/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

export const getVitalStatusPercent = (kind: VitalKind, status?: string | null): number | null => {
    const normalized = status?.trim().toLowerCase();
    return normalized ? STATUS_PERCENT[kind][normalized] ?? null : null;
};

export const getVitalPercent = (
    kind: VitalKind,
    current: VitalInput,
    maximum: VitalInput,
    status?: string | null
): number | null => {
    if (typeof current === 'string') {
        const normalized = current.trim();
        const percentValue = normalized.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
        if (percentValue) return clampPercent(Number(percentValue[1]));

        const pair = normalized.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
        if (pair && Number(pair[2]) > 0) return clampPercent((Number(pair[1]) / Number(pair[2])) * 100);
    }

    const currentValue = toFiniteNumber(current);
    const maximumValue = toFiniteNumber(maximum);
    if (currentValue !== null && maximumValue !== null && maximumValue > 0) {
        return clampPercent((currentValue / maximumValue) * 100);
    }
    return getVitalStatusPercent(kind, status)
        ?? (typeof current === 'string' ? getVitalStatusPercent(kind, current) : null);
};
