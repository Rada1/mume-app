/**
 * @file CommandRegistry.ts
 * @description Core logic for managing and executing the command middleware pipeline.
 */

import { CommandMiddleware, CommandContext } from './types';

export class CommandRegistry {
    private middlewares: CommandMiddleware[] = [];

    /**
     * Registers a new middleware in the pipeline.
     */
    public use(middleware: CommandMiddleware) {
        this.middlewares.push(middleware);
    }

    /**
     * Executes the command through all registered middlewares.
     * Returns the final transformed command, an array of commands, or null to cancel.
     */
    public execute(
        cmd: string, 
        context: CommandContext, 
        options: { silent: boolean, isSystem: boolean, fromDrawer: boolean }
    ): string | string[] | null {
        let currentCmd: string | string[] | null = cmd;

        for (const middleware of this.middlewares) {
            // If the command was cancelled, stop the pipeline
            if (currentCmd === null) return null;

            // If it's already an array, we stop processing or process each (simpler to stop for now)
            if (Array.isArray(currentCmd)) return currentCmd;

            const result = middleware(currentCmd, context, options);

            // If the middleware returned undefined, it means it didn't modify the command
            if (result !== undefined) {
                currentCmd = result;
            }
        }

        return currentCmd;
    }
}
