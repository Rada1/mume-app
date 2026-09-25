import { describe, expect, it } from 'vitest';
import { getLearnedClassSkillCounts } from './practiceClassCatalog';

describe('getLearnedClassSkillCounts', () => {
    it('counts only learned skills in their class category', () => {
        expect(getLearnedClassSkillCounts({
            bandage: 76, climb: 100, ride: 100, swim: 100, awareness: 0, bless: 90
        })).toMatchObject({ ranger: 4, cleric: 1, thief: 0, warrior: 0, mage: 0 });
    });
});
