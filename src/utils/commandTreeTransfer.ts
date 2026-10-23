/** @file commandTreeTransfer.ts — Identifies the staged Give and Put commands in the V2 tree. */
import type { CustomButton } from '../types';
// --- Command Identity Section ---
export const isCommandTreeTransfer = (button: CustomButton | null) => Boolean(button && /^(?:give|put)\s+%n$/i.test(button.command.trim()));
