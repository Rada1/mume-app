import { CustomButton, ButtonSetSettings } from '../../types';
import { DEFAULT_UI_POSITIONS } from './default_ui';
import { META_BUTTONS } from './meta';
import { XBOX_BUTTONS } from './xbox';
import { SPELL_BUTTONS } from './spells';
import { SKILL_BUTTONS } from './skills';
import { INVENTORY_BUTTONS } from './inventory';
import { COMMUNICATION_BUTTONS } from './communication';
import { SOCIAL_BUTTONS } from './socials';
import { DOOR_BUTTONS } from './doors';

export { DEFAULT_UI_POSITIONS };

export const DEFAULT_BUTTONS: CustomButton[] = [
    ...META_BUTTONS,
    ...XBOX_BUTTONS,
    ...SPELL_BUTTONS,
    ...SKILL_BUTTONS,
    ...INVENTORY_BUTTONS,
    ...COMMUNICATION_BUTTONS,
    ...SOCIAL_BUTTONS,
    ...DOOR_BUTTONS
];

export const DEFAULT_SET_SETTINGS: Record<string, ButtonSetSettings> = {
    warrior: { themeColor: '#ef4444' },
    warriorskilllist: { themeColor: '#ef4444' },
    ranger: { themeColor: '#22c55e' },
    rangerskilllist: { themeColor: '#22c55e' },
    cleric: { themeColor: '#fbbf24' },
    clericspelllist: { themeColor: '#fbbf24' },
    mage: { themeColor: '#3b82f6' },
    magespelllist: { themeColor: '#3b82f6' },
    thief: { themeColor: '#94a3b8' },
    thiefskilllist: { themeColor: '#94a3b8' },
    doors: { themeColor: '#78350f' },
};
