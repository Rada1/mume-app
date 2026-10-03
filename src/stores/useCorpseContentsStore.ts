/** @file useCorpseContentsStore.ts — Captured contents for the currently examined corpse. */
import { create } from 'zustand';
import type { DrawerLine } from '../types';

interface PendingCorpseExamine {
    containerId: string;
    target: string;
}

interface CorpseContentsState {
    contents: Record<string, DrawerLine[]>;
    pending: PendingCorpseExamine | null;
    requestContents: (containerId: string, target: string) => void;
    captureContents: (command: string, lines: DrawerLine[]) => void;
    clearContents: () => void;
}

const normalizeTarget = (target: string): string => target.trim().toLowerCase().replace(/\s+/g, ' ');

// --- Logic Section ---
export const useCorpseContentsStore = create<CorpseContentsState>((set) => ({
    contents: {},
    pending: null,
    requestContents: (containerId, target) => set(state => ({
        pending: { containerId, target },
        contents: Object.fromEntries(Object.entries(state.contents).filter(([id]) => id !== containerId))
    })),
    captureContents: (command, lines) => set(state => {
        const target = command.trim().match(/^examine\s+(.+)$/i)?.[1];
        if (!target || !state.pending || normalizeTarget(target) !== normalizeTarget(state.pending.target)) return state;
        return {
            pending: null,
            contents: { ...state.contents, [state.pending.containerId]: lines }
        };
    }),
    clearContents: () => set({ contents: {}, pending: null })
}));
