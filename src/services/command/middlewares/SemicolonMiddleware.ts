/**
 * @file SemicolonMiddleware.ts
 * @description Splits semicolon-separated commands.
 */

import { CommandMiddleware } from '../types';

export const SemicolonMiddleware: CommandMiddleware = (cmd) => {
    const commands = cmd.split(';').map(c => c.trim()).filter(c => c.length > 0);
    if (commands.length > 1) {
        return commands;
    }
    return undefined; // No change
};
