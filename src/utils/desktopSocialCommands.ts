/** @file desktopSocialCommands.ts — Social actions available as desktop click defaults. */
import { COMMAND_TREE_SOCIAL_THEMES, MOBILE_SOCIAL_SHORTCUTS, createSocialEmoteButton } from './commandTreeSocial';

// --- Preserve shortcut variants and include every themed social ---
const commands = new Map(MOBILE_SOCIAL_SHORTCUTS.map(button => [button.command, button]));
for (const theme of COMMAND_TREE_SOCIAL_THEMES) for (const entry of theme.socials) {
 if (!entry.targetOptions && !commands.has(entry.command)) commands.set(entry.command, createSocialEmoteButton(entry, false));
}
export const DESKTOP_SOCIAL_COMMANDS = [...commands.values()];
