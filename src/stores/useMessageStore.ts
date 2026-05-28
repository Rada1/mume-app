import { create } from 'zustand';
import { Message } from '../types';

interface MessageStore {
    user: Message[];
    spectate: Message[];
    setUserMessages: (fn: (prev: Message[]) => Message[]) => void;
    setSpectateMessages: (fn: (prev: Message[]) => Message[]) => void;
    clearUserMessages: () => void;
    clearSpectateMessages: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
    user: [],
    spectate: [],
    setUserMessages: (fn) => set(s => ({ user: fn(s.user) })),
    setSpectateMessages: (fn) => set(s => ({ spectate: fn(s.spectate) })),
    clearUserMessages: () => set({ user: [] }),
    clearSpectateMessages: () => set({ spectate: [] }),
}));
