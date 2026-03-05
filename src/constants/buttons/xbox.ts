/**
 * @file xbox.ts
 * @description Xbox layout buttons and triggers.
 */
import { CustomButton } from '../../types';

export const XBOX_BUTTONS: CustomButton[] = [
    {
        "id": "xbox-y",
        "label": "Ranger",
        "command": "ride",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": {
            "x": 84, "y": 64, "w": 50, "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#22c55e",
            "borderWidth": 2.5,
            "transparent": true,
            "curvedText": true,
            "shape": "circle"
        },
        "longActionType": "menu",
        "longCommand": "rangerskilllist",
        "swipeCommands": { "up": "ride", "down": "lead" },
        "swipeActionTypes": { "up": "command", "down": "command" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true,
        "longSwipeActionTypes": { "up": "select-assign", "down": "select-assign" },
        "longSwipeCommands": { "up": "rangerskilllist", "down": "rangerskilllist" }
    },
    {
        "id": "xbox-x",
        "label": "Cleric",
        "command": "commune 'cure light'",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": {
            "x": 74, "y": 74, "w": 50, "h": 50,
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
        "id": "xbox-b",
        "label": "Mage",
        "command": "cast 'magic missile'",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": {
            "x": 94, "y": 74, "w": 50, "h": 50,
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
