/**
 * @file useVitalsStore.ts
 * @description Main store for player vitals. Gated to ignore updates during spectate sessions.
 */

import { create } from 'zustand';
import { useModeStore } from './useModeStore';
import { gmcpBus } from '../events/gmcpBus';
import { 
    VitalsState, 
    initialVitalsState, 
    createVitalsActions 
} from './slices/vitalsSlice';

export const useVitalsStore = create<VitalsState>((set, get) => ({
    ...initialVitalsState,
    ...createVitalsActions(set, get)
}));

export const getVitals = () => useVitalsStore.getState();

// --- Event Subscriptions ---

gmcpBus.on('Char.Vitals', (data) => {
    // GATE: Only update if NOT spectating
    if (useModeStore.getState().isSpectating) return;
    useVitalsStore.getState().applyCharVitals(data);
});

gmcpBus.on('Char.Info', (data) => {
    // GATE: Only update if NOT spectating
    if (useModeStore.getState().isSpectating) return;
    useVitalsStore.getState().applyCharInfo(data);
});