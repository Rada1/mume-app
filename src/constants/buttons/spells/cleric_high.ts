import { CustomButton } from '../../../types';

export const CLERIC_HIGH_BUTTONS: CustomButton[] = [
    {
        "id": "cle-sanctuary",
        "label": "Sanctuary",
        "command": "cast 'sanctuary'",
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
        "id": "cle-recall",
        "label": "Recall",
        "command": "cast 'word of recall'",
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
        "id": "cle-summon",
        "label": "Summon",
        "command": "cast 'summon'",
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
        "id": "cle-control-weather",
        "label": "Weather",
        "command": "cast 'control weather'",
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
        "id": "cle-earthquake",
        "label": "Earthquake",
        "command": "cast 'earthquake'",
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
        "id": "cle-flamestrike",
        "label": "Flame S",
        "command": "cast 'flamestrike'",
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
