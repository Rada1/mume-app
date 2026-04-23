import { create } from 'zustand';
import { SessionMode } from '../types';

interface ModeState {
    mode: SessionMode;
    isSpectating: boolean;
    spectateTarget: string | null;
    activeCharacter: string | null;
    spectateQueue: string[];
    lastSnoopStartTime: number | null;
    activeView: 'self' | 'target';

    setMode: (mode: SessionMode) => void;
    setIsSpectating: (val: boolean) => void;
    startSpectate: (target: string) => void;
    stopSpectate: () => void;
    setActiveCharacter: (name: string | null) => void;
    setSpectateQueue: (queue: string[] | ((prev: string[]) => string[])) => void;
    setLastSnoopStartTime: (time: number | null) => void;
    setActiveView: (view: 'self' | 'target') => void;
}

export const useModeStore = create<ModeState>((set) => ({
    mode: 'live',
    isSpectating: false,
    spectateTarget: null,
    activeCharacter: null,
    spectateQueue: [],
    lastSnoopStartTime: null,
    activeView: 'self',

    setMode: (mode) => set({ mode }),
    setIsSpectating: (val) => set({ isSpectating: val }),
    startSpectate: (target) => set({ isSpectating: true, spectateTarget: target, activeView: 'target' }),
    stopSpectate: () => set({ isSpectating: false, spectateTarget: null, spectateQueue: [], lastSnoopStartTime: null, activeView: 'self' }),
    setActiveCharacter: (name) => set({ activeCharacter: name }),
    setSpectateQueue: (update) => set((state) => ({ 
        spectateQueue: typeof update === 'function' ? update(state.spectateQueue) : update 
    })),
    setLastSnoopStartTime: (time) => set({ lastSnoopStartTime: time }),
    setActiveView: (view) => set({ activeView: view }),
}));

export const getMode = () => useModeStore.getState();