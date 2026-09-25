// @vitest-environment jsdom
/**
 * @file useCharacterSessionProgress.test.tsx
 * @description Verifies simultaneous XP and TP awards update both session counters.
 */

import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCharacterSessionProgress } from './useCharacterSessionProgress';

describe('character session progress', () => {
    it('records XP and TP gains delivered in the same update', () => {
        const { result, rerender } = renderHook(
            ({ xp, tp }) => useCharacterSessionProgress('Ellessar', xp, tp, 46000, 1200),
            { initialProps: { xp: 100000, tp: 5000 } }
        );

        rerender({ xp: 100300, tp: 5025 });

        expect(result.current.sessionXp).toBe(300);
        expect(result.current.sessionTp).toBe(25);
        expect(result.current.floatingGains.map(gain => [gain.type, gain.amount]))
            .toEqual([['xp', 300], ['tp', 25]]);
    });
});
