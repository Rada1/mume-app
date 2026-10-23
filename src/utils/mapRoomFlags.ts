/** @file Shared room flag names for local icon editing. */
import { LOAD_FLAGS, MOB_FLAGS } from '../components/Mapper/performance/webcockpit/model';

// --- Flag Normalization ---
export const normalizeMapRoomFlag = (value: string): string => value.replace(/^BIN_(?:MOB|LOAD)_/i, '').toUpperCase();
export const mapRoomFlagChoices = (existing: readonly string[], kind: 'mobFlags' | 'loadFlags'): string[] =>
    [...new Set([...(kind === 'mobFlags' ? MOB_FLAGS : LOAD_FLAGS), ...existing].map(normalizeMapRoomFlag))]
        .filter(flag => !['DARK', 'NOLIGHT', 'NO_SUNDEATH'].includes(flag));
