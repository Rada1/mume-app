import { CustomButton } from '../../../types';

export const CLERIC_UTILITY_BUTTONS: CustomButton[] = [
    {
        "id": "cle-blind",
        "label": "Blind",
        "command": "cast 'blindness'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 0, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(251, 191, 36, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "cle-poison",
        "label": "Poison",
        "command": "cast 'poison'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(251, 191, 36, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "cle-sleep",
        "label": "Sleep",
        "command": "cast 'sleep'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 170, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(251, 191, 36, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "cle-remove-poison",
        "label": "Rem P",
        "command": "cast 'remove poison'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 255, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(251, 191, 36, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "cle-create-food",
        "label": "Food",
        "command": "cast 'create food'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 0, "y": 105, "w": 80, "h": 40, "backgroundColor": "rgba(251, 191, 36, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "cle-create-water",
        "label": "Water",
        "command": "cast 'create water'",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 105, "w": 80, "h": 40, "backgroundColor": "rgba(251, 191, 36, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    }
];
