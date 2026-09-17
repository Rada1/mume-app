// @vitest-environment jsdom
/**
 * @file useStatParser.test.ts
 * @description Regression tests for compact prompt-stat responses.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStatParser } from './useStatParser';

describe('useStatParser compact combat info', () => {
    it('accepts signed values with percent formatting from info', () => {
        let nextStats: Record<string, number> | undefined;
        const setStats = vi.fn((updater: (current: Record<string, number>) => Record<string, number>) => {
            nextStats = updater({});
        });
        const { result } = renderHook(() => useStatParser({
            setMood: vi.fn(),
            setStats: setStats as any,
            setCharacterInfo: vi.fn(),
            inCombatRef: { current: false },
            executeCommandRef: { current: null },
            capture: {} as any
        }));

        expect(result.current.parseCompactCombatInfo('-10% 23% 77% 1%')).toBe(true);
        expect(nextStats).toMatchObject({ ob: -10, db: 23, pb: 77, armour: 1 });
    });
});
