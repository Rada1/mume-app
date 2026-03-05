/**
 * @file cleric_combat.ts
 * @description Cleric combat support and debuff spell buttons.
 */
import { CustomButton } from '../../../types';

export const CLERIC_COMBAT_SPELLS: CustomButton[] = [
    {
        "id": "cleric-smother-6",
        "label": "Smother",
        "command": "cast 'Smother' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-cure-blindness-7",
        "label": "Cure Blindness",
        "command": "cast 'Cure Blindness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-cure-serious-8",
        "label": "Cure Serious",
        "command": "cast 'Cure Serious' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-remove-poison-9",
        "label": "Remove Poison",
        "command": "cast 'Remove Poison' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-bless-10",
        "label": "Bless",
        "command": "cast 'Bless' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-blindness-11",
        "label": "Blindness",
        "command": "cast 'Blindness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
