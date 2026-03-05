/**
 * @file xbox.ts
 * @description Xbox layout buttons and triggers.
 */
import { CustomButton } from '../../types';

export const XBOX_BUTTONS: CustomButton[] = [
    {
        "id": "xbox-y",
        "label": "Cleric",
        "command": "commune 'cure light'",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": {
            "x": 84, "y": 64, "w": 50, "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#fbbf24",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "longActionType": "menu",
        "longCommand": "clericspelllist",
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "longSwipeActionTypes": { "up": "select-assign", "down": "select-assign" },
        "longSwipeCommands": { "up": "clericspelllist", "down": "clericspelllist" }
    },
    {
        "id": "xbox-x",
        "label": "Mage",
        "command": "cast 'magic missile'",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": {
            "x": 74, "y": 74, "w": 50, "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#3b82f6",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "longActionType": "menu",
        "longCommand": "magespelllist",
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "longSwipeActionTypes": { "up": "select-assign", "down": "select-assign" },
        "longSwipeCommands": { "up": "magespelllist", "down": "magespelllist" }
    },
    {
        "id": "xbox-b",
        "label": "Ranger",
        "command": "ride",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "icon": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Cpath d='M12 2A7 7 0 0 0 5 9c0 2.5 1 4.5 3 6v4l4 2 4-2v-4c2-1.5 3-3.5 3-6a7 7 0 0 0-7-7zm0 2a5 5 0 0 1 5 5c0 1.9-.8 3.5-2.2 4.6l-.8-.6V9A2 2 0 0 0 12 7a2 2 0 0 0-2 2v4l-.8.6A5.8 5.8 0 0 1 7 9a5 5 0 0 1 5-5z'/%3E%3C/svg%3E",
        "style": {
            "x": 94, "y": 74, "w": 50, "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#22c55e",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "longActionType": "menu",
        "longCommand": "rangerskilllist",
        "swipeCommands": {
            "up": "ride",
            "down": "lead"
        },
        "swipeActionTypes": {
            "up": "command",
            "down": "command"
        },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "longSwipeActionTypes": { "up": "select-assign", "down": "select-assign" },
        "longSwipeCommands": { "up": "rangerskilllist", "down": "rangerskilllist" }
    },
    {
        "id": "xbox-a",
        "label": "Thief",
        "command": "backstab",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": {
            "x": 84, "y": 84, "w": 50, "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#94a3b8",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "longActionType": "menu",
        "longCommand": "thiefskilllist",
        "swipeCommands": {
            "up": "shoot",
            "down": "recover"
        },
        "swipeActionTypes": {
            "up": "command",
            "down": "command"
        },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "longSwipeActionTypes": { "up": "select-assign", "down": "select-assign" },
        "longSwipeCommands": { "up": "thiefskilllist", "down": "thiefskilllist" }
    },
    {
        "id": "xbox-z",
        "label": "Warrior",
        "command": "hit target",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": false,
        "style": {
            "x": 84, "y": 74, "w": 50, "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#ef4444",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "swipeCommands": {
            "down": "flee"
        },
        "swipeActionTypes": {
            "down": "command"
        },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "longActionType": "menu",
        "longCommand": "warriorskilllist",
        "longSwipeActionTypes": { "up": "select-assign", "down": "select-assign" },
        "longSwipeCommands": { "up": "warriorskilllist", "down": "warriorskilllist" }
    },
    {
        "id": "xbox-door",
        "label": "Door",
        "command": "doors",
        "setId": "Xbox",
        "actionType": "menu",
        "display": "floating",
        "hideIfUnknown": false,
        "style": {
            "x": 65, "y": 64, "w": 40, "h": 40,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#78350f",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "swipeCommands": {
            "up": "open exit",
            "down": "close exit",
            "right": "lock exit",
            "left": "lock exit"
        },
        "swipeActionTypes": {
            "up": "command",
            "down": "command",
            "right": "command",
            "left": "command"
        }
    }
];
