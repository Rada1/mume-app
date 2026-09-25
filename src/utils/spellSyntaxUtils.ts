/**
 * @file spellSyntaxUtils.ts
 * @description Provides canonical MUME casting and skill typing syntax (e.g. `cast 'burning hands' <target>`).
 */

// --- Logic Section ---
import { PASSIVE_SKILLS, TARGETED_SKILLS } from './practiceClassCatalog';

/** Special-case parameter requirements for specific spells. */
const SPELL_SYNTAX_OVERRIDES: Record<string, string> = {
    'block door': "cast 'block door' <dir>",
    'break door': "cast 'break door' <dir>",
    'create water': "cast 'create water' [container]",
    'detect poison': "cast 'detect poison' <target/item>",
    'locate': "cast 'locate' <item>",
    'identify': "cast 'identify' <item>",
    'enchant': "cast 'enchant' <weapon>",
    'portal': "cast 'portal' <target>",
    'scry': "cast 'scry' <target>",
    'ventriloquate': "cast 'ventriloquate' <target> <speech>",
    // Self / area spells (explicitly no target needed)
    'shroud': "cast 'shroud'",
    'detect invisibility': "cast 'detect invisibility'",
    'detect magic': "cast 'detect magic'",
    'create light': "cast 'create light'",
    'locate magic': "cast 'locate magic'",
    'find the path': "cast 'find the path'",
    'call familiar': "cast 'call familiar'",
    'night vision': "cast 'night vision'",
    'earthquake': "cast 'earthquake'",
    'control weather': "cast 'control weather'",
    'store': "cast 'store'",
    'watch room': "cast 'watch room'",
    'detect evil': "cast 'detect evil'",
    'create food': "cast 'create food'",
    'sense life': "cast 'sense life'",
    'breath of briskness': "cast 'breath of briskness'",
    'word of recall': "cast 'word of recall'",
    'darkness': "cast 'darkness'",
    'divination': "cast 'divination'"
};

const SKILL_SYNTAX_OVERRIDES: Record<string, string> = {
    'climb': 'climb <dir>',
    'search': 'search [dir]',
    'pick': 'pick <dir/item>'
};

/**
 * Returns the exact command syntax needed to cast a spell in MUME.
 * E.g. `cast 'burning hands' <target>`, `cast 'shroud'`, `cast 'armour' <target>`.
 */
export const getSpellSyntax = (spellName: string): string => {
    const norm = spellName.trim().toLowerCase();
    if (SPELL_SYNTAX_OVERRIDES[norm]) {
        return SPELL_SYNTAX_OVERRIDES[norm];
    }
    const needsTarget = TARGETED_SKILLS.has(norm);
    return needsTarget ? `cast '${norm}' <target>` : `cast '${norm}'`;
};

/**
 * Returns the typing syntax for a skill or spell.
 */
export const getSkillOrSpellSyntax = (name: string, isSpell: boolean): string => {
    const norm = name.trim().toLowerCase();
    if (isSpell) {
        return getSpellSyntax(name);
    }
    if (PASSIVE_SKILLS.has(norm)) {
        return 'passive';
    }
    if (SKILL_SYNTAX_OVERRIDES[norm]) {
        return SKILL_SYNTAX_OVERRIDES[norm];
    }
    const needsTarget = TARGETED_SKILLS.has(norm);
    return needsTarget ? `${norm} <target>` : norm;
};

/** Canonical base mana costs for MUME spells. */
export const CANONICAL_SPELL_MANA: Record<string, number> = {
    // Mage
    'magic missile': 10, 'ventriloquate': 5, 'detect invisibility': 7, 'detect magic': 5,
    'armour': 15, 'chill touch': 15, 'create light': 5, 'locate magic': 15,
    'burning hands': 15, 'shroud': 25, 'find the path': 15, 'locate': 20,
    'call familiar': 30, 'night vision': 10, 'shocking grasp': 15, 'earthquake': 25,
    'teleport': 35, 'block door': 20, 'lightning bolt': 25, 'control weather': 25,
    'store': 10, 'colour spray': 20, 'locate life': 20, 'call lightning': 30,
    'enchant': 50, 'scry': 25, 'shield': 20, 'charm': 25, 'sleep': 25,
    'fireball': 35, 'magic blast': 35, 'dispel magic': 25, 'watch room': 15,
    'silence': 25, 'identify': 25, 'portal': 50,
    // Cleric
    'cure light': 10, 'detect evil': 5, 'create water': 5, 'detect poison': 5,
    'create food': 5, 'smother': 10, 'cure blindness': 15, 'protection from evil': 15,
    'bless': 15, 'cure serious': 15, 'blindness': 15, 'cure disease': 15,
    'sense life': 10, 'strength': 20, 'poison': 15, 'summon': 50,
    'cure critic': 20, 'cure critical': 20, 'remove poison': 15, 'breath of briskness': 15,
    'curse': 15, 'remove curse': 20, 'word of recall': 20, 'black breath': 30,
    'dispel evil': 25, 'darkness': 15, 'energy drain': 35, 'heal': 50,
    'transfer': 35, 'fear': 20, 'harm': 35, 'hold': 25,
    'break door': 20, 'divination': 30, 'raise dead': 100, 'sanctuary': 50
};

/**
 * Returns the mana cost of a spell.
 * Checks authoritative parsed practice data first, then falls back to canonical base mana.
 */
export const getSpellManaCost = (
    spellName: string,
    practiceSkills?: Array<{ name: string; mana?: string }> | null
): number | null => {
    const norm = spellName.trim().toLowerCase();
    if (practiceSkills) {
        const found = practiceSkills.find(s => s.name.trim().toLowerCase() === norm);
        if (found?.mana) {
            const parsed = parseInt(found.mana, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
    }
    return CANONICAL_SPELL_MANA[norm] ?? null;
};
