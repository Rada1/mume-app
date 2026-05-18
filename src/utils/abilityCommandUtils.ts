/**
 * @file abilityCommandUtils.ts
 */

const SPELL_CLASS_KEYS = new Set(['mage', 'cleric']);
const EXIT_TARGET_ABILITIES: Record<string, string> = {
    'block door': "cast 'block door' %n|exit",
    'break door': "cast 'break door' %n|exit",
    pick: 'pick %n|exit'
};

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const toAbilityCommand = (classKey: string, abilityName: string): string => {
    const abilityKey = normalize(abilityName);
    if (EXIT_TARGET_ABILITIES[abilityKey]) return EXIT_TARGET_ABILITIES[abilityKey];
    if (SPELL_CLASS_KEYS.has(classKey)) return `cast '${abilityKey}'`;
    if (abilityKey === 'missile') return 'shoot';
    return abilityKey;
};
