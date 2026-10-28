/** @file useTacticalCommandPrefixStore.ts — Pending command prefixes for tactical controls. */

import { create } from 'zustand';
import type { CustomButton } from '../types';

// --- Types ---
export const FOLLOWERS_COMMAND_PREFIX = 'order followers';
export const isFollowersCommandAction = (button: Pick<CustomButton, 'command' | 'actionType'>) =>
    !['nav', 'menu'].includes(button.actionType || '') && /^(?:command|order followers)$/i.test(button.command.trim());

export const formatCommandPrefixPreview = (prefix: string | null, preview?: string | null) => {
    const text = preview?.trim() === 'command' ? FOLLOWERS_COMMAND_PREFIX : preview;
    if (!prefix) return text;
    return text?.startsWith(prefix) ? text : [prefix, text].filter(Boolean).join(' ');
};

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
