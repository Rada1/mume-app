export const MAGE_SPELLS = [
    "Burning Hands", "Call Lightning", "Chill Touch", "Colour Spray",
    "Earthquake", "Dispel Magic", "Fireball", "Lightning Bolt",
    "Magic Blast", "Magic Missile", "Shocking Grasp", "Charm",
    "Silence", "Sleep", "Ventriloquate", "Call Familiar", "Block Door",
    "Control Weather", "Create Light", "Enchant", "Night Vision",
    "Store", "Armour", "Shield", "Shroud", "Detect Invisibility",
    "Detect Magic", "Locate", "Locate Life", "Locate Magic",
    "Identify", "Find the Path", "Teleport", "Portal", "Scry", "Watch Room"
];

export const CLERIC_SPELLS = [
    "Armour", "Cure Light", "Create Water", "Detect Poison",
    "Detect Evil", "Create Food", "Smother", "Cure Blindness",
    "Cure Serious", "Remove Poison", "Bless", "Blindness",
    "Strength", "Sense Life", "Heal", "Cure Critical",
    "Breath of Briskness", "Fear", "Transfer", "Darkness",
    "Sanctuary", "Summon", "Hammer of Faith", "Dispel Evil"
];

export const WARRIOR_SKILLS = [
    "Bash", "Kick", "Rescue", "Parry", "Recuperate", "Concussion", "Charge"
];

export const RANGER_SKILLS = [
    "Track", "Sneak", "Ambush", "Climb", "Search", "Wilderness-skill", "Swim", "Ride", "Endurance"
];

export const THIEF_SKILLS = [
    "Backstab", "Pick", "Hide", "Sneak", "Steal", "Search", "Track", "Climb", "Pickpocket", "Lockpick"
];

export const CLASS_MAPPINGS: Record<string, string[]> = {
    'warrior': WARRIOR_SKILLS,
    'ranger': RANGER_SKILLS,
    'thief': THIEF_SKILLS,
    'mage': MAGE_SPELLS,
    'cleric': CLERIC_SPELLS
};
