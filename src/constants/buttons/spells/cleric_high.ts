/**
 * @file cleric_high.ts
 * @description Cleric high-level and situational spell buttons.
 */
import { CustomButton } from '../../../types';

export const CLERIC_HIGH_SPELLS: CustomButton[] = [
    {
        "id": "cleric-transfer-18",
        "label": "Transfer",
        "command": "cast 'Transfer'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-darkness-19",
        "label": "Darkness",
        "command": "cast 'Darkness'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-sanctuary-20",
        "label": "Sanctuary",
        "command": "cast 'Sanctuary'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-summon-21",
        "label": "Summon",
        "command": "cast 'Summon'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-hammer-of-faith-22",
        "label": "Hammer of Faith",
        "command": "cast 'Hammer of Faith'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "cleric-dispel-evil-23",
        "label": "Dispel Evil",
        "command": "cast 'Dispel Evil'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(180, 160, 50, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
