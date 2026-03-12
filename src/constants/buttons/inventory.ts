/**
 * @file inventory.ts
 * @description Inventory and equipment manipulation buttons.
 */
import { CustomButton } from '../../types';

export const INVENTORY_BUTTONS: CustomButton[] = [
    {
        "id": "inv-drop",
        "label": "Drop",
        "command": "drop %n",
        "setId": "inventorylist",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 0, "h": 0, "backgroundColor": "#ff4444", "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "inv-wear",
        "label": "Wear",
        "command": "wear %n",
        "setId": "inventorylist",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 0, "h": 0, "backgroundColor": "#44ff44", "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "inv-put",
        "label": "Put Target",
        "command": "put %n",
        "setId": "inventorylist",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 0, "h": 0, "backgroundColor": "#4444ff", "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "inv-hold",
        "label": "Hold",
        "command": "hold %n",
        "setId": "inventorylist",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 0, "h": 0, "backgroundColor": "#ffff44", "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "inv-give",
        "label": "Give",
        "command": "give %n",
        "setId": "inventorylist",
        "actionType": "select-recipient",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 0, "h": 0, "backgroundColor": "#aa44ff", "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "eq-remove",
        "label": "Remove",
        "command": "remove %n",
        "setId": "equipmentlist",
        "actionType": "command",
        "display": "floating",
        "style": { "x": 0, "y": 0, "w": 0, "h": 0, "backgroundColor": "#ffaa44", "shape": "rect" },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
