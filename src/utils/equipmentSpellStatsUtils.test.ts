import { describe, expect, it } from 'vitest';
import { calculateEquipmentSpellStats, formatEquipmentSpellStat } from './equipmentSpellStatsUtils';

describe('calculateEquipmentSpellStats', () => {
    it('adds all known spell modifiers from worn equipment', () => {
        expect(calculateEquipmentSpellStats([
            'a coarse dusky robe', 'an ashen blade', 'a golden belt', 'a black runed sceptre'
        ])).toEqual({ spellAttack: 25, spellSave: -40 });
    });

    it('does not infer modifiers for unknown equipment', () => {
        expect(calculateEquipmentSpellStats(['a plain cloak'])).toEqual({ spellAttack: 0, spellSave: 0 });
        expect(formatEquipmentSpellStat(5)).toBe('+5');
        expect(formatEquipmentSpellStat(-10)).toBe('-10');
    });
});
