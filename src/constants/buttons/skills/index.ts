import { RANGER_BUTTONS } from './ranger';
import { THIEF_BUTTONS } from './thief';
import { WARRIOR_BUTTONS } from './warrior';

export { RANGER_BUTTONS, THIEF_BUTTONS, WARRIOR_BUTTONS };

export const ALL_SKILLS = [
    ...RANGER_BUTTONS,
    ...THIEF_BUTTONS,
    ...WARRIOR_BUTTONS
];

// Compatibility aliases
export const RANGER_SKILLS = RANGER_BUTTONS;
export const THIEF_SKILLS = THIEF_BUTTONS;
export const WARRIOR_SKILLS = WARRIOR_BUTTONS;
