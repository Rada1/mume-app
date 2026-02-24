import { CustomButton } from '../types';

export const DEFAULT_UI_POSITIONS = {
    joystick: { x: undefined, y: undefined, scale: 1 },
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
        "id": "8e04ek",
        "label": "X",
        "command": "look",
        "setId": "Combat",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 68.1640625,
            "y": 69.25925925925927,
            "w": 49,
            "h": 20,
            "backgroundColor": "rgba(255, 255, 255, 0.1)",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": true,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true,
        "longActionType": "assign",
        "longCommand": "magespelllist"
    },
    {
        "id": "b6rd5",
        "label": "Y",
        "command": "look",
        "setId": "Combat",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 71.171875,
            "y": 64.81481481481482,
            "w": 45,
            "h": 20,
            "backgroundColor": "rgba(255, 255, 255, 0.1)",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": true,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true,
        "longActionType": "assign",
        "longCommand": "clericspelllist",
        "swipeActionTypes": {
            "up": "assign"
        }
    },
    {
        "id": "xv1ycf",
        "label": "B",
        "command": "look",
        "setId": "Combat",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 67.109375,
            "y": 78.25396825396825,
            "w": 48,
            "h": 20,
            "backgroundColor": "rgba(255, 255, 255, 0.1)",
            "transparent": true,
            "shape": "circle"
        },
        "trigger": {
            "enabled": false,
            "pattern": "",
            "isRegex": false,
            "autoHide": true,
            "duration": 0,
            "type": "show"
        },
        "isVisible": true,
        "longActionType": "assign",
        "longCommand": "warriorskilllist"
    },
    {
        "id": "0hiqdj",
        "label": "A",
        "command": "kill target",
        "setId": "Combat",
        "actionType": "command",
        "display": "floating",
        "style": {
            "x": 70.078125,
            "y": 72.96296296296298,
            "w": 90,
            "h": 20,
            "backgroundColor": "rgba(255, 255, 255, 0.1)",
            "transparent": true,
            "shape": "circle"
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
    }
];
