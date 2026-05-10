/**
 * @file practiceDrawerLines.test.ts
 * @description Verifies skills drawer rows are generated from practice state.
 */

import { describe, expect, it } from 'vitest';
import { DrawerLine, PracticeData } from '../../types';
import { buildPracticeDrawerLines } from '../practiceDrawerLines';

// --- Logic Section ---

const captured: DrawerLine[] = [
    { id: 'old-sessions', text: 'You have 53 practice sessions left.', html: 'You have 53 practice sessions left.' },
    { id: 'teacher', text: 'The druid can teach you the spells below.', html: 'The druid can teach you the spells below.' }
];

describe('practiceDrawerLines', () => {
    it('renders current sessions and skill rows from structured practice data', () => {
        const data: PracticeData = {
            sessionsLeft: 52,
            skills: [{
                name: 'Remove poison',
                sessions: '1/3',
                knowledge: '15%',
                proficiency: 15,
                difficulty: 'Normal',
                advice: "I can't teach you enough",
                skillClass: 'Cleric'
            }]
        };

        const lines = buildPracticeDrawerLines(data, captured);

        expect(lines[0].text).toBe('You have 52 practice sessions left.');
        expect(lines.some(line => line.text.includes('The druid can teach'))).toBe(true);
        expect(lines.some(line => line.text.includes('Remove poison') && line.text.includes('1/3') && line.text.includes('15%'))).toBe(true);
        expect(lines.find(line => line.context === 'Remove poison')?.cmd).toBe('practice %n');
    });

    it('renders the global practice format without a sessions column', () => {
        const data: PracticeData = {
            sessionsLeft: 50,
            skills: [{
                name: 'Bless',
                sessions: '',
                knowledge: 'Bad',
                proficiency: 30,
                difficulty: 'Normal',
                advice: '',
                skillClass: 'Cleric',
                mana: '6',
                castingTime: 'Short'
            }]
        };

        const lines = buildPracticeDrawerLines(data, []);

        expect(lines[1].text).toContain('Skill / Spell');
        expect(lines[1].text).toContain('Mana');
        expect(lines.some(line => line.text.includes('Bless') && line.text.includes('Cleric') && line.text.includes('Short'))).toBe(true);
    });
});
