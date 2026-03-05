/**
 * @file mage_attack.ts
 * @description Mage offensive spell buttons.
 */
import { CustomButton } from '../../../types';

export const MAGE_ATTACK_SPELLS: CustomButton[] = [
    {
        "id": "mage-burning-hands-0",
        "label": "Burning Hands",
        "command": "cast 'Burning Hands' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-call-lightning-1",
        "label": "Call Lightning",
        "command": "cast 'Call Lightning' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-chill-touch-2",
        "label": "Chill Touch",
        "command": "cast 'Chill Touch' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-colour-spray-3",
        "label": "Colour Spray",
        "command": "cast 'Colour Spray' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-earthquake-4",
        "label": "Earthquake",
        "command": "cast 'Earthquake' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-dispel-magic-5",
        "label": "Dispel Magic",
        "command": "cast 'Dispel Magic' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 10, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-fireball-6",
        "label": "Fireball",
        "command": "cast 'Fireball' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-lightning-bolt-7",
        "label": "Lightning Bolt",
        "command": "cast 'Lightning Bolt' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-magic-blast-8",
        "label": "Magic Blast",
        "command": "cast 'Magic Blast' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-magic-missile-9",
        "label": "Magic Missile",
        "command": "cast 'Magic Missile' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-shocking-grasp-10",
        "label": "Shocking Grasp",
        "command": "cast 'Shocking Grasp' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 18, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
