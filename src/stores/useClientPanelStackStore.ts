/** @file useClientPanelStackStore.ts — Saved ordering and height shares for client panels. */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientPanelStackId, ClientPanelStackWeights } from '../types/clientPanelStack';

// --- Logic Section ---
type ClientPanelStackState = {
    order: ClientPanelStackId[];
    weights: ClientPanelStackWeights;
    detailsOpen: boolean;
    detailsEnabled: boolean;
    setDetailsEnabled: (enabled: boolean) => void;
    setDetailsOpen: (open: boolean) => void;
    resizePair: (first: ClientPanelStackId, second: ClientPanelStackId, firstWeight: number, secondWeight: number) => void;
    movePanel: (panel: ClientPanelStackId, target: ClientPanelStackId, before: boolean) => void;
};

// --- Store Section ---
export const useClientPanelStackStore = create<ClientPanelStackState>()(persist<
    ClientPanelStackState,
    [],
    [],
    Pick<ClientPanelStackState, 'order' | 'weights' | 'detailsEnabled'>
>((set) => ({
    order: ['entities', 'chat', 'details', 'help'],
    weights: { entities: 1.2, chat: 1.15, details: 1.45, help: 1.4 },
    detailsOpen: false,
    detailsEnabled: true,
    setDetailsEnabled: detailsEnabled => set({ detailsEnabled }),
    setDetailsOpen: detailsOpen => set({ detailsOpen }),
    resizePair: (first, second, firstWeight, secondWeight) => set(state => ({
        weights: { ...state.weights, [first]: firstWeight, [second]: secondWeight }
    })),
    movePanel: (panel, target, before) => set(state => {
        const remaining = state.order.filter(item => item !== panel);
        const targetIndex = remaining.indexOf(target);
        if (targetIndex < 0) return state;
        remaining.splice(targetIndex + (before ? 0 : 1), 0, panel);
        return { order: remaining };
    })
}), {
    name: 'mume-client-panel-stack',
    version: 1,
    merge: (persisted, current) => {
        const saved = persisted as Partial<ClientPanelStackState>;
        const savedOrder = saved.order?.filter(panel => current.order.includes(panel)) ?? [];
        return { ...current, ...saved,
            order: [...new Set([...savedOrder, ...current.order])],
            weights: { ...current.weights, ...saved.weights }
        };
    },
    partialize: state => ({ order: state.order, weights: state.weights, detailsEnabled: state.detailsEnabled })
}));
