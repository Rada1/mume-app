import { CustomButton } from '../../../types';

export const CLERIC_COMBAT_BUTTONS: CustomButton[] = [
    {
        "id": "cle-harm",
        "label": "Heal/Harm",
        "command": "cast 'harm'",
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
        "id": "cle-cause-light",
        "label": "Cause L",
        "command": "cast 'cause light'",
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
        "id": "cle-cause-serious",
        "label": "Cause S",
        "command": "cast 'cause serious'",
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
        "id": "cle-cause-critic",
        "label": "Cause C",
        "command": "cast 'cause critic'",
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
        "id": "cle-dispel-evil",
        "label": "Dispel E",
        "command": "cast 'dispel evil'",
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
        "id": "cle-dispel-good",
        "label": "Dispel G",
        "command": "cast 'dispel good'",
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
