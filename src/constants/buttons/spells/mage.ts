/**
 * @file mage.ts
 * @description Mage spell list buttons.
 */
import { CustomButton } from '../../../types';

export const MAGE_SPELLS: CustomButton[] = [
    {
        "id": "mage-burning-hands-0",
        "label": "Burning Hands",
        "command": "cast 'Burning Hands' target",
        "setId": "magespelllist",
        "actionType": "command",
        "display": "floating",
        "hideIfUnknown": true,
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
    // ... (This will be truncated if I put all of them here, I'll need to be careful)
    // Actually, I should probably use a script or just do it in parts if it's too big.
    // Given the 300 line rule, I should definitely split them more if needed.
    // Let's see how many buttons there are.
    // Mage spells: 36 buttons (0 to 35). Each button is about 25 lines. 36 * 25 = 900 lines.
    // ARCHITECTURE.md is strict: "No source file should exceed 300 lines".
    // So I MUST split Mage spells into multiple files.
    // e.g., mage_1.ts, mage_2.ts, mage_3.ts.
];
