/**
 * @file swipeAutoPopulate.test.ts
 * @description Regression tests for practice-aware class swipe defaults.
 */

import { describe, expect, it } from 'vitest';
import { CustomButton, PracticeData } from '../../types';
import { applyPracticeSwipeDefaults } from '../swipeAutoPopulate';

// --- Logic Section ---

const makeButton = (id: string, swipeCommands?: CustomButton['swipeCommands']): CustomButton => ({
    id,
    label: id,
    command: '',
    setId: 'tactical',
    actionType: 'command',
    display: 'floating',
    hideIfUnknown: true,
    style: {},
    position: { x: 0, y: 0, w: 80, h: 40 },
    isVisible: true,
    swipeCommands
});

const practiceData: PracticeData = {
    sessionsLeft: 0,
    skills: [
        { name: 'Magic Missile', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Mage' },
        { name: 'Burning Hands', sessions: '', knowledge: 'fair', proficiency: 70, difficulty: '', advice: '', skillClass: 'Mage' },
        { name: 'Bash', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Warrior' },
        { name: 'Hide', sessions: '', knowledge: 'bad', proficiency: 30, difficulty: '', advice: '', skillClass: 'Thief' },
        { name: 'Sneak', sessions: '', knowledge: 'awful', proficiency: 0, difficulty: '', advice: '', skillClass: 'Thief' }
    ]
};

describe('applyPracticeSwipeDefaults', () => {
    it('adds known practice spells to empty class swipe directions', () => {
        const button = applyPracticeSwipeDefaults(makeButton('tactical-mage'), {}, practiceData);

        expect(button.swipeCommands?.up).toBe("cast 'Magic Missile'");
        expect(button.swipeCommands?.right).toBe("cast 'Burning Hands'");
        expect(button.swipeActionTypes?.up).toBe('command');
    });

    it('preserves existing manual swipe assignments and fills later slots', () => {
        const button = applyPracticeSwipeDefaults(
            makeButton('tactical-warrior', { up: 'rescue aragorn' }),
            {},
            practiceData
        );

        expect(button.swipeCommands?.up).toBe('rescue aragorn');
        expect(button.swipeCommands?.right).toBe('bash');
    });

    it('falls back to abilities when practice data is unavailable', () => {
        const button = applyPracticeSwipeDefaults(
            makeButton('tactical-cleric'),
            { heal: 90, sanctuary: 80 },
            null
        );

        expect(button.swipeCommands?.up).toBe("cast 'Heal'");
        expect(button.swipeCommands?.right).toBe("cast 'Sanctuary'");
    });

    it('does not add zero-proficiency skills', () => {
        const button = applyPracticeSwipeDefaults(makeButton('tactical-thief'), {}, practiceData);

        expect(Object.values(button.swipeCommands || {})).toEqual(['hide']);
    });
});

