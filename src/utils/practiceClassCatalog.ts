/**
 * @file practiceClassCatalog.ts
 * @description Canonical MUME practice skill and spell class lookup.
 */

export type PracticeClassKey = 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief';

// --- Logic Section ---

export const PRACTICE_CLASS_SKILLS: Record<PracticeClassKey, string[]> = {
    ranger: [
        'Awareness', 'Bandage', 'Climb', 'Command', 'Dark Oath',
        'Leadership', 'Ride', 'Swim', 'Track', 'Wilderness'
    ],
    thief: [
        'Attack', 'Backstab', 'Dodge', 'Envenom', 'Escape', 'Hide',
        'Missile', 'Pick', 'Piercing Weapons', 'Search', 'Sneak', 'Steal'
    ],
    warrior: [
        'Bash', 'Charge', 'Cleaving Weapons', 'Concussion Weapons',
        'Endurance', 'Kick', 'Parry', 'Rescue', 'Slashing Weapons',
        'Stabbing Weapons', 'Two-handed Weapons', 'Unarmed Combat'
    ],
    mage: [
        'Magic Missile', 'Ventriloquate', 'Detect Invisibility', 'Detect Magic',
        'Armour', 'Chill Touch', 'Create Light', 'Locate Magic', 'Burning Hands',
        'Shroud', 'Find the Path', 'Locate', 'Call Familiar', 'Night Vision',
        'Shocking Grasp', 'Earthquake', 'Teleport', 'Block Door', 'Lightning Bolt',
        'Control Weather', 'Store', 'Colour Spray', 'Locate Life', 'Call Lightning',
        'Enchant', 'Scry', 'Shield', 'Charm', 'Sleep', 'Fireball', 'Magic Blast',
        'Dispel Magic', 'Watch Room', 'Silence', 'Identify', 'Portal'
    ],
    cleric: [
        'Cure Light', 'Detect Evil', 'Create Water', 'Detect Poison', 'Create Food',
        'Smother', 'Cure Blindness', 'Protection from Evil', 'Bless', 'Cure Serious',
        'Blindness', 'Cure Disease', 'Sense Life', 'Strength', 'Poison', 'Summon',
        'Cure Critic', 'Cure Critical', 'Remove Poison', 'Breath of Briskness',
        'Curse', 'Remove Curse', 'Word of Recall', 'Black Breath', 'Dispel Evil',
        'Darkness', 'Energy Drain', 'Heal', 'Transfer', 'Fear', 'Harm', 'Hold',
        'Break Door', 'Divination', 'Raise Dead', 'Sanctuary'
    ]
};

const normalizePracticeName = (name: string): string => name
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const PRACTICE_CLASS_LOOKUP = Object.entries(PRACTICE_CLASS_SKILLS).reduce<Record<string, PracticeClassKey>>(
    (lookup, [classKey, skills]) => {
        skills.forEach(skill => {
            lookup[normalizePracticeName(skill)] = classKey as PracticeClassKey;
        });
        return lookup;
    },
    {}
);

export const getPracticeClassKey = (skillName: string): PracticeClassKey | null => (
    PRACTICE_CLASS_LOOKUP[normalizePracticeName(skillName)] || null
);

export const getPracticeClassLabel = (skillName: string): string | null => {
    const classKey = getPracticeClassKey(skillName);
    return classKey ? classKey.charAt(0).toUpperCase() + classKey.slice(1) : null;
};

// MUME guild room load flags → practice class. Note SCOUT_GUILD is the thief guild.
const GUILD_FLAG_TO_CLASS: Record<string, PracticeClassKey> = {
    RANGER_GUILD: 'ranger',
    WARRIOR_GUILD: 'warrior',
    MAGE_GUILD: 'mage',
    CLERIC_GUILD: 'cleric',
    SCOUT_GUILD: 'thief',
    THIEF_GUILD: 'thief'
};

/**
 * Returns the practice class a room is a guild for, based on its load flags
 * (e.g. `CLERIC_GUILD` → 'cleric'), or null if it's not a class guild.
 */
export const getGuildClassFromFlags = (flags: Array<string | undefined | null> | undefined): PracticeClassKey | null => {
    if (!flags) return null;
    for (const flag of flags) {
        const cls = GUILD_FLAG_TO_CLASS[String(flag || '').toUpperCase()];
        if (cls) return cls;
    }
    return null;
};

