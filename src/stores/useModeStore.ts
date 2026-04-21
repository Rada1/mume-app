import { create } from 'zustand';
import { SessionMode } from '../types';

interface ModeState {
    mode: SessionMode;
    isSpectating: boolean;
    spectateTarget: string | null;
    activeCharacter: string | null;
    spectateQueue: string[];
    lastSnoopStartTime: number | null;

    setMode: (mode: SessionMode) => void;
    startSpectate: (target: string) => void;
    stopSpectate: () => void;
    setActiveCharacter: (name: string | null) => void;
    setSpectateQueue: (queue: string[] | ((prev: string[]) => string[])) => void;
    setLastSnoopStartTime: (time: number | null) => void;
}

export const useModeStore = create<ModeState>((set) => ({
    mode: 'live',
    isSpectating: false,
    spectateTarget: null,
    activeCharacter: null,
    spectateQueue: [],
    lastSnoopStartTime: null,

    setMode: (mode) => set({ mode }),
    startSpectate: (target) => set({ isSpectating: true, spectateTarget: target }),
    stopSpectate: () => set({ isSpectating: false, spectateTarget: null, spectateQueue: [], lastSnoopStartTime: null }),
    setActiveCharacter: (name) => set({ activeCharacter: name }),
    setSpectateQueue: (update) => set((state) => ({ 
        spectateQueue: typeof update === 'function' ? update(state.spectateQueue) : update 
    })),
    setLastSnoopStartTime: (time) => set({ lastSnoopStartTime: time }),
}));

export const getMode = () => useModeStore.getState();