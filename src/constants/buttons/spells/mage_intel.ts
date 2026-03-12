/**
 * @file mage_intel.ts
 * @description Mage information gathering and travel spell buttons.
 */
import { CustomButton } from '../../../types';

export const MAGE_INTEL_SPELLS: CustomButton[] = [
    {
        "id": "mage-shroud-24",
        "label": "Shroud",
        "command": "cast 'Shroud'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 42, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-detect-invisibility-25",
        "label": "Detect Invisibility",
        "command": "cast 'Detect Invisibility'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 42, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-detect-magic-26",
        "label": "Detect Magic",
        "command": "cast 'Detect Magic'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 42, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-locate-27",
        "label": "Locate",
        "command": "cast 'Locate'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 42, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-locate-life-28",
        "label": "Locate Life",
        "command": "cast 'Locate Life'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 42, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-locate-magic-29",
        "label": "Locate Magic",
        "command": "cast 'Locate Magic'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 42, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-identify-30",
        "label": "Identify",
        "command": "cast 'Identify'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 5, "y": 50, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-find-the-path-31",
        "label": "Find the Path",
        "command": "cast 'Find the Path'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 21, "y": 50, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-teleport-32",
        "label": "Teleport",
        "command": "cast 'Teleport'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 37, "y": 50, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-portal-33",
        "label": "Portal",
        "command": "cast 'Portal'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 53, "y": 50, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-scry-34",
        "label": "Scry",
        "command": "cast 'Scry'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 69, "y": 50, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    },
    {
        "id": "mage-watch-room-35",
        "label": "Watch Room",
        "command": "cast 'Watch Room'",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
        "style": { "x": 85, "y": 50, "w": 120, "h": 40, "backgroundColor": "rgba(100, 50, 180, 0.6)", "shape": "pill", "transparent": false },
        "trigger": { "enabled": false, "pattern": "", "isRegex": false, "autoHide": false, "duration": 0, "type": "show" },
        "isVisible": true
    }
];
