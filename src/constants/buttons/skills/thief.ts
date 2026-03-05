/**
 * @file thief.ts
 * @description Thief skill buttons.
 */
import { CustomButton } from '../../../types';

export const THIEF_SKILLS: CustomButton[] = [
    {
        "id": "thief-backstab",
        "label": "Backstab",
        "command": "backstab",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-escape",
        "label": "Escape",
        "command": "escape",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 75, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-hide",
        "label": "Hide",
        "command": "hide",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 65, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-missile",
        "label": "Missile",
        "command": "shoot",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 55, "y": 60, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-pick",
        "label": "Pick",
        "command": "pick",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 65, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-search",
        "label": "Search",
        "command": "search",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 75, "y": 65, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-sneak",
        "label": "Sneak",
        "command": "sneak",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 65, "y": 65, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "thief-steal",
        "label": "Steal",
        "command": "steal",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 55, "y": 65, "w": 80, "h": 40, "backgroundColor": "rgba(55, 65, 81, 0.5)", "transparent": true, "shape": "pill" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
