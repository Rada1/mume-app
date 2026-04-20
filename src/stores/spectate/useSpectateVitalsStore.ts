import { create } from 'zustand';
import { useModeStore } from '../useModeStore';
import { gmcpBus } from '../../events/gmcpBus';
import { 
    VitalsState, 
    initialVitalsState, 
    createVitalsActions 
} from '../slices/vitalsSlice';

export type VitalsStore = VitalsState;

export const useSpectateVitalsStore = create<VitalsStore>((set, get) => ({
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
