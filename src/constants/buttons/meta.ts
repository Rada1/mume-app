/**
 * @file meta.ts
 * @description Meta and UI control buttons.
 */
import { CustomButton } from '../../types';

export const META_BUTTONS: CustomButton[] = [
    {
        "id": "btn-who",
        "label": "Who",
        "command": "who",
        "setId": "info",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 85, "y": 75, "w": 80, "h": 40, "backgroundColor": "#06b6d4", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "btn-where",
        "label": "Where",
        "command": "where",
        "setId": "info",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 75, "y": 75, "w": 80, "h": 40, "backgroundColor": "#06b6d4", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "6a5ofi",
        "label": "New Button",
        "command": "look",
        "setId": "player",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 50, "y": 50, "w": 120, "h": 40, "backgroundColor": "#4ade80", "transparent": false, "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": true, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "z6237j",
        "label": "Eat Food",
        "command": "eat food",
        "setId": "autoeat",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 61.9921875, "y": 22.16931216931217, "w": 120, "h": 40, "backgroundColor": "#4ade80", "transparent": false, "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": true, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "kb-reply",
        "label": "Reply",
        "command": "reply ",
        "setId": "main",
        "actionType": "preload",
        "display": "floating",
        "style": { "x": 50, "y": 80, "w": 100, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" },
        "trigger": { "enabled": true, "pattern": "says,|tells you", "isRegex": true, "autoHide": true, "duration": 10, "type": "show", "spit": true },
        "isVisible": false
    },
    {
        "id": "kb-comm",
        "label": "Communicate",
        "command": "communicate",
        "setId": "main",
        "actionType": "menu",
        "display": "floating",
        "style": { "x": 50, "y": 85, "w": 130, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" },
        "trigger": { "enabled": true, "pattern": "says,|tells you", "isRegex": true, "autoHide": true, "duration": 10, "type": "show", "spit": true, "onKeyboard": true },
        "isVisible": false
    },
    { "id": "inlp-ex", "label": "Examine", "command": "examine %n", "setId": "inlineplayer", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#2563eb", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "inlp-whois", "label": "Whois", "command": "whois %n", "setId": "inlineplayer", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#0ea5e9", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "inlp-soc", "label": "Social", "command": "social list", "setId": "inlineplayer", "actionType": "menu", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-examine", "label": "Examine", "command": "examine %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#facc15", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-get", "label": "Get", "command": "get %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#22c55e", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-kill", "label": "Kill", "command": "kill %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#dc2626", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-look", "label": "Look", "command": "look %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#3b82f6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-clear", "label": "Clear Target", "command": "__clear_target__", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 110, "h": 40, "backgroundColor": "rgba(100,100,100,0.6)", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "innpc-kill", "label": "Kill", "command": "kill %n", "setId": "inlinenpc", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#dc2626", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "innpc-ex", "label": "Examine", "command": "examine %n", "setId": "inlinenpc", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#2563eb", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "innpc-look", "label": "Look", "command": "look %n", "setId": "inlinenpc", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#0ea5e9", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "innpc-steal", "label": "Steal", "command": "steal %n", "setId": "inlinenpc", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#14b8a6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true }
];
