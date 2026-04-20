/**
 * @file useSpectateVitalsStore.ts
 * @description Store for spectated character vitals. Gated to ONLY update during spectate sessions.
 */

import { create } from 'zustand';
import { useModeStore } from '../useModeStore';
import { gmcpBus } from '../../events/gmcpBus';
import { 
    VitalsState, 
    initialVitalsState, 
    createVitalsActions 
} from '../slices/vitalsSlice';

export const useSpectateVitalsStore = create<VitalsState>((set, get) => ({
    ...initialVitalsState,
    ...createVitalsActions(set, get)
}));

export const getSpectateVitals = () => useSpectateVitalsStore.getState();

// --- Event Subscriptions ---

gmcpBus.on('Char.Vitals', (data) => {
    // GATE: Only update if IS spectating
    if (!useModeStore.getState().isSpectating) return;
    useSpectateVitalsStore.getState().applyCharVitals(data);
});

gmcpBus.on('Char.Info', (data) => {
    // GATE: Only update if IS spectating
    if (!useModeStore.getState().isSpectating) return;
    useSpectateVitalsStore.getState().applyCharInfo(data);
});
