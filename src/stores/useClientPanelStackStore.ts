/** @file useClientPanelStackStore.ts — Saved ordering and height shares for client panels. */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientPanelStackId, ClientPanelStackWeights, ClientPanelStackHeights } from '../types/clientPanelStack';

// --- Logic Section ---
type ClientPanelStackState = {
    order: ClientPanelStackId[];
    weights: ClientPanelStackWeights;
    singleHeights: ClientPanelStackHeights;
    mobileDetailsHeight: number;
    detailsOpen: boolean;
    detailsEnabled: boolean;
    setDetailsEnabled: (enabled: boolean) => void;
    toggleDetailsEnabled: () => void;
    setDetailsOpen: (open: boolean) => void;
    resizePair: (first: ClientPanelStackId, second: ClientPanelStackId, firstWeight: number, secondWeight: number) => void;
    setSingleHeight: (panel: ClientPanelStackId, ratio: number) => void;
    setMobileDetailsHeight: (ratio: number) => void;
    movePanel: (panel: ClientPanelStackId, target: ClientPanelStackId, before: boolean) => void;
};

// --- Store Section ---
export const useClientPanelStackStore = create<ClientPanelStackState>()(persist<
    ClientPanelStackState,
    [],
    [],
    Pick<ClientPanelStackState, 'order' | 'weights' | 'singleHeights' | 'mobileDetailsHeight' | 'detailsEnabled'>
>((set) => ({
    order: ['entities', 'chat', 'actions', 'details', 'help'],
    weights: { entities: 1.2, chat: 1.15, actions: 1.45, details: 1.45, help: 1.4 },
    singleHeights: { entities: 1, chat: 1, actions: 1, details: 1, help: 1 },
    mobileDetailsHeight: 0.2,
    detailsOpen: false,
    detailsEnabled: true,
    setDetailsEnabled: detailsEnabled => set(state => ({
        detailsEnabled,
        detailsOpen: detailsEnabled ? state.detailsOpen : false
    })),
    toggleDetailsEnabled: () => set(state => {
        const detailsEnabled = !state.detailsEnabled;
        return { detailsEnabled, detailsOpen: detailsEnabled ? state.detailsOpen : false };
    }),
    setDetailsOpen: detailsOpen => set(state => ({ detailsOpen: state.detailsEnabled && detailsOpen })),
    resizePair: (first, second, firstWeight, secondWeight) => set(state => ({
        weights: { ...state.weights, [first]: firstWeight, [second]: secondWeight }
    })),
    setSingleHeight: (panel, ratio) => set(state => ({
        singleHeights: { ...state.singleHeights, [panel]: Math.max(0.15, Math.min(1, ratio)) }
    })),
    setMobileDetailsHeight: ratio => set({ mobileDetailsHeight: Math.max(0.08, Math.min(1, ratio)) }),
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
            weights: { ...current.weights, ...saved.weights },
            singleHeights: { ...current.singleHeights, ...saved.singleHeights }
        };
    },
    partialize: state => ({ order: state.order, weights: state.weights, singleHeights: state.singleHeights, mobileDetailsHeight: state.mobileDetailsHeight, detailsEnabled: state.detailsEnabled })
}));
