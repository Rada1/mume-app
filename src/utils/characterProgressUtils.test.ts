/**
 * @file characterProgressUtils.test.ts
 * @description Unit tests for character progress formatting and bottleneck detection.
 */

import { describe, it, expect } from 'vitest';
import {
    formatFullNumber,
    formatCompactProgNumber,
    determineLevelBlocker
} from './characterProgressUtils';

describe('characterProgressUtils', () => {
    describe('formatFullNumber', () => {
        it('formats numbers with commas', () => {
            expect(formatFullNumber(12_605_497)).toBe('12,605,497');
            expect(formatFullNumber(113_711)).toBe('113,711');
            expect(formatFullNumber(0)).toBe('0');
            expect(formatFullNumber(null)).toBe('0');
        });
    });

    describe('formatCompactProgNumber', () => {
        it('formats millions with M', () => {
            expect(formatCompactProgNumber(12_605_497)).toBe('12.6M');
            expect(formatCompactProgNumber(5_000_000)).toBe('5M');
        });

        it('formats thousands with k', () => {
            expect(formatCompactProgNumber(113_711)).toBe('113.7k');
            expect(formatCompactProgNumber(20_000)).toBe('20k');
        });

        it('formats numbers below 10k with commas', () => {
            expect(formatCompactProgNumber(1_250)).toBe('1,250');
            expect(formatCompactProgNumber(84)).toBe('84');
            expect(formatCompactProgNumber(0)).toBe('0');
        });
    });

    describe('determineLevelBlocker', () => {
        it('returns ready to level when both are 0', () => {
            const res = determineLevelBlocker(0, 0);
            expect(res.blocker).toBe('none');
            expect(res.statusText).toBe('READY TO LEVEL');
        });

        it('detects blocked by TP when XP is 0 but TP is needed', () => {
            const res = determineLevelBlocker(0, 150);
            expect(res.blocker).toBe('tp');
            expect(res.statusText).toBe('BLOCKED BY TP');
        });

        it('detects blocked by XP when TP is 0 but XP is needed', () => {
            const res = determineLevelBlocker(35_000, 0);
            expect(res.blocker).toBe('xp');
            expect(res.statusText).toBe('BLOCKED BY XP');
        });

        it('detects progressing when both are needed', () => {
            const res = determineLevelBlocker(35_000, 150);
            expect(res.blocker).toBe('both');
            expect(res.statusText).toBe('PROGRESSING');
        });
    });
});
