/** @file useTacticalCommandPrefixStore.ts — Pending command prefixes for tactical controls. */

import { create } from 'zustand';

// --- Types ---
export const FOLLOWERS_COMMAND_PREFIX = 'order followers';

interface TacticalCommandPrefixState {
    prefix: string | null;
    armFollowers: () => void;
    clearPrefix: () => void;
}

// --- State ---
export const useTacticalCommandPrefixStore = create<TacticalCommandPrefixState>(set => ({
    prefix: null,
    armFollowers: () => set({ prefix: FOLLOWERS_COMMAND_PREFIX }),
    clearPrefix: () => set({ prefix: null })
}));

// --- Logic ---
export const applyTacticalCommandPrefix = (command: string): string => {
    const cleanCommand = command.trim();
    if (!cleanCommand) return command;

    const { prefix, clearPrefix } = useTacticalCommandPrefixStore.getState();
    if (!prefix) return command;

    clearPrefix();
    return `${prefix} ${cleanCommand}`;
};
