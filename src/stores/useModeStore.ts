import { create } from 'zustand';

export type SessionMode = 'live' | 'replay';

interface ModeState {
    mode: SessionMode;
    isSpectating: boolean;
    spectateTarget: string | null;
    activeCharacter: string | null;

    setMode: (mode: SessionMode) => void;
    startSpectate: (target: string) => void;
    stopSpectate: () => void;
    setActiveCharacter: (name: string | null) => void;
}

export const useModeStore = create<ModeState>((set) => ({
    mode: 'live',
    isSpectating: false,
    spectateTarget: null,
    activeCharacter: null,

    setMode: (mode) => set({ mode }),
    startSpectate: (target) => set({ isSpectating: true, spectateTarget: target }),
    stopSpectate: () => set({ isSpectating: false, spectateTarget: null }),
    setActiveCharacter: (name) => set({ activeCharacter: name }),
}));

export const getMode = () => useModeStore.getState();