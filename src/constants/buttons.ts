import { CustomButton } from '../types';

export const DEFAULT_UI_POSITIONS = {
    joystick: { x: undefined, y: undefined, scale: 1 },
    xbox: { x: undefined, y: undefined, scale: 1 },
    stats: { x: undefined, y: undefined, scale: 1 },
    mapper: { x: undefined, y: 75, w: 320, h: 320, scale: 1 }
};

export const DEFAULT_BUTTONS: CustomButton[] = [
    {
        "id": "btn-who",
        "label": "Who",
        "command": "who",
        "setId": "info",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 75,
            "w": 80,
            "h": 40,
            "backgroundColor": "#06b6d4",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "btn-where",
        "label": "Where",
        "command": "where",
        "setId": "info",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 75,
            "y": 75,
            "w": 80,
            "h": 40,
            "backgroundColor": "#06b6d4",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "6a5ofi",
        "label": "New Button",
        "command": "look",
        "setId": "player",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 50,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "#4ade80",
            "transparent": false,
            "shape": "rect"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": true,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "z6237j",
        "label": "Eat Food",
        "command": "eat food",
        "setId": "autoeat",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 61.9921875,
            "y": 22.16931216931217,
            "w": 120,
            "h": 40,
            "backgroundColor": "#4ade80",
            "transparent": false,
            "shape": "rect"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": true,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "xbox-y",
        "label": "Y",
        "command": "score",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 84,
            "y": 66,
            "w": 50,
            "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#fbbf24",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "xbox-x",
        "label": "X",
        "command": "look",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 76,
            "y": 74,
            "w": 50,
            "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#3b82f6",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "xbox-b",
        "label": "B",
        "command": "inventory",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 92,
            "y": 74,
            "w": 50,
            "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#ef4444",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "xbox-a",
        "label": "A",
        "command": "kill target",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 84,
            "y": 82,
            "w": 50,
            "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#22c55e",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "xbox-z",
        "label": "Z",
        "command": "look",
        "setId": "Xbox",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 84,
            "y": 74,
            "w": 50,
            "h": 50,
            "backgroundColor": "rgba(255, 255, 255, 0.05)",
            "borderColor": "#ffffff",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-burning-hands-0",
        "label": "Burning Hands",
        "command": "cast 'Burning Hands' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-call-lightning-1",
        "label": "Call Lightning",
        "command": "cast 'Call Lightning' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-chill-touch-2",
        "label": "Chill Touch",
        "command": "cast 'Chill Touch' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-colour-spray-3",
        "label": "Colour Spray",
        "command": "cast 'Colour Spray' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-earthquake-4",
        "label": "Earthquake",
        "command": "cast 'Earthquake' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-dispel-magic-5",
        "label": "Dispel Magic",
        "command": "cast 'Dispel Magic' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-fireball-6",
        "label": "Fireball",
        "command": "cast 'Fireball' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-lightning-bolt-7",
        "label": "Lightning Bolt",
        "command": "cast 'Lightning Bolt' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-magic-blast-8",
        "label": "Magic Blast",
        "command": "cast 'Magic Blast' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-magic-missile-9",
        "label": "Magic Missile",
        "command": "cast 'Magic Missile' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-shocking-grasp-10",
        "label": "Shocking Grasp",
        "command": "cast 'Shocking Grasp' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-charm-11",
        "label": "Charm",
        "command": "cast 'Charm' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-silence-12",
        "label": "Silence",
        "command": "cast 'Silence' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-sleep-13",
        "label": "Sleep",
        "command": "cast 'Sleep' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-ventriloquate-14",
        "label": "Ventriloquate",
        "command": "cast 'Ventriloquate' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-call-familiar-15",
        "label": "Call Familiar",
        "command": "cast 'Call Familiar' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-block-door-16",
        "label": "Block Door",
        "command": "cast 'Block Door' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-control-weather-17",
        "label": "Control Weather",
        "command": "cast 'Control Weather' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-create-light-18",
        "label": "Create Light",
        "command": "cast 'Create Light' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-enchant-19",
        "label": "Enchant",
        "command": "cast 'Enchant' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-night-vision-20",
        "label": "Night Vision",
        "command": "cast 'Night Vision' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-store-21",
        "label": "Store",
        "command": "cast 'Store' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-armour-22",
        "label": "Armour",
        "command": "cast 'Armour' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-shield-23",
        "label": "Shield",
        "command": "cast 'Shield' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-shroud-24",
        "label": "Shroud",
        "command": "cast 'Shroud' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 42,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-detect-invisibility-25",
        "label": "Detect Invisibility",
        "command": "cast 'Detect Invisibility' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 42,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-detect-magic-26",
        "label": "Detect Magic",
        "command": "cast 'Detect Magic' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 42,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-locate-27",
        "label": "Locate",
        "command": "cast 'Locate' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 42,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-locate-life-28",
        "label": "Locate Life",
        "command": "cast 'Locate Life' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 42,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-locate-magic-29",
        "label": "Locate Magic",
        "command": "cast 'Locate Magic' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 42,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-identify-30",
        "label": "Identify",
        "command": "cast 'Identify' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-find-the-path-31",
        "label": "Find the Path",
        "command": "cast 'Find the Path' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-teleport-32",
        "label": "Teleport",
        "command": "cast 'Teleport' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-portal-33",
        "label": "Portal",
        "command": "cast 'Portal' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-scry-34",
        "label": "Scry",
        "command": "cast 'Scry' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "mage-watch-room-35",
        "label": "Watch Room",
        "command": "cast 'Watch Room' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 50,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(100, 50, 180, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-armour-0",
        "label": "Armour",
        "command": "cast 'Armour' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-cure-light-1",
        "label": "Cure Light",
        "command": "cast 'Cure Light' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-create-water-2",
        "label": "Create Water",
        "command": "cast 'Create Water' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-detect-poison-3",
        "label": "Detect Poison",
        "command": "cast 'Detect Poison' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-detect-evil-4",
        "label": "Detect Evil",
        "command": "cast 'Detect Evil' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-create-food-5",
        "label": "Create Food",
        "command": "cast 'Create Food' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 10,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-smother-6",
        "label": "Smother",
        "command": "cast 'Smother' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-cure-blindness-7",
        "label": "Cure Blindness",
        "command": "cast 'Cure Blindness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-cure-serious-8",
        "label": "Cure Serious",
        "command": "cast 'Cure Serious' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-remove-poison-9",
        "label": "Remove Poison",
        "command": "cast 'Remove Poison' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-bless-10",
        "label": "Bless",
        "command": "cast 'Bless' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-blindness-11",
        "label": "Blindness",
        "command": "cast 'Blindness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 18,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-strength-12",
        "label": "Strength",
        "command": "cast 'Strength' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-sense-life-13",
        "label": "Sense Life",
        "command": "cast 'Sense Life' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-heal-14",
        "label": "Heal",
        "command": "cast 'Heal' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-cure-critical-15",
        "label": "Cure Critical",
        "command": "cast 'Cure Critical' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-breath-of-briskness-16",
        "label": "Breath of Briskness",
        "command": "cast 'Breath of Briskness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-fear-17",
        "label": "Fear",
        "command": "cast 'Fear' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 26,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-transfer-18",
        "label": "Transfer",
        "command": "cast 'Transfer' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 5,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-darkness-19",
        "label": "Darkness",
        "command": "cast 'Darkness' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 21,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-sanctuary-20",
        "label": "Sanctuary",
        "command": "cast 'Sanctuary' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 37,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-summon-21",
        "label": "Summon",
        "command": "cast 'Summon' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 53,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-hammer-of-faith-22",
        "label": "Hammer of Faith",
        "command": "cast 'Hammer of Faith' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 69,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "cleric-dispel-evil-23",
        "label": "Dispel Evil",
        "command": "cast 'Dispel Evil' target",
        "setId": "clericspelllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 34,
            "w": 120,
            "h": 40,
            "backgroundColor": "rgba(180, 160, 50, 0.6)",
            "shape": "pill",
            "transparent": false
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-backstab",
        "label": "Backstab",
        "command": "backstab",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-escape",
        "label": "Escape",
        "command": "escape",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 75,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-hide",
        "label": "Hide",
        "command": "hide",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 65,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-missile",
        "label": "Missile",
        "command": "shoot",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 55,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-pick",
        "label": "Pick",
        "command": "pick",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 65,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-search",
        "label": "Search",
        "command": "search",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 75,
            "y": 65,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-sneak",
        "label": "Sneak",
        "command": "sneak",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 65,
            "y": 65,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "thief-steal",
        "label": "Steal",
        "command": "steal",
        "setId": "thiefskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 55,
            "y": 65,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(55, 65, 81, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "war-bash",
        "label": "Bash",
        "command": "bash",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(185, 28, 28, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "war-rescue",
        "label": "Rescue",
        "command": "rescue",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 75,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(185, 28, 28, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "war-kick",
        "label": "Kick",
        "command": "kick",
        "setId": "warriorskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 65,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(185, 28, 28, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "rng-bandage",
        "label": "Bandage",
        "command": "bandage",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 85,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(21, 128, 61, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "rng-ride",
        "label": "Ride",
        "command": "ride",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 75,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(21, 128, 61, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
    {
        "id": "rng-track",
        "label": "Track",
        "command": "track",
        "setId": "rangerskilllist",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 65,
            "y": 60,
            "w": 80,
            "h": 40,
            "backgroundColor": "rgba(21, 128, 61, 0.5)",
            "transparent": true,
            "shape": "pill"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": false,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true
    },
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
        "command": "put %n target",
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
    },
    {
        "id": "kb-comm",
        "label": "Communicate",
        "command": "communicate",
        "setId": "main",
        "actionType": "menu",
        "display": "floating",
        "style": { "x": 50, "y": 85, "w": 130, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" },
        "trigger": { "enabled": true, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show", "onKeyboard": true },
        "isVisible": false
    },
    { "id": "comm-say", "label": "Say", "command": "say", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-yell", "label": "Yell", "command": "yell", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#dc2626", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-narrate", "label": "Narrate", "command": "narrate", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#2563eb", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-pray", "label": "Pray", "command": "pray", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#eab308", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-tell", "label": "Tell", "command": "tell", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#64748b", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "comm-whisper", "label": "Whisper", "command": "whisper", "setId": "communicate", "actionType": "preload", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#14b8a6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },

    { "id": "inlp-ex", "label": "Examine", "command": "examine %n", "setId": "inlineplayer", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#2563eb", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "inlp-whois", "label": "Whois", "command": "whois %n", "setId": "inlineplayer", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#0ea5e9", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "inlp-soc", "label": "Social", "command": "social list", "setId": "inlineplayer", "actionType": "menu", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },

    { "id": "soc-accuse", "label": "Accuse", "command": "accuse %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-apologize", "label": "Apologize", "command": "apologize %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-applaud", "label": "Applaud", "command": "applaud %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-beg", "label": "Beg", "command": "beg %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-blush", "label": "Blush", "command": "blush", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-bounce", "label": "Bounce", "command": "bounce", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-bow", "label": "Bow", "command": "bow %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-burp", "label": "Burp", "command": "burp", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-cackle", "label": "Cackle", "command": "cackle", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-chuckle", "label": "Chuckle", "command": "chuckle", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-clap", "label": "Clap", "command": "clap %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-comfort", "label": "Comfort", "command": "comfort %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-cough", "label": "Cough", "command": "cough", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-curtsey", "label": "Curtsey", "command": "curtsey %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-dance", "label": "Dance", "command": "dance %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-frown", "label": "Frown", "command": "frown %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-gasp", "label": "Gasp", "command": "gasp", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-giggle", "label": "Giggle", "command": "giggle", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-glare", "label": "Glare", "command": "glare %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-grin", "label": "Grin", "command": "grin %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-hiccup", "label": "Hiccup", "command": "hiccup", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-hug", "label": "Hug", "command": "hug %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-hum", "label": "Hum", "command": "hum", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-kiss", "label": "Kiss", "command": "kiss %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-laugh", "label": "Laugh", "command": "laugh", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-lick", "label": "Lick", "command": "lick %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-love", "label": "Love", "command": "love %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-moan", "label": "Moan", "command": "moan", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-mumble", "label": "Mumble", "command": "mumble", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-no", "label": "No", "command": "no", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-nod", "label": "Nod", "command": "nod %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-poke", "label": "Poke", "command": "poke %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-ponder", "label": "Ponder", "command": "ponder", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-pout", "label": "Pout", "command": "pout", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-purr", "label": "Purr", "command": "purr", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-ruffle", "label": "Ruffle", "command": "ruffle %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-shiver", "label": "Shiver", "command": "shiver", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-shrug", "label": "Shrug", "command": "shrug", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-sigh", "label": "Sigh", "command": "sigh", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-slap", "label": "Slap", "command": "slap %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-smile", "label": "Smile", "command": "smile %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-smirk", "label": "Smirk", "command": "smirk %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-snap", "label": "Snap", "command": "snap", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-sneeze", "label": "Sneeze", "command": "sneeze", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-snicker", "label": "Snicker", "command": "snicker", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-sniff", "label": "Sniff", "command": "sniff", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-snore", "label": "Snore", "command": "snore", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-spit", "label": "Spit", "command": "spit %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-stare", "label": "Stare", "command": "stare %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-strut", "label": "Strut", "command": "strut", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-thank", "label": "Thank", "command": "thank %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-think", "label": "Think", "command": "think", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-tickle", "label": "Tickle", "command": "tickle %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-wave", "label": "Wave", "command": "wave %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-wink", "label": "Wink", "command": "wink %n", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-yawn", "label": "Yawn", "command": "yawn", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "soc-yes", "label": "Yes", "command": "yes", "setId": "social list", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 90, "h": 40, "backgroundColor": "#8b5cf6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },

    { "id": "tgt-examine", "label": "Examine", "command": "examine %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#facc15", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-get", "label": "Get", "command": "get %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#22c55e", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-kill", "label": "Kill", "command": "kill %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#dc2626", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-look", "label": "Look", "command": "look %n", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 100, "h": 40, "backgroundColor": "#3b82f6", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true },
    { "id": "tgt-clear", "label": "Clear Target", "command": "__clear_target__", "setId": "target", "actionType": "command", "display": "floating", "style": { "x": 0, "y": 0, "w": 110, "h": 40, "backgroundColor": "rgba(100,100,100,0.6)", "shape": "pill" }, "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0 }, "isVisible": true }
];
