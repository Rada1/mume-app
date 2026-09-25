// @vitest-environment jsdom
/**
 * @file useGuildPracticeActions.test.tsx
 * @description Guild training appears only after current-room practice data arrives.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PracticeData } from '../types';
import { useGuildPracticeActions } from './useGuildPracticeActions';

vi.mock('../context/useMapper', () => ({ useMapper: () => ({
    currentRoomId: 'm_123', rooms: { m_123: { loadFlags: ['WARRIOR_GUILD'] } },
    preloadedCoordsRef: { current: {} }
}) }));

// --- Tests ---
describe('guild practice actions', () => {
    it('requests current guild data and only enables skills taught there', () => {
        const send = vi.fn();
        const data: PracticeData = { sessionsLeft: 3, isAtGuildmaster: true, skills: [
            { name: 'Bash', sessions: '1/5', knowledge: 'good', proficiency: 80, difficulty: 'Normal', advice: '' },
            { name: 'Parry', sessions: '5/5', knowledge: 'excellent', proficiency: 98, difficulty: 'Normal', advice: '' }
        ] };
        const { result, rerender } = renderHook(({ practiceData }) =>
            useGuildPracticeActions(true, 123, [], practiceData, send), { initialProps: { practiceData: null as PracticeData | null } });
        expect(send).toHaveBeenCalledWith('practice', true, true, false, true);
        expect(result.current.available).toBe(false);
        rerender({ practiceData: data });
        expect(result.current.available).toBe(true);
        expect(result.current.trainingFor('Bash')?.enabled).toBe(true);
        expect(result.current.trainingFor('Parry')?.enabled).toBe(false);
        expect(result.current.trainingFor('Charge')).toBeNull();
    });
});
