/** @file useCorpseContentsStore.ts — Captured examine contents for corpses and mount cargo. */
import { create } from 'zustand';
import type { DrawerLine } from '../types';

interface PendingCorpseExamine {
    containerId: string;
    target: string;
}

interface CorpseContentsState {
    contents: Record<string, DrawerLine[]>;
    containerTargets: Record<string, string>;
    pending: PendingCorpseExamine | null;
    pendingRequests: PendingCorpseExamine[];
    requestContents: (containerId: string, target: string) => void;
    invalidateContents: (containerId: string) => void;
    updateContents: (containerId: string, update: (lines: DrawerLine[]) => DrawerLine[]) => void;
    captureContents: (command: string, lines: DrawerLine[]) => void;
    clearContents: () => void;
}

const normalizeTarget = (target: string): string => target.trim().toLowerCase().replace(/\s+/g, ' ');

// --- Logic Section ---
export const useCorpseContentsStore = create<CorpseContentsState>((set) => ({
    contents: {},
    containerTargets: {},
    pending: null,
    pendingRequests: [],
    requestContents: (containerId, target) => set(state => ({
        pending: { containerId, target },
        containerTargets: { ...state.containerTargets, [containerId]: target },
        pendingRequests: [...state.pendingRequests.filter(request => request.containerId !== containerId), { containerId, target }],
        contents: Object.fromEntries(Object.entries(state.contents).filter(([id]) => id !== containerId))
    })),
    invalidateContents: containerId => set(state => ({
        contents: Object.fromEntries(Object.entries(state.contents).filter(([id]) => id !== containerId))
    })),
    updateContents: (containerId, update) => set(state => ({
        contents: {
            ...state.contents,
            [containerId]: update(state.contents[containerId] || [])
        }
    })),
    captureContents: (command, lines) => set(state => {
        const target = command.trim().match(/^examine\s+(.+)$/i)?.[1];
        if (!target) return state;
        const matching = state.pendingRequests.filter(request => normalizeTarget(target) === normalizeTarget(request.target));
        if (!matching.length) return state;
        const remaining = state.pendingRequests.filter(request => !matching.includes(request));
        return {
            pending: remaining.at(-1) || null,
            pendingRequests: remaining,
            contents: { ...state.contents, ...Object.fromEntries(matching.map(request => [request.containerId, lines])) }
        };
    }),
    clearContents: () => set({ contents: {}, containerTargets: {}, pending: null, pendingRequests: [] })
}));
