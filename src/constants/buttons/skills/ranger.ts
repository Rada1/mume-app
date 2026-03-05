/**
 * @file ranger.ts
 * @description Ranger skill buttons.
 */
import { CustomButton } from '../../../types';

export const RANGER_SKILLS: CustomButton[] = [
    {
        "id": "rng-bandage",
        "label": "Bandage",
        "command": "bandage",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(21, 128, 61, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "rng-ride",
        "label": "Ride",
        "command": "ride",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 75, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(21, 128, 61, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "rng-track",
        "label": "Track",
        "command": "track",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 65, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(21, 128, 61, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
