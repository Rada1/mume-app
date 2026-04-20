import { create } from 'zustand';

interface AudioState {
    isSuppressed: boolean;
    isSilentReplay: boolean;
    replaySpeed: number;
    currentZone: string | null;
    isSoundEnabled: boolean;

    setIsSuppressed: (isSuppressed: boolean) => void;
    setIsSilentReplay: (isSilentReplay: boolean) => void;
    setReplaySpeed: (speed: number) => void;
    setCurrentZone: (zone: string | null) => void;
    setIsSoundEnabled: (enabled: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
    isSuppressed: false,
    isSilentReplay: false,
    replaySpeed: 1,
    currentZone: null,
    isSoundEnabled: true,

    setIsSuppressed: (isSuppressed) => set({ isSuppressed }),
    setIsSilentReplay: (isSilentReplay) => set({ isSilentReplay }),
    setReplaySpeed: (replaySpeed) => set({ replaySpeed }),
    setCurrentZone: (currentZone) => set({ currentZone }),
    setIsSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
}));

export const getAudio = () => useAudioStore.getState();