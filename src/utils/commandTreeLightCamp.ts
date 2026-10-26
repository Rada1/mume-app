/** @file commandTreeLightCamp.ts — Canonical light and camp item actions for the command tree. */
import { WORLD_BUTTONS } from '../constants/buttons/inline/world';
import type { DrawerLine } from '../types';

// --- Light and Camp Action Section ---
export const COMMAND_TREE_LIGHT_CAMP_BUTTONS = WORLD_BUTTONS.filter(button =>
    /^(?:light|snuff|fill|cover|uncover)\s+%n$/i.test(button.command.trim())
);

export const hasWornLantern = (equipment: DrawerLine[]): boolean => equipment.some(line =>
    line.isItem && !line.isHeader && /\blantern\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`)
);
