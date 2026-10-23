/** @file msspTime.ts — Reads MUME's pre-login server calendar from MSSP status data. */
import type { MumeTime } from '../../types';
import { dateToMumeMinutes, getMumeTimeFromEpoch, MUME_MONTHS, MUME_MONTH_DETAILS } from '../mumeTimeUtils';

// --- MSSP Fields ---
const VAR = 1;
const VAL = 2;
const normalize = (value: string): string => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const readFields = (bytes: readonly number[]): Map<string, string> => {
    const fields = new Map<string, string>();
    const decoder = new TextDecoder();
    let mode: 'name' | 'value' | null = null;
    let name = '';
    let buffer: number[] = [];
    const commit = () => {
        if (mode === 'value' && name && !fields.has(name)) fields.set(name, decoder.decode(new Uint8Array(buffer)).trim());
    };
    for (const byte of bytes) {
        if (byte === VAR) {
            commit(); name = ''; buffer = []; mode = 'name';
        } else if (byte === VAL && mode) {
            if (mode === 'name') name = decoder.decode(new Uint8Array(buffer)).trim().toUpperCase();
            else commit();
            buffer = []; mode = 'value';
        } else if (mode) buffer.push(byte);
    }
    commit();
    return fields;
};

// --- Calendar Calibration ---
export const parseMsspTime = (bytes: readonly number[], now = Date.now()): MumeTime | null => {
    const fields = readFields(bytes);
    const numeric = (key: string): number => {
        const value = fields.get(key) || '';
        return /^\d+$/.test(value) ? Number(value) : NaN;
    };
    const year = numeric('GAME YEAR');
    const dayIndex = numeric('GAME DAY');
    const hour = numeric('GAME HOUR');
    const monthName = normalize(fields.get('GAME MONTH') || '');
    const month = MUME_MONTHS.findIndex(name => normalize(name) === monthName
        || normalize(MUME_MONTH_DETAILS[name].sindarin) === monthName);
    if (!Number.isSafeInteger(year) || year < 2850 || month < 0 || dayIndex < 0 || dayIndex > 29
        || !Number.isInteger(dayIndex) || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    // MUME reports zero-based days. MSSP supplies no minute; retain the epoch estimate as MMapper does.
    const minute = getMumeTimeFromEpoch(1517443173, now).minute;
    const elapsed = dateToMumeMinutes(year, month, dayIndex + 1, hour, minute);
    return getMumeTimeFromEpoch(Math.floor(now / 1000) - elapsed, now);
};
