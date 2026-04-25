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
    if (!data.isSnooped) return;
    useSpectateVitalsStore.getState().applyCharVitals(data);
});

gmcpBus.on('Char.Name', (data) => {
    if (!data.isSnooped) return;
    const name = data.data || null;
    if (name) {
        useSpectateVitalsStore.getState().setCharacterName(name);
    }
});

gmcpBus.on('Char.Info', (data) => {
    if (!data.isSnooped) return;
    useSpectateVitalsStore.getState().applyCharInfo(data);
});
