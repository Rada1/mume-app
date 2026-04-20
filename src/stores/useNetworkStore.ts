import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface NetworkState {
    status: ConnectionStatus;
    connectionUrl: string | null;
    lastError: string | null;
    isBackgrounded: boolean;

    setStatus: (status: ConnectionStatus) => void;
    setConnectionUrl: (url: string | null) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    setBackgrounded: (isBackgrounded: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
    status: 'disconnected',
    connectionUrl: null,
    lastError: null,
    isBackgrounded: false,

    setStatus: (status) => set({ status }),
    setConnectionUrl: (connectionUrl) => set({ connectionUrl }),
    setError: (lastError) => set({ lastError }),
    clearError: () => set({ lastError: null }),
    setBackgrounded: (isBackgrounded) => set({ isBackgrounded }),
}));

export const getNetwork = () => useNetworkStore.getState();