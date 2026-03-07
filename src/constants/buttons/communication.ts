/**
 * @file communication.ts
 * @description Communication and social interaction buttons.
 */
import { CustomButton } from '../../types';

export const COMMUNICATION_BUTTONS: CustomButton[] = [
    { "id": "comm-say", "label": "Say", "command": "say", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-yell", "label": "Yell", "command": "yell", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#dc2626", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-narrate", "label": "Narrate", "command": "narrate", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#2563eb", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-pray", "label": "Pray", "command": "pray", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#eab308", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-tell", "label": "Tell", "command": "tell", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#64748b", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-whisper", "label": "Whisper", "command": "whisper", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#14b8a6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-social", "label": "Social", "command": "social list", "setId": "communicate", "actionType": "menu", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true }
];
