/**
 * @file nearbyCombatAudio.ts
 * @description Identifies untagged attacks made by other combatants in the room.
 */

const NEARBY_IMPACT_REGEX = /\b(hit|pierce|slash|smite|crush|pound|stab|cleave|maul|strike|backstab|kick|bash|shatter|bite|sting|shoot|shock|blast|struck|burn|chill|acid|poison)(?:es|s)?\b/i;
const AVOIDANCE_REGEX = /\b(?:miss(?:es|ed)?|dodge|parry|evade|avoid|blocks?)\b/i;

// --- Logic Section ---

export interface NearbyCombatImpact {
    verb: string;
    isDirect: boolean;
}

export function getNearbyCombatImpact(
    line: string,
    ownCharacterNames: Array<string | null | undefined>
): NearbyCombatImpact | undefined {
    const cleanLine = line.replace(/^[\s*]+/, '').trim();
    if (!cleanLine || /^(?:you|your)\b/i.test(cleanLine) || AVOIDANCE_REGEX.test(cleanLine)) return undefined;

    const impact = NEARBY_IMPACT_REGEX.exec(cleanLine);
    if (!impact || impact.index < 2 || !cleanLine.slice(impact.index + impact[0].length).trim()) return undefined;
    const actionRemainder = cleanLine.slice(impact.index + impact[0].length).trim();
    if (impact[1].toLowerCase() === 'hit' && /^points?\b/i.test(actionRemainder)) return undefined;

    const actor = cleanLine.slice(0, impact.index).trim().toLowerCase();
    if (ownCharacterNames.some(name => name && actor.startsWith(name.toLowerCase()))) return undefined;

    const targetsOwnCharacter = /\b(?:you|your)\b/i.test(actionRemainder) || ownCharacterNames.some(name => {
        const escapedName = name?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return !!escapedName && new RegExp(`\\b${escapedName}\\b`, 'i').test(actionRemainder);
    });
    return { verb: impact[1].toLowerCase(), isDirect: targetsOwnCharacter };
}
