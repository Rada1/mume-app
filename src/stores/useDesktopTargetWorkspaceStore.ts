/** @file useDesktopTargetWorkspaceStore.ts — Lifetime of the persistent desktop target workspace. */
import { create } from 'zustand';
import type { PopoverState } from '../types';

// --- Workspace Lifetime ---
export const useDesktopTargetWorkspaceStore = create<{
 request: PopoverState | null;
 open: (request: PopoverState) => void;
 close: () => void;
}>(set => ({
 request: null,
 open: request => set({request}),
 close: () => set({request: null})
}));
