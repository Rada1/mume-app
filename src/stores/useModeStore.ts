import { create } from 'zustand';
import { SessionMode } from '../types';
import { useMessageStore } from './useMessageStore';

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
    setSpectateTarget: (target: string | null) => void;
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
    setSpectateTarget: (target) => set({ spectateTarget: target }),
    startSpectate: (target) => set({ isSpectating: true, spectateTarget: target, lastSnoopStartTime: Date.now(), activeView: 'target' }),
    stopSpectate: () => {
        // Clear the snoop buffer too, or the LiveBufferHUD (DVR) resurfaces from
        // stale snoop messages even though we're no longer spectating.
        useMessageStore.getState().clearSpectateMessages();
        set({ isSpectating: false, spectateTarget: null, spectateQueue: [], lastSnoopStartTime: null, activeView: 'self' });
    },
    setActiveCharacter: (name) => set({ activeCharacter: name }),
    setSpectateQueue: (update) => set((state) => ({ 
        spectateQueue: typeof update === 'function' ? update(state.spectateQueue) : update 
    })),
    setLastSnoopStartTime: (time) => set({ lastSnoopStartTime: time }),
    setActiveView: (view) => set({ activeView: view }),
}));

export const getMode = () => useModeStore.getState();
