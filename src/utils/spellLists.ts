/**
 * @file spellLists.ts
 * @description Canonical MUME spell and skill lists used by tactical class menus.
 */

export const MAGE_SPELLS = [
    "Magic Missile", "Ventriloquate",
    "Detect Invisibility", "Detect Magic",
    "Armour", "Chill Touch",
    "Create Light", "Locate Magic",
    "Burning Hands", "Shroud",
    "Find the Path", "Locate",
    "Call Familiar", "Night Vision", "Shocking Grasp",
    "Earthquake", "Teleport",
    "Block Door", "Lightning Bolt",
    "Control Weather", "Store",
    "Colour Spray", "Locate Life",
    "Call Lightning", "Enchant",
    "Scry", "Shield",
    "Charm", "Sleep",
    "Fireball", "Magic Blast",
    "Dispel Magic", "Watch Room",
    "Silence",
    "Identify", "Portal"
];

export const CLERIC_SPELLS = [
    "Cure Light", "Detect Evil",
    "Create Water", "Detect Poison",
    "Create Food", "Smother",
    "Cure Blindness", "Protection from Evil",
    "Bless", "Cure Serious",
    "Blindness", "Cure Disease",
    "Sense Life", "Strength",
    "Poison", "Summon",
    "Cure Critic", "Remove Poison",
    "Breath of Briskness", "Curse",
    "Remove Curse", "Word of Recall",
    "Black Breath", "Dispel Evil",
    "Darkness", "Energy Drain",
    "Heal", "Transfer",
    "Fear", "Harm",
    "Hold",
    "Break Door", "Divination",
    "Raise Dead", "Sanctuary"
];

export const WARRIOR_SKILLS = [
    "Bash", "Charge", "Kick", "Rescue"
];

export const RANGER_SKILLS = [
    "Bandage", "Climb", "Ride", "Swim", "Track"
];

export const THIEF_SKILLS = [
    "Backstab", "Envenom", "Escape", "Hide",
    "Missile", "Pick", "Search", "Sneak", "Steal"
];

export const CLASS_MAPPINGS: Record<string, string[]> = {
    warrior: WARRIOR_SKILLS,
    ranger: RANGER_SKILLS,
    thief: THIEF_SKILLS,
    mage: MAGE_SPELLS,
    cleric: CLERIC_SPELLS
};
