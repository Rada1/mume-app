/**
 * @file mage_utility.ts
 * @description Mage utility and protective spell buttons.
 */
import { CustomButton } from '../../../types';

export const MAGE_UTILITY_SPELLS: CustomButton[] = [
    {
        "id": "mage-charm-11",
        "label": "Charm",
        "command": "cast 'Charm' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-silence-12",
        "label": "Silence",
        "command": "cast 'Silence' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-sleep-13",
        "label": "Sleep",
        "command": "cast 'Sleep' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-ventriloquate-14",
        "label": "Ventriloquate",
        "command": "cast 'Ventriloquate' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-call-familiar-15",
        "label": "Call Familiar",
        "command": "cast 'Call Familiar' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-block-door-16",
        "label": "Block Door",
        "command": "cast 'Block Door' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-control-weather-17",
        "label": "Control Weather",
        "command": "cast 'Control Weather' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 26, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-create-light-18",
        "label": "Create Light",
        "command": "cast 'Create Light' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-enchant-19",
        "label": "Enchant",
        "command": "cast 'Enchant' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-night-vision-20",
        "label": "Night Vision",
        "command": "cast 'Night Vision' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-store-21",
        "label": "Store",
        "command": "cast 'Store' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-armour-22",
        "label": "Armour",
        "command": "cast 'Armour' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-shield-23",
        "label": "Shield",
        "command": "cast 'Shield' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 34, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
