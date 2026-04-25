import { create } from 'zustand';
import { GmcpCharVitals, CombatHealthStatus, WeatherType, GmcpCharInfo } from '../types';
import { gmcpBus } from '../events/gmcpBus';
import { useModeStore } from './useModeStore';
import { VitalsState, initialVitalsState, createVitalsActions } from './slices/vitalsSlice';

export type VitalsStore = VitalsState;

export const useVitalsStore = create<VitalsStore>((set, get) => ({
    ...initialVitalsState,
    ...createVitalsActions(set, get),
    // Extra actions that might not be in slice but used by main store
    setTarget: (target: string | null) => set({ target } as any),
    setActivePrompt: (activePrompt: any) => set({ activePrompt } as any),
    setStats: (statsUpdate: any) => {
        set((state: any) => {
            const next = typeof statsUpdate === 'function' ? statsUpdate(state) : statsUpdate;
            if (typeof next !== 'object' || next === null) return state;
            return { ...state, ...next };
        });
    },
}));

export const getVitals = () => useVitalsStore.getState();

gmcpBus.on('Char.Vitals', (data) => {
    if (data.isSnooped) return;
    getVitals().applyCharVitals(data);
});

gmcpBus.on('Char.Info', (data) => {
    if (data.isSnooped) return;
    getVitals().applyCharInfo(data);
});
