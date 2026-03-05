/**
 * @file index.ts
 * @description Re-exports for all skill buttons.
 */
import { CustomButton } from '../../../types';
import { THIEF_SKILLS } from './thief';
import { WARRIOR_SKILLS } from './warrior';
import { RANGER_SKILLS } from './ranger';

export const SKILL_BUTTONS: CustomButton[] = [
    ...THIEF_SKILLS,
    ...WARRIOR_SKILLS,
    ...RANGER_SKILLS
];
