/**
 * @file spellCompletionMessages.ts
 * @description Catalog of MUME spell completion messages used to trigger sound effects
 * and spell tracking. Supports both static substring matches and dynamic regex patterns.
 */

export interface SpellCompletionPattern {
    /** Exact string or regular expression to match against the game output */
    pattern: string | RegExp;
    /** Pattern matching strategy */
    matchType: 'exact' | 'contains' | 'regex';
    /** Context note (e.g. initial cast, refresh/renewal, already active) */
    note?: string;
}

export interface SpellCompletionEntry {
    /** Canonical lowercase identifier for the spell */
    spellId: string;
    /** Display name */
    spellName: string;
    /** Character class */
    classType: 'magic user' | 'cleric';
    /** Completion messages that signify successful casting or resolution */
    messages: SpellCompletionPattern[];
    /** Messages received when the spell effect expires or drops */
    wearOffMessages?: string[];
    /** Suggested sound identifier when sound triggers are attached */
    soundId?: string;
}

export const SPELL_COMPLETION_CATALOG: SpellCompletionEntry[] = [
    {
        spellId: 'armour',
        spellName: 'Armour',
        classType: 'magic user',
        soundId: 'spell_armour',
        messages: [
            { pattern: 'Your magic armour is revitalised.', matchType: 'contains', note: 'Renewal' },
            { pattern: /A blue transparent (?:wall|shield)(?: slowly)? appears/i, matchType: 'regex' },
            { pattern: /encase .* in a blue transparent (?:wall|shield)/i, matchType: 'regex' }
        ]
    },
    {
        spellId: 'shield',
        spellName: 'Shield',
        classType: 'magic user',
        soundId: 'spell_shield',
        messages: [
            { pattern: 'Your protection is revitalised.', matchType: 'contains', note: 'Renewal' },
            { pattern: /You feel protected/i, matchType: 'regex' }
        ]
    },
    {
        spellId: 'bless',
        spellName: 'Bless',
        classType: 'cleric',
        soundId: 'spell_bless',
        messages: [{ pattern: 'You feel a renewed light shine upon you.', matchType: 'contains', note: 'Renewal' }],
        wearOffMessages: ['The light of Aman fades away from you.']
    },
    {
        spellId: 'shroud',
        spellName: 'Shroud',
        classType: 'magic user',
        soundId: 'spell_shroud',
        messages: [{ pattern: 'You are surrounded by a misty shroud.', matchType: 'contains' }],
        wearOffMessages: ['You feel more exposed.']
    },
    {
        spellId: 'store',
        spellName: 'Store',
        classType: 'magic user',
        soundId: 'spell_store',
        messages: [{ pattern: 'You stored it.', matchType: 'contains' }]
    },
    {
        spellId: 'remove_poison',
        spellName: 'Remove Poison',
        classType: 'cleric',
        soundId: 'spell_remove_poison',
        messages: [{ pattern: 'A strange feeling runs through your body.', matchType: 'contains' }]
    },
    {
        spellId: 'burning_hands',
        spellName: 'Burning Hands',
        classType: 'magic user',
        soundId: 'spell_burning_hands',
        messages: [{ pattern: /^You burn (.+)\.$/, matchType: 'regex' }]
    },
    {
        spellId: 'fireball',
        spellName: 'Fireball',
        classType: 'magic user',
        soundId: 'spell_fireball',
        messages: [
            { pattern: /^Your fireball hits (.+) with full force, causing an immediate death\.$/, matchType: 'regex' },
            { pattern: /^Your fireball completely envelops (.+) in flames\.$/, matchType: 'regex' }
        ]
    },
    {
        spellId: 'breath_of_briskness',
        spellName: 'Breath of Briskness',
        classType: 'cleric',
        soundId: 'spell_breath_of_briskness',
        messages: [{ pattern: 'An energy begins to flow within your legs as your body becomes lighter.', matchType: 'contains' }]
    },
    {
        spellId: 'sleep',
        spellName: 'Sleep',
        classType: 'magic user',
        soundId: 'spell_sleep',
        messages: [{ pattern: /^(.+) lies down and falls asleep\.$/, matchType: 'regex' }]
    },
    {
        spellId: 'lightning_bolt',
        spellName: 'Lightning Bolt',
        classType: 'magic user',
        soundId: 'spell_lightning_bolt',
        messages: [{ pattern: /^The lightning bolt hits (.+) with full impact\.$/, matchType: 'regex' }]
    },
    {
        spellId: 'charm',
        spellName: 'Charm',
        classType: 'magic user',
        soundId: 'spell_charm',
        messages: [{ pattern: /^(.+) starts following you\.$/, matchType: 'regex' }]
    },
    {
        spellId: 'cure_light',
        spellName: 'Cure Light',
        classType: 'cleric',
        soundId: 'spell_cure_light',
        messages: [{ pattern: 'Your scratches and bruises disappear.', matchType: 'contains' }]
    },
    {
        spellId: 'cure_serious',
        spellName: 'Cure Serious',
        classType: 'cleric',
        soundId: 'spell_cure_serious',
        messages: [{ pattern: 'You begin to see scars fade away and a feeling of health comes over you.', matchType: 'contains' }]
    },
    {
        spellId: 'create_food',
        spellName: 'Create Food',
        classType: 'cleric',
        soundId: 'spell_create_food',
        messages: [{ pattern: 'A magic mushroom suddenly appears.', matchType: 'contains' }]
    },
    {
        spellId: 'create_water',
        spellName: 'Create Water',
        classType: 'cleric',
        soundId: 'spell_create_water',
        messages: [
            { pattern: 'You feel less thirsty.', matchType: 'contains' },
            { pattern: 'You create water.', matchType: 'contains' }
        ]
    },
    {
        spellId: 'call_familiar',
        spellName: 'Call Familiar',
        classType: 'magic user',
        soundId: 'spell_call_familiar',
        messages: [{ pattern: /^(.+) suddenly appears\.$/, matchType: 'regex' }]
    },
    {
        spellId: 'block_door',
        spellName: 'Block Door',
        classType: 'magic user',
        soundId: 'spell_block_door',
        messages: [{ pattern: /^The exit (.+) seems to blur for a while\.$/, matchType: 'regex' }]
    },
    {
        spellId: 'earthquake',
        spellName: 'Earthquake',
        classType: 'magic user',
        soundId: 'spell_earthquake',
        messages: [{ pattern: 'The earth trembles beneath your feet!', matchType: 'contains' }]
    },
    {
        spellId: 'locate',
        spellName: 'Locate',
        classType: 'magic user',
        soundId: 'spell_locate',
        messages: [{ pattern: /^You feel the magic aura of this place: key: '([^']+)'/, matchType: 'regex' }]
    },
    {
        spellId: 'portal',
        spellName: 'Portal',
        classType: 'magic user',
        soundId: 'spell_portal',
        messages: [{ pattern: 'A shimmering portal appears, giving hints about the other side of it.', matchType: 'contains' }]
    },
    {
        spellId: 'locate_life',
        spellName: 'Locate Life',
        classType: 'magic user',
        soundId: 'spell_locate_life',
        messages: [
            { pattern: "Your inner eye didn't manage to leave this place.", matchType: 'contains' },
            { pattern: "You feel very confused and can't concentrate any more.", matchType: 'contains' }
        ]
    }
];

/**
 * Match a raw game line against the spell completion catalog.
 */
export const matchSpellCompletion = (text: string): { entry: SpellCompletionEntry; pattern: SpellCompletionPattern } | null => {
    const clean = text.trim();
    if (!clean) return null;

    for (const entry of SPELL_COMPLETION_CATALOG) {
        for (const p of entry.messages) {
            if (p.matchType === 'exact' && clean === p.pattern) {
                return { entry, pattern: p };
            }
            if (p.matchType === 'contains' && typeof p.pattern === 'string' && clean.includes(p.pattern)) {
                return { entry, pattern: p };
            }
            if (p.matchType === 'regex' && p.pattern instanceof RegExp && p.pattern.test(clean)) {
                return { entry, pattern: p };
            }
        }
    }
    return null;
};
