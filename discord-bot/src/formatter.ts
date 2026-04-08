/**
 * @file formatter.ts
 * @description Logic for formatting MUD text for Discord.
 */

export const wrapInAnsi = (text: string): string => {
  if (!text) return '';
  return `\`\`\`ansi\n${text}\n\`\`\``;
};

/**
 * Escapes characters that might break Discord formatting,
 * though within a code block this is less of an issue.
 */
export const escapeDiscordChars = (text: string): string => {
  return text.replace(/([*_`~|])/g, '\\$1');
};

/**
 * Truncates text to fit within Discord's 2000 character limit,
 * leaving room for the code block wrappers.
 */
export const truncateForDiscord = (text: string, maxLength: number = 1900): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '\n... [truncated]';
};
