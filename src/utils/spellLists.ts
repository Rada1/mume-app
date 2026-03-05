// Active skills only — passive skills (attack, dodge, parry, endurance, etc.) excluded.

export const MAGE_SPELLS = [
    // Level 1
    "Magic Missile", "Ventriloquate",
    // Level 2
    "Detect Invisibility", "Detect Magic",
    // Level 3
    "Armour", "Chill Touch",
    // Level 4
    "Create Light", "Locate Magic",
    // Level 5
    "Burning Hands", "Shroud",
    // Level 6
    "Find the Path", "Locate",
    // Level 7
    "Call Familiar", "Night Vision", "Shocking Grasp",
    // Level 8
    "Earthquake", "Teleport",
    // Level 9
    "Block Door", "Lightning Bolt",
    // Level 10
    "Control Weather", "Store",
    // Level 11
    "Colour Spray", "Locate Life",
    // Level 12
    "Call Lightning", "Enchant",
    // Level 13
    "Scry", "Shield",
    // Level 14
    "Charm", "Sleep",
    // Level 15
    "Fireball", "Magic Blast",
    // Level 16
    "Dispel Magic", "Watch Room",
    // Level 17
    "Silence",
    // Level 18
    "Identify", "Portal"
];

export const CLERIC_SPELLS = [
    // Level 1
    "Cure Light", "Detect Evil",
    // Level 2
    "Create Water", "Detect Poison",
    // Level 3
    "Create Food", "Smother",
    // Level 4
    "Cure Blindness", "Protection from Evil",
    // Level 5
    "Bless", "Cure Serious",
    // Level 6
    "Blindness", "Cure Disease",
    // Level 7
    "Sense Life", "Strength",
    // Level 8
    "Poison", "Summon",
    // Level 9
    "Cure Critical", "Remove Poison",
    // Level 10
    "Breath of Briskness", "Curse",
    // Level 11
    "Remove Curse", "Word of Recall",
    // Level 12
    "Black Breath", "Dispel Evil",
    // Level 13
    "Darkness", "Energy Drain",
    // Level 14
    "Heal", "Transfer",
    // Level 15
    "Fear", "Harm",
    // Level 16
    "Hold",
    // Level 17
    "Break Door", "Divination",
    // Level 18
    "Raise Dead", "Sanctuary"
];

// Active warrior skills only (passive: attack, cleaving weapons, concussion weapons,
// endurance, parry, slashing weapons, stabbing weapons, two-handed weapons,
// unarmed combat, piercing weapons are excluded)
export const WARRIOR_SKILLS = [
    "Bash", "Charge", "Kick", "Rescue"
];

// Active ranger skills only (passive: wilderness, command, dark oath, leadership are excluded)
export const RANGER_SKILLS = [
    "Awareness", "Bandage", "Climb", "Ride", "Swim", "Track"
];

// Active thief skills only (passive: dodge, attack are excluded)
export const THIEF_SKILLS = [
    "Backstab", "Envenom", "Escape", "Hide", "Missile",
    "Pick", "Search", "Sneak", "Steal"
];

export const CLASS_MAPPINGS: Record<string, string[]> = {
    'warrior': WARRIOR_SKILLS,
    'ranger': RANGER_SKILLS,
    'thief': THIEF_SKILLS,
    'mage': MAGE_SPELLS,
    'cleric': CLERIC_SPELLS
};
