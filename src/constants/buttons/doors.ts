import { CustomButton } from '../../types';

export const DOOR_BUTTONS: CustomButton[] = [
    {
        "id": "door-open",
        "label": "Open",
        "command": "open exit",
        "setId": "doors",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 50, "h": 50, "backgroundColor": "#78350f", "shape": "circle", "curvedText": true },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "door-close",
        "label": "Close",
        "command": "close exit",
        "setId": "doors",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 50, "h": 50, "backgroundColor": "#78350f", "shape": "circle", "curvedText": true },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "door-lock",
        "label": "Lock",
        "command": "lock exit",
        "setId": "doors",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 50, "h": 50, "backgroundColor": "#78350f", "shape": "circle", "curvedText": true },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "door-unlock",
        "label": "Unlock",
        "command": "unlock exit",
        "setId": "doors",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 50, "h": 50, "backgroundColor": "#78350f", "shape": "circle", "curvedText": true },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "door-pick",
        "label": "Pick",
        "command": "pick exit",
        "setId": "doors",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 50, "h": 50, "backgroundColor": "#78350f", "shape": "circle", "curvedText": true },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "door-scout",
        "label": "Scout",
        "command": "scout",
        "setId": "doors",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 50, "h": 50, "backgroundColor": "#78350f", "shape": "circle", "curvedText": true },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
