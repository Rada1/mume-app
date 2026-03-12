/**
 * @file cleric_utility.ts
 * @description Cleric basic utility and protective spell buttons.
 */
import { CustomButton } from '../../../types';

export const CLERIC_UTILITY_SPELLS: CustomButton[] = [
    {
        "id": "cleric-armour-0",
        "label": "Armour",
        "command": "cast 'Armour'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-cure-light-1",
        "label": "Cure Light",
        "command": "cast 'Cure Light'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-create-water-2",
        "label": "Create Water",
        "command": "cast 'Create Water'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-detect-poison-3",
        "label": "Detect Poison",
        "command": "cast 'Detect Poison'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-detect-evil-4",
        "label": "Detect Evil",
        "command": "cast 'Detect Evil'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-create-food-5",
        "label": "Create Food",
        "command": "cast 'Create Food'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
