/**
 * @file spellCombatStatUtils.ts
 * @description Identifies self spell changes that alter compact combat stats.
 */

// --- Logic Section ---
const COMBAT_STAT_SPELL_PATTERNS = [
    // Bless application and expiry.
    /\byou (?:begin to feel the light of aman shine upon you|feel righteous|bless)\b/i,
    /\b(?:renewed light shine upon you|blessing .*wears off|you feel less blessed|the light of aman fades away from you)\b/i,
    // Armour application and expiry.
    /\b(?:a blue transparent (?:wall|shield)(?: slowly)? appears|you are encased .*blue transparent (?:wall|shield)|magic armou?r is revitalised|armou?r spell .*wears off)\b/i,
    // Shield application and expiry.
    /\byou feel (?:protected|less protected)\b/i,
    /\bshield .*wears off\b/i,
    // Shroud application and expiry.
    /\byou are surrounded by a misty shroud\b/i,
    /\b(?:your|the) misty shroud .*?(?:fades|wears off|disappears|vanishes)\b/i,
    /\byou feel more exposed\b/i,
];

/** Returns true only for a self buff event that can change OB, DB, PB, or armour. */
export const changesCombatStatsFromSpell = (text: string) =>
    COMBAT_STAT_SPELL_PATTERNS.some(pattern => pattern.test(text));
