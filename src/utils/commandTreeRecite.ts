/** @file commandTreeRecite.ts — Identify Recite actions that use a scroll and a room target. */
import type { CustomButton } from '../types';

// --- Recite Workflow Section ---
export const isCommandTreeReciteAction = (button: CustomButton): boolean =>
    /^recite\s+%n(?:\||\s|$)/i.test(button.command.trim());
