import { CustomButton } from '../../../types';

export const WARRIOR_BUTTONS: CustomButton[] = [
    {
        "id": "war-kick",
        "label": "Kick",
        "command": "kick",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 0, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "war-bash",
        "label": "Bash",
        "command": "bash",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "war-rescue",
        "label": "Rescue",
        "command": "rescue",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 170, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    },
    {
        "id": "war-engage",
        "label": "Engage",
        "command": "engage",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 255, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(185, 28, 28, 0.5)", "transparent": true, "shape": "pill", "iconScale": 1.4 },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "position": { "x": 0, "y": 0, "w": 0, "h": 0 }
    }
];
