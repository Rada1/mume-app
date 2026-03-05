/**
 * @file index.ts
 * @description Re-exports for all spell buttons.
 */
import { CustomButton } from '../../../types';
import { MAGE_ATTACK_SPELLS } from './mage_attack';
import { MAGE_UTILITY_SPELLS } from './mage_utility';
import { MAGE_INTEL_SPELLS } from './mage_intel';
import { CLERIC_UTILITY_SPELLS } from './cleric_utility';
import { CLERIC_COMBAT_SPELLS } from './cleric_combat';
import { CLERIC_BUFF_SPELLS } from './cleric_buff';
import { CLERIC_HIGH_SPELLS } from './cleric_high';

export const SPELL_BUTTONS: CustomButton[] = [
    ...MAGE_ATTACK_SPELLS,
    ...MAGE_UTILITY_SPELLS,
    ...MAGE_INTEL_SPELLS,
    ...CLERIC_UTILITY_SPELLS,
    ...CLERIC_COMBAT_SPELLS,
    ...CLERIC_BUFF_SPELLS,
    ...CLERIC_HIGH_SPELLS
];
