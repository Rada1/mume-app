/** @file friendlyTargetCommand.ts — Beneficial abilities require explicit recipient selection. */
import type { CustomButton } from '../types';
import { INLINE_ABILITY_FAMILIES } from './inlineAbilityActions';
import { commandTreeSpellName } from './commandTreeIdentity';
// --- Ability Classification Section ---
const friendlyNames = [...Object.values(INLINE_ABILITY_FAMILIES.buffs).flat(),
    ...Object.values(INLINE_ABILITY_FAMILIES.healing).flat(), ...Object.values(INLINE_ABILITY_FAMILIES.support).flat(),
    'protect', 'detect poison', 'cure critical'].map(name => name.toLowerCase());
export function isFriendlyTargetCommand(button: CustomButton): boolean {
    if (/^trait-(buffs|healing|support)$/.test(button.setId)) return true;
    const name = commandTreeSpellName(button) || button.command.trim().toLowerCase()
        .replace(/^(?:cast|c|commune|skill)\s+/, '').replace(/["']/g, '').replace(/\barmor\b/g, 'armour');
    return friendlyNames.some(ability => name === ability || name.startsWith(`${ability} `));
}
