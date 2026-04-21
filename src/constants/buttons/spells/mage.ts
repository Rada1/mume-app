import { CustomButton } from '../../../types';

export const MAGE_BUTTONS: CustomButton[] = [
    {
        "id": "mag-magic-missile",
        "label": "MM",
        "command": "cast 'magic missile'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 0, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(59, 130, 246, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    }
];
