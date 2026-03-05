/**
 * @file cleric_buff.ts
 * @description Cleric enhancement and healing spell buttons.
 */
import { CustomButton } from '../../../types';

export const CLERIC_BUFF_SPELLS: CustomButton[] = [
    {
        "id": "cleric-strength-12",
        "label": "Strength",
        "command": "cast 'Strength' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-sense-life-13",
        "label": "Sense Life",
        "command": "cast 'Sense Life' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-heal-14",
        "label": "Heal",
        "command": "cast 'Heal' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-cure-critical-15",
        "label": "Cure Critical",
        "command": "cast 'Cure Critical' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-breath-of-briskness-16",
        "label": "Breath of Briskness",
        "command": "cast 'Breath of Briskness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-fear-17",
        "label": "Fear",
        "command": "cast 'Fear' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
