/**
 * @file warrior.ts
 * @description Warrior skill buttons.
 */
import { CustomButton } from '../../../types';

export const WARRIOR_SKILLS: CustomButton[] = [
    {
        "id": "war-bash",
        "label": "Bash",
        "command": "bash",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "war-rescue",
        "label": "Rescue",
        "command": "rescue",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 75, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "war-kick",
        "label": "Kick",
        "command": "kick",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 65, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
