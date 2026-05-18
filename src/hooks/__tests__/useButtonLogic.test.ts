/**
 * @file useButtonLogic.test.ts
 * @description Regression tests for practice-aware dynamic button generation.
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useButtonLogic } from '../useButtonLogic';
import { PracticeData } from '../../types';

// --- Logic Section ---
const makePractice = (skills: PracticeData['skills']): PracticeData => ({
    sessionsLeft: 0,
    skills
});

describe('useButtonLogic', () => {
    it('does not generate thief skill buttons for passive Dodge practice', () => {
        const practiceData = makePractice([
            { name: 'Dodge', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Thief' },
            { name: 'Hide', sessions: '', knowledge: 'good', proficiency: 70, difficulty: '', advice: '', skillClass: 'Thief' }
        ]);

        const { result } = renderHook(() => useButtonLogic({
            rawButtons: [],
            activeSet: 'thiefskilllist',
            abilities: {},
            characterClass: 'Thief',
            characterName: 'Ellessar',
            isEditMode: false,
            target: null,
            inlineCategories: [],
            practiceData
        }));

        const thiefButtons = result.current.filter(button => button.setId === 'thiefskilllist');
        expect(thiefButtons.map(button => button.label)).toContain('Hide');
        expect(thiefButtons.map(button => button.label)).not.toContain('Dodge');
    });

    it('shows the Charmie tactical modifier only when Mage Charm is practiced', () => {
        const charmie = {
            id: 'tactical-charmie',
            label: 'Charmie',
            command: 'order followers',
            setId: 'tactical',
            actionType: 'modifier' as const,
            display: 'floating' as const,
            hideIfUnknown: true,
            requirement: { ability: 'Charm', minProficiency: 1, characterClass: ['Mage'] },
            style: {},
            position: { x: 0, y: 0, w: 80, h: 40 },
            isVisible: true
        };

        const withoutCharm = renderHook(() => useButtonLogic({
            rawButtons: [charmie],
            activeSet: 'main',
            abilities: {},
            characterClass: 'Mage',
            characterName: 'Ellessar',
            isEditMode: false,
            target: null,
            inlineCategories: [],
            practiceData: makePractice([
                { name: 'Magic Missile', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Mage' }
            ])
        }));

        const withCharm = renderHook(() => useButtonLogic({
            rawButtons: [charmie],
            activeSet: 'main',
            abilities: {},
            characterClass: 'Mage',
            characterName: 'Ellessar',
            isEditMode: false,
            target: null,
            inlineCategories: [],
            practiceData: makePractice([
                { name: 'Charm', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Mage' }
            ])
        }));

        expect(withoutCharm.result.current.map(button => button.id)).not.toContain('tactical-charmie');
        expect(withCharm.result.current.map(button => button.id)).toContain('tactical-charmie');
    });

    it('adds exit fallback targets to generated door abilities', () => {
        const { result } = renderHook(() => useButtonLogic({
            rawButtons: [],
            activeSet: 'spellbook',
            abilities: {},
            characterClass: 'Mage',
            characterName: 'Ellessar',
            isEditMode: false,
            target: null,
            inlineCategories: [],
            practiceData: makePractice([
                { name: 'Block Door', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Mage' },
                { name: 'Break Door', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Cleric' },
                { name: 'Pick', sessions: '', knowledge: 'good', proficiency: 80, difficulty: '', advice: '', skillClass: 'Thief' }
            ])
        }));

        const commands = result.current.map(button => button.command);
        expect(commands).toContain("cast 'block door' %n|exit");
        expect(commands).toContain("cast 'break door' %n|exit");
        expect(commands).toContain('pick %n|exit');
    });
});
