import { create } from 'zustand';

interface AtmosphereStore {
    commandPulseKey: number;
    notifyCommandPulse: () => void;
}

export const useAtmosphereStore = create<AtmosphereStore>((set) => ({
    commandPulseKey: 0,
    notifyCommandPulse: () => set((s) => ({ commandPulseKey: s.commandPulseKey + 1 })),
}));
