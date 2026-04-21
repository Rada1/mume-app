import { CustomButton } from '../../../types';

export const RANGER_BUTTONS: CustomButton[] = [
    {
        "id": "rng-tracks",
        "label": "Tracks",
        "command": "track",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(21, 128, 61, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "rng-ride",
        "label": "Ride",
        "command": "ride",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 170, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(21, 128, 61, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "rng-nature-sense",
        "label": "Sense",
        "command": "nature sense",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 255, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(21, 128, 61, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    }
];
