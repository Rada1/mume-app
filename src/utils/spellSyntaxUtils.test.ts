import { describe, it, expect } from 'vitest';
import { getSpellSyntax, getSkillOrSpellSyntax, getSpellManaCost } from './spellSyntaxUtils';

describe('spellSyntaxUtils', () => {
    it('generates correct targeted spell syntax', () => {
        expect(getSpellSyntax('Burning Hands')).toBe("cast 'burning hands' <target>");
        expect(getSpellSyntax('Magic Missile')).toBe("cast 'magic missile' <target>");
        expect(getSpellSyntax('Chill Touch')).toBe("cast 'chill touch' <target>");
        expect(getSpellSyntax('Armour')).toBe("cast 'armour' <target>");
        expect(getSpellSyntax('Cure Light')).toBe("cast 'cure light' <target>");
    });

    it('generates correct self or area spell syntax without target', () => {
        expect(getSpellSyntax('Detect Invisibility')).toBe("cast 'detect invisibility'");
        expect(getSpellSyntax('Detect Magic')).toBe("cast 'detect magic'");
        expect(getSpellSyntax('Shroud')).toBe("cast 'shroud'");
        expect(getSpellSyntax('Earthquake')).toBe("cast 'earthquake'");
        expect(getSpellSyntax('Create Light')).toBe("cast 'create light'");
        expect(getSpellSyntax('Word of Recall')).toBe("cast 'word of recall'");
    });

    it('generates item and direction overrides for special spells', () => {
        expect(getSpellSyntax('Block Door')).toBe("cast 'block door' <dir>");
        expect(getSpellSyntax('Identify')).toBe("cast 'identify' <item>");
        expect(getSpellSyntax('Enchant')).toBe("cast 'enchant' <weapon>");
    });

    it('generates skill typing syntax', () => {
        expect(getSkillOrSpellSyntax('Bash', false)).toBe('bash <target>');
        expect(getSkillOrSpellSyntax('Kick', false)).toBe('kick <target>');
        expect(getSkillOrSpellSyntax('Parry', false)).toBe('passive');
        expect(getSkillOrSpellSyntax('Dodge', false)).toBe('passive');
        expect(getSkillOrSpellSyntax('Hide', false)).toBe('hide');
        expect(getSkillOrSpellSyntax('Search', false)).toBe('search [dir]');
    });

    it('delegates to getSpellSyntax when isSpell is true', () => {
        expect(getSkillOrSpellSyntax('Burning Hands', true)).toBe("cast 'burning hands' <target>");
        expect(getSkillOrSpellSyntax('Shroud', true)).toBe("cast 'shroud'");
    });

    it('returns canonical base mana cost when no practice skills list is provided', () => {
        expect(getSpellManaCost('Burning Hands')).toBe(15);
        expect(getSpellManaCost('shroud')).toBe(25);
        expect(getSpellManaCost('cure light')).toBe(10);
        expect(getSpellManaCost('heal')).toBe(50);
        expect(getSpellManaCost('Unknown Spell')).toBeNull();
    });

    it('prioritizes authoritative parsed practice data when present', () => {
        const mockSkills = [
            { name: 'Burning Hands', mana: '12' },
            { name: 'Shroud', mana: '20' }
        ];
        expect(getSpellManaCost('Burning Hands', mockSkills)).toBe(12);
        expect(getSpellManaCost('Shroud', mockSkills)).toBe(20);
        expect(getSpellManaCost('Cure Light', mockSkills)).toBe(10); // Fallback to canonical
    });
});
